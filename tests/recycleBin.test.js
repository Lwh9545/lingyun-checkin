/**
 * 回收站特征测试
 *
 * 目的:验证 clear-all-records 的回收站机制(FW-003 落地)
 * - 清空前先把记录写到 recycle/ 目录
 * - 30 天后自动清理过期回收站文件
 * - 回收站写入失败时中止清空,保护数据
 *
 * 运行:npx vitest run tests/recycleBin.test.js
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

// Mock shared/logger 避免 require 失败
vi.mock('../../shared/logger.js', () => ({
  createLogger: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {}
  })
}))

const { createBackupManager } = await import('../electron/modules/backup.js')

// 临时目录
let tmpDir
let storageMock
let manager

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recycle-test-'))
  storageMock = {
    storagePath: path.join(tmpDir, 'storage.json'),
    getStorageSync: (key, def) => {
      if (key === 'attendance_records') return [{ date: '2026-06-08', checkIn: '09:00', checkOut: '18:00' }]
      return def
    },
    setStorageSync: () => {},
    invalidateCache: () => {}
  }
  manager = createBackupManager(storageMock, tmpDir, '3.3.0')
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('回收站机制 (FW-003)', () => {
  // ─────────────────────────────────────────────
  // 场景1:清空时记录被移到回收站
  // ─────────────────────────────────────────────
  it('正常场景:记录被移到 recycle/ 目录,文件存在且内容正确', () => {
    const records = [{ date: '2026-06-08', checkIn: '09:00', checkOut: '18:00' }]
    const filename = manager.moveToRecycleBin(records)

    expect(filename).toMatch(/^recycle_\d{4}-\d{2}-\d{2}T/)
    expect(filename.endsWith('.json')).toBe(true)

    const recycleDir = path.join(tmpDir, 'recycle')
    expect(fs.existsSync(recycleDir)).toBe(true)

    const saved = JSON.parse(fs.readFileSync(path.join(recycleDir, filename), 'utf8'))
    expect(saved.records).toEqual(records)
    expect(saved.count).toBe(1)
    expect(saved.deletedAt).toBeDefined()
  })

  // ─────────────────────────────────────────────
  // 场景2:30 天前的回收站文件被自动清理
  // ─────────────────────────────────────────────
  it('临界场景:30 天前的回收站文件被自动删除', () => {
    const recycleDir = path.join(tmpDir, 'recycle')
    fs.mkdirSync(recycleDir, { recursive: true })
    // 伪造 31 天前的文件
    const oldFile = path.join(recycleDir, 'recycle_old.json')
    fs.writeFileSync(oldFile, JSON.stringify({ records: [], deletedAt: '2020-01-01' }))
    const oldTime = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
    fs.utimesSync(oldFile, oldTime, oldTime)

    manager.moveToRecycleBin([{ date: '2026-06-09' }])

    expect(fs.existsSync(oldFile)).toBe(false)
  })

  // ─────────────────────────────────────────────
  // 场景3:空记录也能正常调用(不报错)
  // ─────────────────────────────────────────────
  it('边界场景:空数组也能正常处理', () => {
    const filename = manager.moveToRecycleBin([])
    expect(filename).toMatch(/^recycle_/)
    const recycleDir = path.join(tmpDir, 'recycle')
    const saved = JSON.parse(fs.readFileSync(path.join(recycleDir, filename), 'utf8'))
    expect(saved.count).toBe(0)
  })

  // ─────────────────────────────────────────────
  // Anti-Spec:回收站失败时绝不能继续清空(数据保护)
  // ─────────────────────────────────────────────
  it('Anti-Spec:回收站目录被文件占用时,函数应抛错(让上层中止清空)', () => {
    // 把 recycle 目录路径指向一个已存在的文件(mkdirSync 会抛 EEXIST/ENOTDIR)
    const blocker = path.join(tmpDir, 'recycle')
    fs.writeFileSync(blocker, 'i am a file not a dir')
    expect(() => manager.moveToRecycleBin([{ date: '2026-06-08' }])).toThrow()
  })

  // ─────────────────────────────────────────────
  // 反规格验证:回收站文件必须包含元数据(删除时间+数量+记录)
  // ─────────────────────────────────────────────
  it('Anti-Spec:回收站文件必须含 deletedAt + count + records 三字段', () => {
    const records = [{ date: '2026-06-08' }, { date: '2026-06-09' }]
    const filename = manager.moveToRecycleBin(records)
    const recycleDir = path.join(tmpDir, 'recycle')
    const saved = JSON.parse(fs.readFileSync(path.join(recycleDir, filename), 'utf8'))

    expect(saved).toHaveProperty('deletedAt')
    expect(saved).toHaveProperty('count')
    expect(saved).toHaveProperty('records')
    expect(saved.count).toBe(2)
    expect(saved.records).toHaveLength(2)
  })
})
