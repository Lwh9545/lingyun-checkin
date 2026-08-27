// 架构层·自动滚动备份特征测试（FM-006 损坏隔离的最后防线）
import { describe, it, expect } from 'vitest'
import { shouldBackupToday, rotateBackups } from '../electron/modules/auto-backup'

describe('shouldBackupToday（每日一次判定）', () => {
  it('当日无备份 → 需要备份', () => {
    expect(shouldBackupToday(null, '2026-08-28')).toBe(true)
  })
  it('已有当日备份 → 跳过', () => {
    expect(shouldBackupToday('auto-backup-2026-08-28.json', '2026-08-28')).toBe(false)
  })
  it('昨日备份 → 今日需要', () => {
    expect(shouldBackupToday('auto-backup-2026-08-27.json', '2026-08-28')).toBe(true)
  })
})

describe('rotateBackups（滚动保留 N 份，最新优先）', () => {
  it('超过保留数 → 删除最旧', () => {
    const files = [
      'auto-backup-2026-08-22.json', 'auto-backup-2026-08-23.json', 'auto-backup-2026-08-24.json'
    ]
    const { keep, remove } = rotateBackups(files, 2)
    expect(keep).toContain('auto-backup-2026-08-24.json')
    expect(keep).toContain('auto-backup-2026-08-23.json')
    expect(remove).toEqual(['auto-backup-2026-08-22.json'])
  })
  it('未超限 → 全保留零删除', () => {
    const { remove } = rotateBackups(['auto-backup-2026-08-28.json'], 7)
    expect(remove).toEqual([])
  })
  it('非 auto-backup 命名文件不参与轮换（手动备份不受影响）', () => {
    const files = ['manual-2026-08-01.json', 'auto-backup-2026-08-28.json']
    const { remove } = rotateBackups(files, 1)
    expect(remove).toEqual([])
  })
})
