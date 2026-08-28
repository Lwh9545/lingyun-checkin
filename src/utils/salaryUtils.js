// 工资核对器（差异化功能）：打卡数据 → 加班费应得核算
// 契约：工作日超 8h 部分计 1.5x；休息日/法定节假日出勤全额计 2x/3x（法定标准）
// 依赖 holidays.ts 的 isRestDay/getHolidayInfo 判定日类型，经注入便于测试与解耦
// 特征测试: tests/salary.test.js
import { parseDurationToMinutes } from './chartUtils'

export const DEFAULT_RATES = { workday: 1.5, restday: 2, holiday: 3 }
const STANDARD_MINUTES = 8 * 60 // 法定标准工时：8 小时

/**
 * 日期三分类：法定节假日 > 休息日 > 工作日
 * @param {string} dateStr YYYY-MM-DD
 * @param {{isHoliday: boolean, isRestDay: boolean}} info holidays.getHolidayInfo + isRestDay 组合
 */
export function classifyDay(dateStr, info) {
  if (info?.isHoliday) return 'holiday'
  if (info?.isRestDay) return 'restday'
  return 'workday'
}

/** 逐日计薪分钟：工作日超 8h 部分，休息日/节假日全额 */
function billableMinutes(kind, minutes) {
  return kind === 'workday' ? Math.max(0, minutes - STANDARD_MINUTES) : minutes
}

/** 单日金额（整数分 / salaryCents）；wage 无效 → null
 *  全程整数运算，彻底避免 JS 浮点 0.1+0.2 误差；最终 /100 转元（整数÷100 精准无误差）
 */
function dayPayCents(minutes, wage, rate) {
  if (typeof wage !== 'number' || wage <= 0) return null
  // 先乘后除（整数）：分钟 × 时薪 × 倍率 × 100（分）/ 60（分钟）
  return Math.round((minutes * wage * rate * 100) / 60)
}

/**
 * 逐日对账明细（视图层数据源）
 * @returns {{items: Array<{date,kind,minutes,pay:number|null}>, workdayMinutes, restdayMinutes, holidayMinutes, totalPay:number|null}}
 */
export function calculateOvertimeDetail(records, salaryCfg, classify) {
  const wage = salaryCfg?.hourlyWage
  const items = []
  for (const r of records || []) {
    if (!r?.checkIn || !r?.checkOut || r.status === 'leave') continue
    const minutes = parseDurationToMinutes(r.duration)
    if (!minutes || minutes <= 0) continue
    const kind = classify(r.date)
    const billed = billableMinutes(kind, minutes)
    if (billed <= 0) continue
    const cents = dayPayCents(billed, wage, DEFAULT_RATES[kind])
    items.push({ date: r.date, kind, minutes: billed, pay: cents === null ? null : cents / 100 })
  }
  items.sort((a, b) => a.date.localeCompare(b.date))

  const acc = { workdayMinutes: 0, restdayMinutes: 0, holidayMinutes: 0 }
  for (const it of items) acc[`${it.kind}Minutes`] += it.minutes
  let totalPay = null
  if (typeof wage === 'number' && wage > 0) {
    let totalPayCents = 0
    for (const it of items) {
      // it.pay 来自整数÷100，再×100 回整数分必无损失；+0.5 防 Number.EPSILON 截断
      totalPayCents += Math.round(it.pay * 100 + (it.pay >= 0 ? 1e-9 : -1e-9))
    }
    totalPay = totalPayCents / 100
  }
  return { items, ...acc, totalPay }
}

/**
 * 月度加班费核算（calculateOvertimeDetail 的汇总视图）
 * @param {Array<{date,checkIn,checkOut,duration,status,leaveType?}>} records
 * @param {{hourlyWage?: number}|null} salaryCfg 时薪配置；null/缺 hourlyWage → totalPay=null
 * @param {(date: string) => 'workday'|'restday'|'holiday'} classify 日期分类器
 * @returns {{workdayMinutes,restdayMinutes,holidayMinutes,totalPay:number|null}}
 */
export function calculateOvertimePay(records, salaryCfg, classify) {
  const { items, ...acc } = calculateOvertimeDetail(records, salaryCfg, classify)
  void items
  return acc
}

/** 金额显示：两位小数人民币；null → '--' */
export function formatPay(v) {
  return typeof v === 'number' ? `¥${v.toFixed(2)}` : '--'
}

/** 日期类型中文标签（UI 与导出共用） */
export const KIND_LABEL = { workday: '工作日', restday: '休息日', holiday: '节假日' }

/** 分钟 → 简洁小时（'0h' / '1h' / '1.5h' / '2.5h'） */
export function formatHours(minutes) {
  if (!minutes) return '0h'
  return `${parseFloat((minutes / 60).toFixed(2))}h`
}
