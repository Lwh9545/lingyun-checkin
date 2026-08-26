/**
 * directCheckOut 特征测试
 *
 * 目的:固化 directCheckOut 的行为,作为改造安全网。
 * 改造前:无 checkIn 时硬填默认值(造假) —— 断言记录为 normal
 * 改造后:无 checkIn 时保留空白 + 标记缺卡(诚实) —— 断言更新为 missing_check_in
 *
 * 运行:npx vitest run tests/directCheckOut.test.js
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// 固定到周一 2026-06-08 18:30
const FIXED_DATE = new Date(2026, 5, 8, 18, 30, 0)
vi.useFakeTimers()
vi.setSystemTime(FIXED_DATE)

// Mock shared 依赖(auto-check.js require 的)
vi.mock('../../shared/dateUtils.js', () => ({
  getTodayString: () => '2026-06-08',
  formatTimeShort: () => '18:30',
  calculateTargetTime: () => '09:00',
  isTimeToCheck: () => true,
  isWorkDay: () => true
}))
vi.mock('../../shared/types.js', () => ({
  DEFAULT_CONFIG: {
    workStartTime: '09:00',
    workEndTime: '18:00',
    workDays: [1, 2, 3, 4, 5]
  }
}))

const { createAutoCheckManager } = await import('../electron/modules/auto-check.js')

/**
 * 构造带 mock 依赖的 manager
 */
function createManager(initialRecords = []) {
  let store = { attendance_records: initialRecords, workStartTime: '09:00' }
  const notifications = []
  const logs = []

  const manager = createAutoCheckManager({
    getStorageSync: (key, def) => {
      const val = store[key]
      return val === undefined ? def : JSON.parse(JSON.stringify(val))
    },
    setStorageSync: async (key, value) => {
      store[key] = JSON.parse(JSON.stringify(value))
    },
    getMainWindow: () => null,
    sendNotification: (title, body) => notifications.push({ title, body }),
    log: {
      info: (...a) => logs.push(['info', ...a]),
      warn: (...a) => logs.push(['warn', ...a]),
      error: (...a) => logs.push(['error', ...a])
    }
  })

  return { manager, getStore: () => store, notifications, logs }
}

describe('directCheckOut 特征测试', () => {
  // ─────────────────────────────────────────────
  // 场景1:正常签退 —— 有 checkIn 无 checkOut
  // ─────────────────────────────────────────────
  it('正常场景:有签到记录,签退成功', async () => {
    const initial = [{ date: '2026-06-08', checkIn: '09:05', checkOut: '', status: 'normal' }]
    const { manager, getStore, notifications } = createManager(initial)

    // shutdownCheckOut 内部调 directCheckOut
    await manager.shutdownCheckOut()

    const records = getStore().attendance_records
    expect(records).toHaveLength(1)
    expect(records[0].checkOut).toBe('18:30')
    expect(records[0].checkIn).toBe('09:05') // 不变
    expect(records[0].status).toBe('normal')
    expect(notifications).toHaveLength(1)
    expect(notifications[0].title).toContain('签退')
  })

  // ─────────────────────────────────────────────
  // 场景2:临界 —— 今天有记录但没签到
  // 【改造前】硬填 checkIn=09:00,status=normal(造假)
  // 【改造后】checkIn=null,missing=check_in,status=missing_check_in(诚实)
  // ─────────────────────────────────────────────
  it('临界场景:有记录但没签到,记录为缺卡(诚实)', async () => {
    const initial = [{ date: '2026-06-08', checkIn: '', checkOut: '', status: 'normal' }]
    const { manager, getStore, notifications } = createManager(initial)

    await manager.shutdownCheckOut()

    const records = getStore().attendance_records
    expect(records).toHaveLength(1)
    expect(records[0].checkOut).toBe('18:30')
    // 改造后:不硬填,保留空白
    expect(records[0].checkIn).toBeNull()
    expect(records[0].missing).toBe('check_in')
    expect(records[0].status).toBe('missing_check_in')
    expect(records[0].source).toBe('system_detected')
    expect(notifications).toHaveLength(1)
    expect(notifications[0].body).toContain('缺')
  })

  // ─────────────────────────────────────────────
  // 场景3:异常 —— 今天完全没记录
  // 【改造前】硬造 checkIn=09:00 + checkOut=18:30 完美记录(造假)
  // 【改造后】checkIn=null + 标记缺卡(诚实)
  // ─────────────────────────────────────────────
  it('异常场景:今天完全没记录,诚实记录缺卡+签退', async () => {
    const initial = []
    const { manager, getStore, notifications } = createManager(initial)

    await manager.shutdownCheckOut()

    const records = getStore().attendance_records
    expect(records).toHaveLength(1)
    expect(records[0].date).toBe('2026-06-08')
    expect(records[0].checkOut).toBe('18:30')
    expect(records[0].checkIn).toBeNull()
    expect(records[0].missing).toBe('check_in')
    expect(records[0].status).toBe('missing_check_in')
    expect(records[0].source).toBe('system_detected')
    expect(notifications).toHaveLength(1)
    expect(notifications[0].body).toContain('缺')
  })

  // ─────────────────────────────────────────────
  // 场景4:已签退 —— 不重复签退
  // ─────────────────────────────────────────────
  it('已签退:跳过,不重复操作', async () => {
    const initial = [{ date: '2026-06-08', checkIn: '09:00', checkOut: '17:00', status: 'normal' }]
    const { manager, getStore, notifications } = createManager(initial)

    await manager.shutdownCheckOut()

    const records = getStore().attendance_records
    expect(records[0].checkOut).toBe('17:00') // 不变
    expect(notifications).toHaveLength(0)
  })

  // ─────────────────────────────────────────────
  // 反规格验证(Anti-Spec Test):绝不允许造假补全
  // ─────────────────────────────────────────────
  it('Anti-Spec:缺签到时绝不允许用默认值硬填 checkIn', async () => {
    const initial = []
    const { manager, getStore } = createManager(initial)

    await manager.shutdownCheckOut()

    const records = getStore().attendance_records
    // 铁律:checkIn 必须是 null,绝不能是 '09:00' 或任何默认值
    expect(records[0].checkIn).not.toBe('09:00')
    expect(records[0].checkIn).not.toBe('09:05')
    expect(records[0].checkIn).toBeNull()
    // status 绝不能谎报 normal
    expect(records[0].status).not.toBe('normal')
  })
})
