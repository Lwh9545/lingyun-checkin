/**
 * 考勤核心逻辑工具函数 (TypeScript)
 */
import type { AppConfig, CheckType, AttendanceStatus, AttendanceRecord } from '../types/core'
import { STATUS_MAP, STATUS_VALUE_MAP, DEFAULT_CONFIG_WITH_CAPS as DEFAULT_CONFIG, TIME } from './constants.js'
import { timeToMinutes, getDayOfWeek } from './dateUtils'

/** 旷工状态常量 */
const ABSENT_STATUS = 'absent'

/** 分段工作制旷工判定：超过此时间算旷工（午休开始时间） */
const getAbsentThreshold = (config: AppConfig): number => {
  if (config.enableRest && config.restStart) {
    const restStartMin = timeToMinutes(config.restStart)
    if (restStartMin !== TIME.INVALID_MINUTES) return restStartMin
  }
  const startMin = timeToMinutes(config.workStartTime)
  return startMin + TIME.MINUTES_PER_HOUR * 3
}

export function getStatusText(status: string | number | undefined | null): string {
  if (typeof status === 'number') {
    const map: Record<number, string> = { 0: '正常', 1: '迟到', 2: '早退', 3: '加班', 4: '旷工' }
    return map[status] || '正常'
  }
  if (status === 'half_day_leave' || status === 'full_day_leave') return '请假'
  if (status === ABSENT_STATUS) return '旷工'
  if (typeof status === 'string') return STATUS_MAP[status] || status || '正常'
  return '正常'
}

export function getStatusValue(statusText: string): AttendanceStatus {
  if (statusText === '旷工') return ABSENT_STATUS as AttendanceStatus
  return (STATUS_VALUE_MAP[statusText] || statusText || 'normal') as AttendanceStatus
}

export function getEffectiveStartTime(config: Partial<AppConfig>): string {
  return config.workStartTime || DEFAULT_CONFIG.WORK_START_TIME
}

export function getEffectiveEndTime(config: Partial<AppConfig>): string {
  return config.workEndTime || DEFAULT_CONFIG.WORK_END_TIME
}

export function isWorkDay(workDays?: number[] | null): boolean {
  if (workDays === null || workDays === undefined) {
    workDays = DEFAULT_CONFIG.WORK_DAYS
  }
  const today = getDayOfWeek()
  return Array.isArray(workDays) && workDays.includes(today)
}

/**
 * 检查打卡状态（支持分段工作制）
 * - 上班打卡：在上班时间前打卡=正常；超过上班时间但未过午休=迟到；超过午休时间=旷工
 * - 下班打卡：在下班时间前打卡=早退；在下班时间打卡=正常；超过下班时间=加班
 */
export function checkAttendanceStatus(type: CheckType, timeString: string, config: Partial<AppConfig> = {}): AttendanceStatus {
  const finalConfig: AppConfig = {
    workStartTime: DEFAULT_CONFIG.WORK_START_TIME,
    workEndTime: DEFAULT_CONFIG.WORK_END_TIME,
    enableRest: DEFAULT_CONFIG.ENABLE_REST,
    restStart: DEFAULT_CONFIG.REST_START,
    restEnd: DEFAULT_CONFIG.REST_END,
    overtimeOnNonWorkday: DEFAULT_CONFIG.OVERTIME_ON_NON_WORKDAY,
    overtimeOnSaturday: DEFAULT_CONFIG.OVERTIME_ON_SATURDAY,
    overtimeOnSunday: DEFAULT_CONFIG.OVERTIME_ON_SUNDAY,
    overtimeOnWorkday: DEFAULT_CONFIG.OVERTIME_ON_WORKDAY,
    overtimeAfterEndThreshold: DEFAULT_CONFIG.OVERTIME_AFTER_END_THRESHOLD,
    lateThreshold: DEFAULT_CONFIG.LATE_THRESHOLD,
    workDays: DEFAULT_CONFIG.WORK_DAYS,
    ...config,
    overtimeThreshold: config.overtimeThreshold ?? DEFAULT_CONFIG.OVERTIME_THRESHOLD,
    autoStartup: config.autoStartup ?? DEFAULT_CONFIG.AUTO_STARTUP,
    autoCheckIn: config.autoCheckIn ?? DEFAULT_CONFIG.AUTO_CHECK_IN,
    autoCheckOut: config.autoCheckOut ?? DEFAULT_CONFIG.AUTO_CHECK_OUT,
    autoCheckInOffset: config.autoCheckInOffset ?? DEFAULT_CONFIG.AUTO_CHECK_IN_OFFSET,
    autoCheckOutOffset: config.autoCheckOutOffset ?? DEFAULT_CONFIG.AUTO_CHECK_OUT_OFFSET,
    autoCheckOutOnShutdown: config.autoCheckOutOnShutdown ?? DEFAULT_CONFIG.AUTO_CHECK_OUT_ON_SHUTDOWN,
    checkWindowBefore: config.checkWindowBefore ?? DEFAULT_CONFIG.CHECK_WINDOW_BEFORE,
  }

  const currentMinutes = timeToMinutes(timeString)
  if (currentMinutes === TIME.INVALID_MINUTES) return 'normal'

  const today = getDayOfWeek()
  const isWorkDayFlag = isWorkDay(finalConfig.workDays)

  if (!isWorkDayFlag) {
    const allowOvertime = (today === 6 && finalConfig.overtimeOnSaturday) ||
                          (today === 0 && finalConfig.overtimeOnSunday)
    if (allowOvertime) return 'overtime'
    return 'normal'
  }

  if (type === '上班') {
    return checkCheckInStatus(currentMinutes, finalConfig)
  }

  const checkoutStatus = checkCheckOutStatus(currentMinutes, finalConfig)
  if (checkoutStatus === 'overtime' && !finalConfig.overtimeOnWorkday) {
    return 'normal'
  }
  return checkoutStatus
}

/**
 * 判定上班打卡状态
 * 规则：<= 上班时间+迟到阈值 → 正常
 *       > 上班时间+迟到阈值 且 <= 午休开始时间 → 迟到
 *       > 午休开始时间 → 旷工
 */
function checkCheckInStatus(currentMinutes: number, config: AppConfig): AttendanceStatus {
  const startTimeMinutes = timeToMinutes(config.workStartTime)
  if (startTimeMinutes === TIME.INVALID_MINUTES) return 'normal'

  const normalThreshold = startTimeMinutes + config.lateThreshold
  if (currentMinutes <= normalThreshold) return 'normal'

  const absentThreshold = getAbsentThreshold(config)
  if (currentMinutes <= absentThreshold) return 'late'

  return ABSENT_STATUS as AttendanceStatus
}

/**
 * 判定下班打卡状态
 * 规则：< 下班时间 → 早退
 *       >= 下班时间 且 <= 下班时间+加班阈值 → 正常
 *       > 下班时间+加班阈值 → 加班
 */
function checkCheckOutStatus(currentMinutes: number, config: AppConfig): AttendanceStatus {
  const endTimeMinutes = timeToMinutes(config.workEndTime)
  if (endTimeMinutes === TIME.INVALID_MINUTES) return 'normal'

  if (currentMinutes < endTimeMinutes) return 'early'

  if (currentMinutes > endTimeMinutes + config.overtimeAfterEndThreshold) return 'overtime'

  return 'normal'
}

export function isInCheckWindow(type: CheckType, config: Partial<AppConfig> = {}): boolean {
  const finalConfig = {
    workStartTime: DEFAULT_CONFIG.WORK_START_TIME,
    workEndTime: DEFAULT_CONFIG.WORK_END_TIME,
    checkWindowBefore: DEFAULT_CONFIG.CHECK_WINDOW_BEFORE,
    workDays: DEFAULT_CONFIG.WORK_DAYS,
    overtimeOnSaturday: DEFAULT_CONFIG.OVERTIME_ON_SATURDAY,
    overtimeOnSunday: DEFAULT_CONFIG.OVERTIME_ON_SUNDAY,
    ...config,
  }

  const now = new Date()
  const currentMinutes = now.getHours() * TIME.MINUTES_PER_HOUR + now.getMinutes()

  if (!isWorkDay(finalConfig.workDays)) {
    const today = getDayOfWeek()
    return (today === 6 && finalConfig.overtimeOnSaturday) ||
           (today === 0 && finalConfig.overtimeOnSunday)
  }

  if (type === '上班') {
    const startMinutes = timeToMinutes(finalConfig.workStartTime)
    const windowStart = Math.max(0, startMinutes - finalConfig.checkWindowBefore)
    const windowEnd = Math.min(TIME.MINUTES_PER_DAY, startMinutes + TIME.DEFAULT_AFTER_WORK_GRACE)
    return currentMinutes >= windowStart && currentMinutes <= windowEnd
  }

  const endMinutes = timeToMinutes(finalConfig.workEndTime)
  const windowStart = Math.max(0, endMinutes - finalConfig.checkWindowBefore)
  return currentMinutes >= windowStart
}

export function calculateEffectiveDuration(checkIn: string, checkOut: string, config: Partial<AppConfig> = {}): string {
  if (!checkIn || !checkOut) return '--'

  const finalConfig = {
    enableRest: DEFAULT_CONFIG.ENABLE_REST,
    restStart: DEFAULT_CONFIG.REST_START,
    restEnd: DEFAULT_CONFIG.REST_END,
    enableSplitShift: false,
    morningStart: DEFAULT_CONFIG.WORK_START_TIME,
    morningEnd: DEFAULT_CONFIG.REST_START,
    afternoonStart: DEFAULT_CONFIG.REST_END,
    afternoonEnd: DEFAULT_CONFIG.WORK_END_TIME,
    ...config,
  }

  const inMinutes = timeToMinutes(checkIn)
  const outMinutes = timeToMinutes(checkOut)
  if (inMinutes === TIME.INVALID_MINUTES || outMinutes === TIME.INVALID_MINUTES) return '--'

  let totalMinutes = 0

  if (finalConfig.enableSplitShift) {
    // 分段工时：只计算上下班窗口内的有效工时
    const morningStart = timeToMinutes(finalConfig.morningStart)
    const morningEnd = timeToMinutes(finalConfig.morningEnd)
    const afternoonStart = timeToMinutes(finalConfig.afternoonStart)
    const afternoonEnd = timeToMinutes(finalConfig.afternoonEnd)

    const actualMorningStart = Math.max(inMinutes, morningStart)
    const actualMorningEnd = Math.min(outMinutes, morningEnd)
    if (actualMorningEnd > actualMorningStart) {
      totalMinutes += actualMorningEnd - actualMorningStart
    }

    const actualAfternoonStart = Math.max(inMinutes, afternoonStart)
    const actualAfternoonEnd = Math.min(outMinutes, afternoonEnd)
    if (actualAfternoonEnd > actualAfternoonStart) {
      totalMinutes += actualAfternoonEnd - actualAfternoonStart
    }
  } else {
    totalMinutes = outMinutes - inMinutes

    if (finalConfig.enableRest && finalConfig.restStart && finalConfig.restEnd) {
      const restStartMinutes = timeToMinutes(finalConfig.restStart)
      const restEndMinutes = timeToMinutes(finalConfig.restEnd)
      const actualRestStart = Math.max(inMinutes, restStartMinutes)
      const actualRestEnd = Math.min(outMinutes, restEndMinutes)
      if (actualRestEnd > actualRestStart) {
        totalMinutes -= actualRestEnd - actualRestStart
      }
    }
  }

  if (totalMinutes <= 0) return '--'
  const hours = Math.floor(totalMinutes / TIME.MINUTES_PER_HOUR)
  const minutes = totalMinutes % TIME.MINUTES_PER_HOUR
  return `${hours}小时${minutes}分钟`
}

// ═══════════════════════════════════════════════
// 考勤统计（消除 Dashboard.vue 与 store 间的重复）
// ═══════════════════════════════════════════════

export interface MonthlyStats {
  total: number
  normal: number
  late: number
  early: number
  overtime: number
  onTimeRate: number
  avgDuration: string
  totalDuration: string
}

/**
 * 从打卡记录数组计算月度/年度统计数据
 */
export function computeStatsFromRecords(recs: AttendanceRecord[]): MonthlyStats {
  const total = recs.length
  const normal = recs.filter(r => r.status === 'normal').length
  const late = recs.filter(r => r.status === 'late').length
  const early = recs.filter(r => r.status === 'early').length
  const overtime = recs.filter(r => r.status === 'overtime').length
  const totalMinutes = recs.reduce((sum, r) => {
    if (!r.duration) return sum
    const parts = r.duration.split('小时')
    const h = parseInt(parts[0]) || 0
    const m = parseInt(parts[1]) || 0
    return sum + h * 60 + m
  }, 0)
  const avgMinutes = total > 0 ? Math.round(totalMinutes / total) : 0
  const avgH = Math.floor(avgMinutes / 60)
  const avgM = avgMinutes % 60
  const totalH = Math.floor(totalMinutes / 60)
  const totalM = totalMinutes % 60
  return {
    total, normal, late, early, overtime,
    onTimeRate: total > 0 ? Math.round((normal / total) * 100) : 0,
    avgDuration: avgH > 0 || avgM > 0
      ? `${avgH}小时${avgM}分钟`
      : '0小时0分钟',
    totalDuration: totalMinutes > 0
      ? `${Math.floor(totalMinutes / 60)}小时${totalMinutes % 60}分钟`
      : '0小时0分钟'
  }
}
