// 体验层·特征测试先行：主题跟随系统 + 共享导出模板（消除 MonthView/AllView 双处重复）
import { describe, it, expect } from 'vitest'
import { resolveTheme, watchSystemTheme } from '../src/utils/themeUtils'
import { buildExportRows, buildStatsRows, buildSalaryRows, buildSalarySummaryRows, EXPORT_COL_WIDTHS, buildReimbursementRows, buildReimbursementSummaryRows, REIMBURSEMENT_COL_WIDTHS } from '../src/utils/exportUtils'
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

describe('buildSalaryRows（工资对账单明细行）', () => {
  it('5 列结构：日期/类型/计薪时长/倍率/小计；pay=null → \'--\'', () => {
    const detail = {
      items: [
        { date: '2026-08-26', kind: 'workday', minutes: 60, pay: 75 },
        { date: '2026-08-30', kind: 'restday', minutes: 150, pay: null }
      ]
    }
    const rows = buildSalaryRows(detail)
    expect(rows[0]).toEqual({ '日期': '2026-08-26', '类型': '工作日', '计薪时长': '1h', '倍率': '1.5x', '小计(元)': 75 })
    expect(rows[1]['类型']).toBe('休息日')
    expect(rows[1]['倍率']).toBe('2x')
    expect(rows[1]['小计(元)']).toBe('--')
  })
  it('空明细 → 空数组不抛错', () => {
    expect(buildSalaryRows({ items: [] })).toEqual([])
    expect(buildSalaryRows(null)).toEqual([])
  })
})

describe('buildSalarySummaryRows（工资对账单汇总行）', () => {
  it('含时薪、三分类时长与应得加班费', () => {
    const detail = { workdayMinutes: 60, restdayMinutes: 150, holidayMinutes: 0, totalPay: 550 }
    const rows = buildSalarySummaryRows(detail, 50)
    const map = Object.fromEntries(rows.map(r => [r['指标'], r['值']]))
    expect(map['时薪']).toBe('¥50/小时')
    expect(map['工作日加班']).toBe('1h')
    expect(map['休息日加班']).toBe('2.5h')
    expect(map['节假日加班']).toBe('0h')
    expect(map['应得加班费']).toBe('¥550.00')
  })
  it('未配置时薪 → 时薪未配置、应得加班费--', () => {
    const detail = { workdayMinutes: 60, restdayMinutes: 0, holidayMinutes: 0, totalPay: null }
    const rows = buildSalarySummaryRows(detail, null)
    const map = Object.fromEntries(rows.map(r => [r['指标'], r['值']]))
    expect(map['时薪']).toBe('未配置')
    expect(map['应得加班费']).toBe('--')
  })
})

// ═
// 报销单导出（新增 UT 2 describe + 5 it）
// ═

describe('REIMBURSEMENT_COL_WIDTHS（报销明细表 4 列列宽契约）', () => {
  it('4 列：日期/类型/金额/备注，备注 ≥ 30 长列够写', () => {
    expect(REIMBURSEMENT_COL_WIDTHS).toHaveLength(4)
    expect(REIMBURSEMENT_COL_WIDTHS[0].wch).toBeGreaterThanOrEqual(10)
    expect(REIMBURSEMENT_COL_WIDTHS[3].wch).toBeGreaterThanOrEqual(30)
  })
})

describe('buildReimbursementRows（报销明细表行：日期/类型/金额(元)/备注）', () => {
  const records = [
    { date: '2026-03-02', category: 'food',      amountCents: 3000, remark: '加班外卖黄焖鸡' },
    { date: '2026-03-05', category: 'transport', amountCents: 5600, remark: '' },
  ]
  it('4 列中文字段名对齐 SALARY_COL_WIDTHS；金额为数字元便于 Excel 求和', () => {
    const rows = buildReimbursementRows(records)
    expect(rows[0]).toEqual({
      '日期': '2026-03-02',
      '类型': '餐饮',
      '金额(元)': 30,
      '备注': '加班外卖黄焖鸡',
    })
    // 金额为数字（not string），Excel 选中可直接底部显示合计
    expect(typeof rows[0]['金额(元)']).toBe('number')
  })
  it('空备注 → --；非法记录不崩', () => {
    const rows = buildReimbursementRows(records)
    expect(rows[1]['备注']).toBe('--')
    expect(buildReimbursementRows(null)).toEqual([])
    expect(buildReimbursementRows(undefined)).toEqual([])
  })
})

describe('buildReimbursementSummaryRows（报销汇总表：5分类+合计）', () => {
  const records = [
    { date: '2026-03-02', category: 'food',  amountCents: 3000, remark: '' },
    { date: '2026-03-08', category: 'food',  amountCents: 2500, remark: '' },
    { date: '2026-03-15', category: 'hotel', amountCents: 42000,remark: '' },
  ]
  it('1 周期 + 5 分类 + 1 合计 = 7 行', () => {
    const rows = buildReimbursementSummaryRows(records, 2026, 3)
    expect(rows).toHaveLength(7)
    const map = Object.fromEntries(rows.map(r => [r['项目'], r]))
    expect(map['统计周期']['金额(元)']).toBe('2026年03月')
    expect(map['餐饮']['笔数']).toBe(2)
    expect(map['餐饮']['金额(元)']).toBe(55)
    expect(map['住宿']['笔数']).toBe(1)
    expect(map['住宿']['金额(元)']).toBe(420)
    expect(map['合计']['笔数']).toBe(3)
    expect(map['合计']['金额(元)']).toBe(475)
  })
  it('空记录：所有分类 = 0；合计 0/0', () => {
    const rows = buildReimbursementSummaryRows([], 2026, 4)
    const map = Object.fromEntries(rows.map(r => [r['项目'], r]))
    expect(map['餐饮']['金额(元)']).toBe(0)
    expect(map['合计']['笔数']).toBe(0)
    expect(map['合计']['金额(元)']).toBe(0)
  })
})
