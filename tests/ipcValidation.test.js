// 架构层升级·特征测试（step2 先行）：IPC 输入校验层（FM-008 IPC 契约破裂防御）
import { describe, it, expect } from 'vitest'
import {
  validateStorageKey,
  validateSafeBasename,
  assertOpenablePath,
  validateNotifyText
} from '../electron/modules/ipc-validate'

describe('validateStorageKey（存储域 key 契约）', () => {
  it('合法 key 通过：attendance_records / appConfig / cloud_cache_1', () => {
    for (const k of ['attendance_records', 'appConfig', 'cloud_cache_1'])
      expect(validateStorageKey(k).ok).toBe(true)
  })
  it('拒绝：非字符串/null/超长(>64)/特殊字符（路径穿越、原型污染）', () => {
    for (const k of [null, 123, '../etc', 'a'.repeat(65), '__proto__', 'x;rm'])
      expect(validateStorageKey(k).ok).toBe(false)
  })
})

describe('validateSafeBasename（备份文件名，防路径穿越）', () => {
  it('合法备份名通过：backup-2026-08-28.json / 灵韵备份.enc', () => {
    for (const n of ['backup-2026-08-28.json', '灵韵备份.enc'])
      expect(validateSafeBasename(n).ok).toBe(true)
  })
  it('拒绝路径穿越与非法扩展：../x.json、a/b.json、x.exe、空值', () => {
    for (const n of ['../x.json', 'a/b.json', 'x.exe', '', null])
      expect(validateSafeBasename(n).ok).toBe(false)
  })
})

describe('assertOpenablePath（shell.openPath 可执行文件防御）', () => {
  it('数据文件允许：.json/.xlsx/.csv/.txt', () => {
    for (const p of ['C:\\Users\\x\\export.json', 'C:\\data\\报表.xlsx', 'C:\\a.csv', 'C:\\a.txt'])
      expect(assertOpenablePath(p).ok).toBe(true)
  })
  it('拒绝可执行/脚本扩展与空值：.exe/.bat/.ps1/.cmd/.vbs/.js/null', () => {
    for (const p of ['C:\\evil.exe', 'C:\\run.bat', 'C:\\s.ps1', 'C:\\c.cmd', 'C:\\v.vbs', 'C:\\j.js', ''])
      expect(assertOpenablePath(p).ok).toBe(false)
  })
})

describe('validateNotifyText（通知文本截断防滥用）', () => {
  it('超 200 字符截断，非字符串转为空并拒绝', () => {
    expect(validateNotifyText('a'.repeat(300)).value.length).toBe(200)
    expect(validateNotifyText(123).ok).toBe(false)
  })
})
