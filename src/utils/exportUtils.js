// 共享 Excel 导出模板（体验层）：消除 MonthView/AllView 双处重复，统一列结构/列宽/统计汇总
// 契约测试: tests/experience.test.js
import { LEAVE_TYPES, parseDurationToMinutes } from './chartUtils'
import { getStatusText } from './attendanceUtils'
import { KIND_LABEL, formatHours, formatPay, DEFAULT_RATES } from './salaryUtils'
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  formatYuan,
  centsToYuan,
  totalCents,
  sumByCategory,
  countByCategory,
} from './reimbursementUtils'

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

// ═
// 工资对账单（Salary.vue 导出用）
// ═

export const SALARY_COL_WIDTHS = [
  { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 12 }
]

/** 对账明细行（5 列对齐 SALARY_COL_WIDTHS，小计为数字便于 Excel 求和） */
export function buildSalaryRows(detail) {
  return (detail?.items || []).map(it => ({
    '日期': it.date,
    '类型': KIND_LABEL[it.kind] || it.kind,
    '计薪时长': formatHours(it.minutes),
    '倍率': `${DEFAULT_RATES[it.kind]}x`,
    '小计(元)': it.pay ?? '--'
  }))
}

/** 对账汇总行（时薪 + 三分类时长 + 应得加班费） */
export function buildSalarySummaryRows(detail, hourlyWage) {
  return [
    { '指标': '时薪', '值': typeof hourlyWage === 'number' && hourlyWage > 0 ? `¥${hourlyWage}/小时` : '未配置' },
    { '指标': '工作日加班', '值': formatHours(detail?.workdayMinutes) },
    { '指标': '休息日加班', '值': formatHours(detail?.restdayMinutes) },
    { '指标': '节假日加班', '值': formatHours(detail?.holidayMinutes) },
    { '指标': '应得加班费', '值': formatPay(detail?.totalPay) }
  ]
}

// ═
// 报销单导出（Reimbursement.vue 用）
// 金额列保持数字（元，2位小数），便于 Excel 求和；展示格式 ¥ 后缀由 UI 负责
// ═

export const REIMBURSEMENT_COL_WIDTHS = [
  { wch: 12 }, // 日期
  { wch: 10 }, // 类型
  { wch: 12 }, // 金额(元)
  { wch: 36 }, // 备注
]

/** 报销明细行：4 列对齐 REIMBURSEMENT_COL_WIDTHS；金额存数字便于 Excel SUM */
export function buildReimbursementRows(records) {
  const arr = Array.isArray(records) ? records : []
  return arr.map(r => ({
    '日期': r.date,
    '类型': CATEGORY_META[r.category]?.label || r.category || '--',
    '金额(元)': Number.isFinite(centsToYuan(r.amountCents)) ? centsToYuan(r.amountCents) : 0,
    '备注': r.remark || '--',
  }))
}

/**
 * 共享 Excel 导出（深模块）：动态加载 exceljs → 逐 sheet 组装 → 浏览器下载。
 * 消除 Salary/Reimbursement/MonthView/AllView 四处逐字重复的导出流程。
 * @param {Array<{name: string, rows: object[], colWidths?: {wch: number}[]}>} sheets sheet 定义
 * @param {string} filename 下载文件名
 */
export async function exportWorkbook(sheets, filename) {
  const ExcelJS = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  for (const s of sheets || []) {
    applyJsonSheet(wb.addWorksheet(s.name), s.rows, s.colWidths)
  }
  const buf = await wb.xlsx.writeBuffer()
  triggerBufferDownload(buf, filename)
}

/** JSON 行数组 → worksheet（列宽：xlsx 的 {wch:N} → exceljs width:N） */
function applyJsonSheet(ws, rows, colWidths) {
  if (!rows || !rows.length) return
  const keys = Object.keys(rows[0])
  ws.columns = keys.map((k, i) => ({ header: k, key: k, width: colWidths?.[i]?.wch ?? 16 }))
  rows.forEach(r => ws.addRow(r))
}

/** 浏览器端下载 ArrayBuffer（Blob + <a download>） */
function triggerBufferDownload(buf, filename) {
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

/**
 * 报销汇总行：第二张 sheet「汇总」
 * 结构：统计周期 → 9 分类各 {笔数 / 金额(元)} → 合计笔数 → 合计金额
 */
export function buildReimbursementSummaryRows(records, yyyy, mm) {
  const arr = Array.isArray(records) ? records : []
  const sumMap = sumByCategory(arr)      // {[cat]: cents}
  const countMap = countByCategory(arr)  // {[cat]: n}
  const total = totalCents(arr)
  const totalCount = arr.length
  const period = (yyyy && mm) ? `${yyyy}年${String(mm).padStart(2, '0')}月` : '--'

  const rows = [
    { '项目': '统计周期', '笔数': '--', '金额(元)': period },
  ]
  // 9 分类（按打工人高频顺序），笔数为 0 的也展示，给老板/财务看全貌
  for (const c of CATEGORY_ORDER) {
    rows.push({
      '项目': CATEGORY_META[c].label,
      '笔数': countMap[c],
      '金额(元)': centsToYuan(sumMap[c]),
    })
  }
  rows.push({
    '项目': '合计',
    '笔数': totalCount,
    '金额(元)': centsToYuan(total),
  })
  return rows
}
