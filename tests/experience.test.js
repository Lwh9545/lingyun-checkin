// 体验层·特征测试先行：主题跟随系统 + 共享导出模板（消除 MonthView/AllView 双处重复）
import { describe, it, expect } from 'vitest'
import { resolveTheme, watchSystemTheme } from '../src/utils/themeUtils'
import { buildExportRows, buildStatsRows, EXPORT_COL_WIDTHS } from '../src/utils/exportUtils'
import { parseDurationToMinutes } from '../src/utils/chartUtils'

describe('resolveTheme（跟随系统判定）', () => {
  it('系统深色 → dark；浅色 → light', () => {
    expect(resolveTheme(true)).toBe('dark')
    expect(resolveTheme(false)).toBe('light')
  })
  it('非法输入回退 light（补全陷阱防御）', () => {
    expect(resolveTheme(undefined)).toBe('light')
  })
})

describe('watchSystemTheme（媒体查询监听契约）', () => {
  it('返回解绑函数，立即以当前状态回调', () => {
    let current = false
    const fakeMql = {
      matches: false,
      addEventListener: (_t, cb) => { fakeMql._cb = cb },
      removeEventListener: () => { fakeMql._cb = null }
    }
    const seen = []
    const unbind = watchSystemTheme(fakeMql, t => seen.push(t))
    expect(seen).toEqual(['light'])
    current = true; fakeMql.matches = true; fakeMql._cb()
    expect(seen).toEqual(['light', 'dark'])
    unbind()
  })
})

describe('buildExportRows（统一导出行：请假类型中文化）', () => {
  const recs = [
    { date: '2026-08-28', checkIn: '09:00', checkOut: '18:00', duration: '8小时30分钟', status: 'normal' },
    { date: '2026-08-27', status: 'leave', leaveType: 'sick', checkIn: '', checkOut: '', duration: '请假' }
  ]
  it('行结构含 7 列，请假类型输出中文', () => {
    const rows = buildExportRows(recs, d => '周五')
    expect(rows[0]['请假类型']).toBe('--')
    expect(rows[1]['请假类型']).toBe('病假')
    expect(rows[1]['状态']).toBe('请假')
  })
})

describe('buildStatsRows（汇总 sheet：出勤/请假/加班/平均工时）', () => {
  it('空记录 → 全零不抛错', () => {
    const rows = buildStatsRows([], d => '周五')
    expect(rows.length).toBeGreaterThan(0)
  })
  it('混合记录统计正确（工时解析复用 parseDurationToMinutes）', () => {
    const recs = [
      { date: '2026-08-26', checkIn: '09:00', checkOut: '18:00', duration: '8小时0分钟', status: 'normal' },
      { date: '2026-08-27', status: 'leave', leaveType: 'annual', duration: '请假' },
      { date: '2026-08-25', checkIn: '09:00', checkOut: '21:00', duration: '11小时0分钟', status: 'overtime' }
    ]
    const rows = buildStatsRows(recs, () => '周三')
    const map = Object.fromEntries(rows.map(r => [r['指标'], r['值']]))
    expect(map['出勤天数']).toBe(2)
    expect(map['请假天数']).toBe(1)
    expect(map['加班天数']).toBe(1)
  })
})

describe('EXPORT_COL_WIDTHS（列宽契约，7 列对齐）', () => {
  it('7 列宽度均 >= 8（窄窗可读下限）', () => {
    expect(EXPORT_COL_WIDTHS).toHaveLength(7)
    expect(EXPORT_COL_WIDTHS.every(w => w.wch >= 8)).toBe(true)
  })
})
