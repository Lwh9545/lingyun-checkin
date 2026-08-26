/**
 * Storage 模块特征测试（FW-007）
 *
 * 目的：固化主进程存储模块行为，作为后续重构的安全网
 * 覆盖：读写、缓存、attendance_records 自动 merge、加密状态、默认值、文件初始化
 *
 * 运行：npx vitest run tests/storage.test.js
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

// ── Mock electron（safeStorage 不可用 → 走 plain JSON 路径）──
vi.mock('electron', () => ({
  app: { getPath: () => '' },
  safeStorage: undefined
}))

// ── Mock shared/logger（避免文件 IO 副作用）──
vi.mock('../../shared/logger.js', () => ({
  createLogger: () => ({
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {}
  }),
  initLogger: () => {},
  LOG_LEVELS: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 }
}))

const { createStorage } = await import('../electron/modules/storage.js')

/**
 * 创建临时 userDataPath，返回 storage 实例 + 清理函数
 */
function createTempStorage() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'storage-test-'))
  const storage = createStorage(tmpDir)
  return {
    storage,
    tmpDir,
    cleanup: () => {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch (_) { /* ignore */ }
    }
  }
}

describe('Storage 模块特征测试', () => {
  let ctx

  beforeEach(() => {
    ctx = createTempStorage()
  })

  afterEach(() => {
    ctx.cleanup()
  })

  // ─────────────────────────────────────────────
  // 场景1：首次访问 ensureStorageFile 创建空 JSON
  // ─────────────────────────────────────────────
  it('正常场景:ensureStorageFile 创建空 JSON 文件', () => {
    const { storage, tmpDir } = ctx
    const storagePath = path.join(tmpDir, 'storage.json')

    expect(fs.existsSync(storagePath)).toBe(false)
    storage.ensureStorageFile()
    expect(fs.existsSync(storagePath)).toBe(true)

    // 内容应为合法的空 JSON
    const content = fs.readFileSync(storagePath, 'utf8')
    expect(JSON.parse(content)).toEqual({})
  })

  // ─────────────────────────────────────────────
  // 场景2：读写基本 key-value
  // ─────────────────────────────────────────────
  it('正常场景:setStorageSync 写入 + getStorageSync 读取', () => {
    const { storage } = ctx

    storage.setStorageSync('workStartTime', '09:00')
    expect(storage.getStorageSync('workStartTime')).toBe('09:00')

    storage.setStorageSync('autoCheckIn', true)
    expect(storage.getStorageSync('autoCheckIn')).toBe(true)
  })

  // ─────────────────────────────────────────────
  // 场景3：getStorageSync 默认值兜底
  // ─────────────────────────────────────────────
  it('边界场景:未设置的 key 返回 defaultValue', () => {
    const { storage } = ctx

    expect(storage.getStorageSync('nonExistent', 'fallback')).toBe('fallback')
    expect(storage.getStorageSync('nonExistent', null)).toBeNull()
    expect(storage.getStorageSync('nonExistent', 42)).toBe(42)
  })

  // ─────────────────────────────────────────────
  // 场景4：attendance_records 自动 merge
  // ─────────────────────────────────────────────
  it('特殊场景:setStorageSync attendance_records 触发自动 merge', () => {
    const { storage } = ctx

    // 原有一条记录
    storage.setStorageSync('attendance_records', [
      { date: '2026-06-08', checkIn: '09:00', checkOut: '', status: 'normal' }
    ])

    // 追加同日签退 + 另一天记录
    storage.setStorageSync('attendance_records', [
      { date: '2026-06-08', checkIn: '09:00', checkOut: '18:00', status: 'normal' },
      { date: '2026-06-09', checkIn: '09:05', checkOut: '', status: 'normal' }
    ])

    const records = storage.getStorageSync('attendance_records')
    // merge 后应去重 + 合并同日字段
    expect(records).toHaveLength(2)
    const day1 = records.find(r => r.date === '2026-06-08')
    expect(day1.checkOut).toBe('18:00')
  })

  // ─────────────────────────────────────────────
  // 场景5：overwriteStorageSync 跳过 merge 直接覆盖
  // ─────────────────────────────────────────────
  it('特殊场景:overwriteStorageSync 跳过 merge 直接覆盖', () => {
    const { storage } = ctx

    storage.setStorageSync('attendance_records', [
      { date: '2026-06-08', checkIn: '09:00', checkOut: '', status: 'normal' }
    ])

    storage.overwriteStorageSync('attendance_records', [
      { date: '2026-06-10', checkIn: '10:00', checkOut: '', status: 'normal' }
    ])

    const records = storage.getStorageSync('attendance_records')
    // 覆盖后只剩新记录
    expect(records).toHaveLength(1)
    expect(records[0].date).toBe('2026-06-10')
  })

  // ─────────────────────────────────────────────
  // 场景6：removeStorageSync 删除 key
  // ─────────────────────────────────────────────
  it('正常场景:removeStorageSync 删除指定 key', () => {
    const { storage } = ctx

    storage.setStorageSync('toDelete', 'value')
    expect(storage.getStorageSync('toDelete')).toBe('value')

    storage.removeStorageSync('toDelete')
    expect(storage.getStorageSync('toDelete')).toBeNull()
  })

  // ─────────────────────────────────────────────
  // 场景7：缓存一致性 —— 连续读不重新解析文件
  // ─────────────────────────────────────────────
  it('边界场景:缓存命中时不再读文件', () => {
    const { storage, tmpDir } = ctx
    const storagePath = path.join(tmpDir, 'storage.json')

    storage.setStorageSync('k', 'v1')
    // 外部篡改文件（模拟并发竞争）
    fs.writeFileSync(storagePath, JSON.stringify({ k: 'tampered' }))

    // 读取应返回缓存值（除非显式 invalidateCache）
    expect(storage.getStorageSync('k')).toBe('v1')

    storage.invalidateCache()
    // 失效后重新读文件
    expect(storage.getStorageSync('k')).toBe('tampered')
  })

  // ─────────────────────────────────────────────
  // 场景8：加密状态 —— safeStorage 不可用时返回明文状态
  // ─────────────────────────────────────────────
  it('边界场景:getEncryptionStatus 在无 safeStorage 环境返回明文状态', () => {
    const { storage } = ctx

    // 触发一次读以初始化
    storage.getStorageSync('any', null)
    const status = storage.getEncryptionStatus()
    expect(status.available).toBe(false)
    expect(status.encrypted).toBe(false)
  })

  // ─────────────────────────────────────────────
  // 场景9：空文件读取 —— 容错空 storage.json
  // ─────────────────────────────────────────────
  it('边界场景:空文件返回空对象而非抛错', () => {
    const { storage, tmpDir } = ctx
    const storagePath = path.join(tmpDir, 'storage.json')

    storage.ensureStorageFile()
    fs.writeFileSync(storagePath, '') // 写入空内容

    storage.invalidateCache()
    const val = storage.getStorageSync('anyKey', 'default')
    expect(val).toBe('default')
  })

  // ─────────────────────────────────────────────
  // 场景10：损坏的 JSON —— 容错返回空对象
  // ─────────────────────────────────────────────
  it('边界场景:损坏 JSON 不抛错,返回空对象', () => {
    const { storage, tmpDir } = ctx
    const storagePath = path.join(tmpDir, 'storage.json')

    storage.ensureStorageFile()
    fs.writeFileSync(storagePath, '{invalid json content')

    storage.invalidateCache()
    // 不应抛错，应返回默认值
    expect(storage.getStorageSync('anyKey', 'fallback')).toBe('fallback')
  })

  // ─────────────────────────────────────────────
  // Anti-Spec：ensureStorageFile 不覆盖已有数据
  // ─────────────────────────────────────────────
  it('Anti-Spec:ensureStorageFile 绝不覆盖已有数据', () => {
    const { storage, tmpDir } = ctx
    const storagePath = path.join(tmpDir, 'storage.json')

    storage.setStorageSync('important', 'data')

    // 再次调用 ensureStorageFile 不应清除数据
    storage.ensureStorageFile()
    storage.invalidateCache()
    expect(storage.getStorageSync('important')).toBe('data')

    // 文件内容应保留
    const content = fs.readFileSync(storagePath, 'utf8')
    expect(content).toContain('important')
    expect(content).toContain('data')
  })

  // ─────────────────────────────────────────────
  // Anti-Spec：setStorageSync attendance_records 不能丢失既有记录
  // ─────────────────────────────────────────────
  it('Anti-Spec:setStorageSync attendance_records 绝不丢失既有记录', () => {
    const { storage } = ctx

    storage.setStorageSync('attendance_records', [
      { date: '2026-06-08', checkIn: '09:00', checkOut: '18:00', status: 'normal' }
    ])

    // 再次写入不完整记录，不能丢既有完整记录
    storage.setStorageSync('attendance_records', [
      { date: '2026-06-09', checkIn: '09:05', checkOut: '', status: 'normal' }
    ])

    const records = storage.getStorageSync('attendance_records')
    const day1 = records.find(r => r.date === '2026-06-08')
    expect(day1).toBeDefined()
    expect(day1.checkOut).toBe('18:00') // 既有签退不能丢
  })
})
