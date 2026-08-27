// 架构层·存储韧性特征测试（FM-006 根治闭环）：原子写 + 损坏自愈
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createStorage } from '../electron/modules/storage'
import fs from 'fs'
import path from 'path'
import os from 'os'

let tmpDir, storage

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ly-storage-'))
  storage = createStorage(tmpDir)
})
afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('原子写（tmp+rename，半写不可见）', () => {
  it('写入后读回一致', () => {
    expect(storage.setStorageSync('appConfig', { a: 1 })).toBe(true)
    expect(storage.getStorageSync('appConfig')).toEqual({ a: 1 })
  })
  it('连续增量写不产生半写（最终状态一致，merge 语义按日期去重）', () => {
    for (let i = 0; i < 5; i++) storage.setStorageSync('attendance_records', [{ date: `2026-08-2${i}`, checkIn: '09:00' }])
    const recs = storage.getStorageSync('attendance_records')
    expect(recs).toHaveLength(5)
  })
  it('overwrite 语义 = 完全替换（clear-all 场景契约）', () => {
    storage.setStorageSync('attendance_records', [{ date: '2026-08-20', checkIn: '09:00' }])
    storage.overwriteStorageSync('attendance_records', [{ date: '2026-08-28', checkIn: '09:00', checkOut: '18:00' }])
    expect(storage.getStorageSync('attendance_records')).toHaveLength(1)
  })
})

describe('损坏自愈（从每日自动备份恢复，坏文件留证据）', () => {
  it('storage.json 损坏且无备份 → 返回默认值，坏文件改名保留（不静默覆盖）', () => {
    fs.writeFileSync(path.join(tmpDir, 'storage.json'), '{corrupted!!')
    const val = storage.getStorageSync('attendance_records', [])
    expect(val).toEqual([])
    const leftovers = fs.readdirSync(tmpDir).filter(f => f.startsWith('storage.json.corrupt-'))
    expect(leftovers).toHaveLength(1)
  })
  it('storage.json 损坏但 backups/ 有备份 → 自动恢复数据', () => {
    // 两次写：首次落盘，第二次写前产生当日 auto-backup（首日无旧文件可备为既有契约）
    storage.overwriteStorageSync('attendance_records', [{ date: '2026-08-28', checkIn: '09:00' }])
    storage.overwriteStorageSync('attendance_records', [{ date: '2026-08-28', checkIn: '09:00', checkOut: '18:00' }])
    const backupDir = path.join(tmpDir, 'backups')
    const backupFile = fs.readdirSync(backupDir).find(f => f.startsWith('auto-backup-'))
    expect(backupFile).toBeTruthy()
    // 模拟当日损坏（备份后写入坏数据）
    fs.writeFileSync(path.join(tmpDir, 'storage.json'), '{"attendance_records":"broken')
    storage.invalidateCache()
    const recs = storage.getStorageSync('attendance_records', [])
    expect(Array.isArray(recs) && recs.some(r => r.date === '2026-08-28')).toBe(true)
  })
})

describe('每日自动备份触发（写路径挂钩）', () => {
  it('当日首次写产生 auto-backup-* 快照旧状态，同日重复写不重复备份', () => {
    storage.overwriteStorageSync('attendance_records', [{ date: '2026-08-28', checkIn: '09:00' }])
    storage.overwriteStorageSync('attendance_records', [{ date: '2026-08-28', checkIn: '09:00', checkOut: '18:00' }])
    const backupDir = path.join(tmpDir, 'backups')
    const autos = fs.readdirSync(backupDir).filter(f => f.startsWith('auto-backup-'))
    expect(autos).toHaveLength(1)
  })
})
