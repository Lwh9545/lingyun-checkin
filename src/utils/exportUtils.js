// 共享 Excel 导出模板（体验层）：消除 MonthView/AllView 双处重复，统一列结构/列宽/统计汇总
// 契约测试: tests/experience.test.js
import { LEAVE_TYPES, parseDurationToMinutes } from './chartUtils'
import { getStatusText } from './attendanceUtils'

export const EXPORT_COL_WIDTHS = [
  { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 10 }
]

function leaveLabel(type) {
  return LEAVE_TYPES.find(t => t.value === type)?.label || '请假'
}

/** 明细行（7 列对齐 EXPORT_HEADERS，请假类型中文化，缺省 '--'） */
export function buildExportRows(records, getWeekday) {
  return (records || []).map(r => ({
    '日期': r.date,
    '星期': getWeekday(r.date),
    '上班时间': r.checkIn || '--:--',
    '下班时间': r.checkOut || '--:--',
    '工作时长': r.duration || '--',
    '状态': r.status === 'leave' ? '请假' : getStatusText(r.status),
    '请假类型': r.status === 'leave' ? leaveLabel(r.leaveType) : '--'
  }))
}

/** 汇总行（第二张 sheet）：出勤/请假/加班天数 + 平均/总工时（分钟级解析） */
export function buildStatsRows(records, getWeekday) {
  const recs = records || []
  const workDays = recs.filter(r => r.status !== 'leave' && r.checkIn && r.checkOut)
  const leaveDays = recs.filter(r => r.status === 'leave')
  const overtimeDays = recs.filter(r => r.status === 'overtime')
  const minutes = workDays.map(r => parseDurationToMinutes(r.duration)).filter(m => m > 0)
  const totalMin = minutes.reduce((a, b) => a + b, 0)
  const avg = minutes.length ? Math.round(totalMin / minutes.length) : 0
  const fmt = m => `${Math.floor(m / 60)}小时${m % 60}分钟`
  const period = recs.length ? `${recs[0].date.slice(0, 7)}（${getWeekday(recs[0].date)}起）` : '--'
  return [
    { '指标': '统计周期', '值': period },
    { '指标': '记录天数', '值': recs.length },
    { '指标': '出勤天数', '值': workDays.length },
    { '指标': '请假天数', '值': leaveDays.length },
    { '指标': '加班天数', '值': overtimeDays.length },
    { '指标': '总工时', '值': fmt(totalMin) },
    { '指标': '平均工时', '值': fmt(avg) }
  ]
}
