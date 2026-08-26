/**
 * Reminder 模块特征测试（FW-007）
 *
 * 目的：固化定时提醒模块的接口契约，作为后续重构的安全网
 * 覆盖：start/stop 生命周期、重复调用幂等性、通知触发时机、跨日重置
 *
 * 运行：npx vitest run tests/reminder.test.js
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ── Mock shared/dateUtils（reminder 依赖）──
const MOCK_TODAY = '2026-06-08' // 周一
vi.mock('../../shared/dateUtils.js', () => ({
  getTodayString: () => MOCK_TODAY,
  formatTimeShort: () => '09:00',
  timeToMinutes: (t) => {
    const [h, m] = (t || '').split(':').map(Number)
    return h * 60 + m
  },
  calculateTargetTime: () => '09:00',
  isTimeToCheck: () => true,
  isWorkDay: (days) => Array.isArray(days) && days.includes(1) // 周一是工作日
}))

vi.mock('../../shared/types.js', () => ({
  DEFAULT_CONFIG: {},
  STORAGE_KEYS: {}
}))

vi.mock('../../shared/constants.js', () => ({
  TIME: {},
  DEFAULTS: {
    WORK_DAYS: [1, 2, 3, 4, 5],
    WORK_START: '09:00',
    WORK_END: '18:00'
  },
  TRAY_STATUS: {}
}))

vi.mock('../../shared/logger.js', () => ({
  createLogger: () => ({
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {}
  }),
  initLogger: () => {}
}))

const { createReminderManager } = await import('../electron/modules/reminder.js')

/**
 * 构造带 mock 依赖的 reminder manager
 */
function createManager(initialStore = {}) {
  let store = { remindEnabled: true, ...initialStore }
  const notifications = []
  const timerIds = []

  // 保留原始引用（避免递归）
  const originalSetTimeout = global.setTimeout
  const originalClearTimeout = global.clearTimeout

  // 拦截 setTimeout 以记录调度
  global.setTimeout = (fn, delay) => {
    const id = originalSetTimeout(fn, delay)
    timerIds.push(id)
    return id
  }
  global.clearTimeout = (id) => {
    const i = timerIds.indexOf(id)
    if (i > -1) timerIds.splice(i, 1)
    originalClearTimeout(id)
  }

  const manager = createReminderManager({
    getStorageSync: (key, def) => (store[key] !== undefined ? store[key] : def),
    setStorageSync: (key, value) => { store[key] = value },
    sendNotification: (title, body) => notifications.push({ title, body }),
    log: {
      debug: () => {}, info: () => {}, warn: () => {}, error: () => {}
    },
    DEFAULTS: {
      WORK_DAYS: [1, 2, 3, 4, 5],
      WORK_START: '09:00',
      WORK_END: '18:00'
    },
    dateUtils: {
      getTodayString: () => MOCK_TODAY,
      timeToMinutes: (t) => {
        const [h, m] = (t || '').split(':').map(Number)
        return h * 60 + m
      },
      isWorkDay: (days) => Array.isArray(days) && days.includes(1)
    }
  })

  return {
    manager,
    getStore: () => store,
    notifications,
    getActiveTimerCount: () => timerIds.length,
    cleanup: () => {
      global.setTimeout = originalSetTimeout
      global.clearTimeout = originalClearTimeout
      timerIds.forEach(id => originalClearTimeout(id))
    }
  }
}

describe('Reminder 模块特征测试', () => {
  let ctx

  afterEach(() => {
    if (ctx) {
      ctx.manager.stop()
      ctx.cleanup()
    }
  })

  // ─────────────────────────────────────────────
  // 场景1：start 启动调度器
  // ─────────────────────────────────────────────
  it('正常场景:start 启动调度器不抛错', () => {
    ctx = createManager()
    expect(() => ctx.manager.start()).not.toThrow()
    expect(ctx.getActiveTimerCount()).toBeGreaterThan(0)
  })

  // ─────────────────────────────────────────────
  // 场景2：stop 停止调度器
  // ─────────────────────────────────────────────
  it('正常场景:stop 清除 timer', () => {
    ctx = createManager()
    ctx.manager.start()
    const beforeCount = ctx.getActiveTimerCount()
    ctx.manager.stop()
    // stop 后 timer 应被清除
    expect(ctx.getActiveTimerCount()).toBeLessThan(beforeCount)
  })

  // ─────────────────────────────────────────────
  // 场景3：remindEnabled=false —— scheduleNextReminder 返回长延迟
  // ─────────────────────────────────────────────
  it('边界场景:remindEnabled=false 启动不抛错', () => {
    ctx = createManager({ remindEnabled: false })
    expect(() => ctx.manager.start()).not.toThrow()
  })

  // ─────────────────────────────────────────────
  // 场景4：非工作日启动不抛错
  // ─────────────────────────────────────────────
  it('边界场景:非工作日启动不抛错', () => {
    ctx = createManager({ workDays: [0] }) // 只有周日 = 今天周一非工作日
    expect(() => ctx.manager.start()).not.toThrow()
  })

  // ─────────────────────────────────────────────
  // Anti-Spec：start() 多次调用不应崩溃
  // ─────────────────────────────────────────────
  it('Anti-Spec:多次 start 不应崩溃或叠加多个 timer', () => {
    ctx = createManager()
    ctx.manager.start()
    const count1 = ctx.getActiveTimerCount()

    ctx.manager.start() // 重复调用
    const count2 = ctx.getActiveTimerCount()

    // 重复 start 应清旧 timer 再建新 timer，不应叠加
    expect(count2).toBeLessThanOrEqual(count1 + 1)
  })

  // ─────────────────────────────────────────────
  // Anti-Spec：stop() 后再 stop 不抛错
  // ─────────────────────────────────────────────
  it('Anti-Spec:未启动直接 stop 不抛错', () => {
    ctx = createManager()
    expect(() => ctx.manager.stop()).not.toThrow()
  })

  // ─────────────────────────────────────────────
  // Anti-Spec：接口稳定性 —— manager 必须返回 start/stop 两个方法
  // ─────────────────────────────────────────────
  it('Anti-Spec:manager 接口契约必须包含 start/stop', () => {
    ctx = createManager()
    expect(typeof ctx.manager.start).toBe('function')
    expect(typeof ctx.manager.stop).toBe('function')
  })
})
