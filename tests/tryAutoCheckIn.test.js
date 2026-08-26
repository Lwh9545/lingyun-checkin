/**
 * tryAutoCheckIn 特征测试（Characterization Test）
 *
 * 目的：固化 src/stores/attendance.js#tryAutoCheckIn 的当前行为（契约报告 I1–I10），
 *       作为原子重构的安全网。重构后输出必须与断言完全一致，否则=破坏性变更。
 *
 * 实现原则（来自 legacy-refactor-master 步骤 2）：
 *  - 禁用 UI 依赖：window.electronAPI 用内存桩
 *  - storageUtils 用内存 Map 桩，绕开 localStorage
 *  - handleCheck 走真实实现（不 mock 业务核心）
 *  - 仅控制守卫依赖：isWorkDay / isInCheckWindow
 *
 * 运行：npx vitest run tests/tryAutoCheckIn.test.js
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// ── 固定时间：周一 2026-06-08 08:55（打卡窗口内） ──
vi.useFakeTimers()
vi.setSystemTime(new Date(2026, 5, 8, 8, 55, 0))

// ── 内存存储桩（vitest 工厂只能引用 mock* 前缀变量） ──
const mockStore = new Map()
vi.mock('../src/utils/storageUtils', () => ({
  getStorage: async (key, def) => (mockStore.has(key) ? JSON.parse(JSON.stringify(mockStore.get(key))) : def),
  setStorage: async (key, value) => { mockStore.set(key, JSON.parse(JSON.stringify(value))) },
  getAttendanceRecords: async () => (mockStore.has('attendance_records') ? JSON.parse(JSON.stringify(mockStore.get('attendance_records'))) : []),
  saveAttendanceRecords: async (records) => { mockStore.set('attendance_records', JSON.parse(JSON.stringify(records))) },
  overwriteAttendanceRecords: async (records) => { mockStore.set('attendance_records', JSON.parse(JSON.stringify(records))) }
}))

// ── 日期桩：真实实现 + 固定 today/time ──
vi.mock('../src/utils/dateUtils', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getTodayString: () => '2026-06-08',
    formatTimeShort: () => '08:55'
  }
})

// ── attendanceUtils：真实实现，仅 isWorkDay / isInCheckWindow 可控制 ──
vi.mock('../src/utils/attendanceUtils', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    isWorkDay: vi.fn(() => true),
    isInCheckWindow: vi.fn(() => true)
  }
})

import { useAttendanceStore } from '../src/stores/attendance.js'
import * as attendanceUtils from '../src/utils/attendanceUtils'
import { STORAGE_KEYS } from '../src/utils/constants.js'

const TODAY = '2026-06-08'

function seedRecords(records) {
  mockStore.set('attendance_records', JSON.parse(JSON.stringify(records)))
}

beforeEach(() => {
  mockStore.clear()
  setActivePinia(createPinia())
  vi.mocked(attendanceUtils.isWorkDay).mockReturnValue(true)
  vi.mocked(attendanceUtils.isInCheckWindow).mockReturnValue(true)
  globalThis.window = {} // 无 electronAPI（通知存在性守卫）
})

describe('tryAutoCheckIn 特征测试（I1–I10 固化）', () => {
  it('I1 关闭自动打卡 → false，零副作用', async () => {
    const store = useAttendanceStore()
    store.autoCheckIn = false
    const result = await store.tryAutoCheckIn()
    expect(result).toBe(false)
    expect(mockStore.has(STORAGE_KEYS.LAST_CHECK_IN_DATE)).toBe(false)
    expect(mockStore.has('attendance_records')).toBe(false)
  })

  it('I2 非工作日 → false，不打卡', async () => {
    vi.mocked(attendanceUtils.isWorkDay).mockReturnValue(false)
    const store = useAttendanceStore()
    store.autoCheckIn = true
    const result = await store.tryAutoCheckIn()
    expect(result).toBe(false)
    expect(mockStore.has('attendance_records')).toBe(false)
  })

  it('I3 今日已执行过（LAST_CHECK_IN_DATE===today）→ false，不重复', async () => {
    mockStore.set(STORAGE_KEYS.LAST_CHECK_IN_DATE, TODAY)
    const store = useAttendanceStore()
    store.autoCheckIn = true
    const result = await store.tryAutoCheckIn()
    expect(result).toBe(false)
    expect(mockStore.has('attendance_records')).toBe(false)
  })

  it('I4 今日已有 checkIn → false，不重复打卡', async () => {
    seedRecords([{ date: TODAY, checkIn: '08:30', checkOut: '', status: 'normal' }])
    const store = useAttendanceStore()
    store.autoCheckIn = true
    // 让 store 内存 records 加载今日记录
    await store.loadRecords()
    const result = await store.tryAutoCheckIn()
    expect(result).toBe(false)
    expect(mockStore.get('attendance_records')[0].checkIn).toBe('08:30') // 不被覆盖
  })

  it('I5 不在打卡窗口 → false，不打卡', async () => {
    vi.mocked(attendanceUtils.isInCheckWindow).mockReturnValue(false)
    const store = useAttendanceStore()
    store.autoCheckIn = true
    const result = await store.tryAutoCheckIn()
    expect(result).toBe(false)
    expect(mockStore.has('attendance_records')).toBe(false)
  })

  it('I6 成功路径 → true；写入打卡记录 + LAST_CHECK_IN_DATE；发通知', async () => {
    globalThis.window = { electronAPI: { notification: { send: vi.fn(async () => {}) } } }
    const store = useAttendanceStore()
    store.autoCheckIn = true
    const result = await store.tryAutoCheckIn()
    expect(result).toBe(true)
    // 打卡记录写入
    const records = mockStore.get('attendance_records')
    expect(records).toHaveLength(1)
    expect(records[0].date).toBe(TODAY)
    expect(records[0].checkIn).toBe('08:55')
    // 执行标记写入
    expect(mockStore.get(STORAGE_KEYS.LAST_CHECK_IN_DATE)).toBe(TODAY)
    // 通知发送
    expect(window.electronAPI.notification.send).toHaveBeenCalledTimes(1)
  })

  it('I7 silent=true → true 但不发通知', async () => {
    globalThis.window = { electronAPI: { notification: { send: vi.fn(async () => {}) } } }
    const store = useAttendanceStore()
    store.autoCheckIn = true
    const result = await store.tryAutoCheckIn(true)
    expect(result).toBe(true)
    expect(window.electronAPI.notification.send).not.toHaveBeenCalled()
  })

  it('I8 无 electronAPI → true 但静默（不抛错）', async () => {
    const store = useAttendanceStore()
    store.autoCheckIn = true
    const result = await store.tryAutoCheckIn()
    expect(result).toBe(true)
    expect(mockStore.get(STORAGE_KEYS.LAST_CHECK_IN_DATE)).toBe(TODAY)
  })

  it('I9 守卫抛异常 → false 且不抛出', async () => {
    vi.mocked(attendanceUtils.isInCheckWindow).mockImplementation(() => { throw new Error('storage boom') })
    const store = useAttendanceStore()
    store.autoCheckIn = true
    const result = await store.tryAutoCheckIn()
    expect(result).toBe(false)
  })

  it('I10 失败路径：窗口外 → false，不写执行标记', async () => {
    vi.mocked(attendanceUtils.isInCheckWindow).mockReturnValue(false)
    const store = useAttendanceStore()
    store.autoCheckIn = true
    await store.tryAutoCheckIn()
    expect(mockStore.has(STORAGE_KEYS.LAST_CHECK_IN_DATE)).toBe(false)
  })
})
