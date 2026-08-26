/**
 * 前端常量配置（TypeScript）
 * 前端专用常量在此文件维护，避免跨模块导入问题
 */

// ==================== 时间常量 ====================
export const TIME = {
  INVALID_MINUTES: -1,
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
  MINUTES_PER_DAY: 24 * 60,
  MS_PER_SECOND: 1000,
  MS_PER_MINUTE: 60 * 1000,
  MS_PER_HOUR: 60 * 60 * 1000,
  MS_PER_DAY: 24 * 60 * 60 * 1000,
  DEFAULT_AFTER_WORK_GRACE: 2 * 60,
  AUTO_CHECK_WINDOW_AFTER: 60
}

// ==================== 默认配置 ====================
export const DEFAULT_CONFIG = {
  WORK_START_TIME: '09:00',
  WORK_END_TIME: '18:00',
  WORK_DAYS: [1, 2, 3, 4, 5],
  LATE_THRESHOLD: 15,
  OVERTIME_THRESHOLD: 30,
  AUTO_STARTUP: false,
  AUTO_CHECK_IN: false,
  AUTO_CHECK_OUT: false,
  AUTO_CHECK_IN_OFFSET: 0,
  AUTO_CHECK_OUT_OFFSET: 0,
  AUTO_CHECK_OUT_ON_SHUTDOWN: false,
  ENABLE_REST: true,
  REST_START: '12:00',
  REST_END: '14:00',
  OVERTIME_ON_NON_WORKDAY: true,
  OVERTIME_ON_SATURDAY: true,
  OVERTIME_ON_SUNDAY: true,
  OVERTIME_ON_WORKDAY: false,
  OVERTIME_AFTER_END_THRESHOLD: 30,
  CHECK_WINDOW_BEFORE: 60
}

// ==================== 默认配置（大写别名，保持向后兼容） ====================
export const DEFAULT_CONFIG_CAPS = {
  WORK_START_TIME: DEFAULT_CONFIG.WORK_START_TIME,
  WORK_END_TIME: DEFAULT_CONFIG.WORK_END_TIME,
  WORK_DAYS: DEFAULT_CONFIG.WORK_DAYS,
  LATE_THRESHOLD: DEFAULT_CONFIG.LATE_THRESHOLD,
  OVERTIME_THRESHOLD: DEFAULT_CONFIG.OVERTIME_THRESHOLD,
  AUTO_STARTUP: DEFAULT_CONFIG.AUTO_STARTUP,
  AUTO_CHECK_IN: DEFAULT_CONFIG.AUTO_CHECK_IN,
  AUTO_CHECK_OUT: DEFAULT_CONFIG.AUTO_CHECK_OUT,
  AUTO_CHECK_IN_OFFSET: DEFAULT_CONFIG.AUTO_CHECK_IN_OFFSET,
  AUTO_CHECK_OUT_OFFSET: DEFAULT_CONFIG.AUTO_CHECK_OUT_OFFSET,
  AUTO_CHECK_OUT_ON_SHUTDOWN: DEFAULT_CONFIG.AUTO_CHECK_OUT_ON_SHUTDOWN,
  ENABLE_REST: DEFAULT_CONFIG.ENABLE_REST,
  REST_START: DEFAULT_CONFIG.REST_START,
  REST_END: DEFAULT_CONFIG.REST_END,
  OVERTIME_ON_NON_WORKDAY: DEFAULT_CONFIG.OVERTIME_ON_NON_WORKDAY,
  OVERTIME_ON_SATURDAY: DEFAULT_CONFIG.OVERTIME_ON_SATURDAY,
  OVERTIME_ON_SUNDAY: DEFAULT_CONFIG.OVERTIME_ON_SUNDAY,
  OVERTIME_ON_WORKDAY: DEFAULT_CONFIG.OVERTIME_ON_WORKDAY,
  OVERTIME_AFTER_END_THRESHOLD: DEFAULT_CONFIG.OVERTIME_AFTER_END_THRESHOLD,
  CHECK_WINDOW_BEFORE: DEFAULT_CONFIG.CHECK_WINDOW_BEFORE
}

// ==================== 默认配置（前端小写键，用于 store） ====================
export const DEFAULT_CONFIG_LOWER = {
  workStartTime: DEFAULT_CONFIG.WORK_START_TIME,
  workEndTime: DEFAULT_CONFIG.WORK_END_TIME,
  workDays: [...DEFAULT_CONFIG.WORK_DAYS],
  lateThreshold: DEFAULT_CONFIG.LATE_THRESHOLD,
  overtimeThreshold: DEFAULT_CONFIG.OVERTIME_THRESHOLD,
  autoStartup: DEFAULT_CONFIG.AUTO_STARTUP,
  autoCheckIn: DEFAULT_CONFIG.AUTO_CHECK_IN,
  autoCheckOut: DEFAULT_CONFIG.AUTO_CHECK_OUT,
  autoCheckInOffset: DEFAULT_CONFIG.AUTO_CHECK_IN_OFFSET,
  autoCheckOutOffset: DEFAULT_CONFIG.AUTO_CHECK_OUT_OFFSET,
  autoCheckOutOnShutdown: DEFAULT_CONFIG.AUTO_CHECK_OUT_ON_SHUTDOWN,
  enableRest: DEFAULT_CONFIG.ENABLE_REST,
  restStart: DEFAULT_CONFIG.REST_START,
  restEnd: DEFAULT_CONFIG.REST_END,
  overtimeOnNonWorkday: DEFAULT_CONFIG.OVERTIME_ON_NON_WORKDAY,
  overtimeAfterEndThreshold: DEFAULT_CONFIG.OVERTIME_AFTER_END_THRESHOLD,
  checkWindowBefore: DEFAULT_CONFIG.CHECK_WINDOW_BEFORE
}

// ==================== 存储键名（前端专用） ====================
export const STORAGE_KEYS = {
  ATTENDANCE_RECORDS: 'attendance_records',
  WORK_START_TIME: 'workStartTime',
  WORK_END_TIME: 'workEndTime',
  WORK_DAYS: 'workDays',
  AUTO_CHECK_IN: 'autoCheckIn',
  AUTO_CHECK_OUT: 'autoCheckOut',
  AUTO_CHECK_IN_OFFSET: 'autoCheckInOffset',
  AUTO_CHECK_OUT_OFFSET: 'autoCheckOutOffset',
  AUTO_CHECK_OUT_ON_SHUTDOWN: 'autoCheckOutOnShutdown',
  AUTO_STARTUP: 'autoStartup',
  LAST_AUTO_CHECK_DATE: 'lastAutoCheckDate',
  AUTO_CHECK_IN_EXECUTED: 'autoCheckInExecuted',
  AUTO_CHECK_OUT_EXECUTED: 'autoCheckOutExecuted',
  LAST_CHECK_IN_DATE: 'lastCheckInDate',
  LAST_CHECK_OUT_DATE: 'lastCheckOutDate',
  ENABLE_REST: 'enableRest',
  REST_START: 'restStart',
  REST_END: 'restEnd',
  OVERTIME_ON_NON_WORKDAY: 'overtimeOnNonWorkday',
  OVERTIME_ON_SATURDAY: 'overtimeOnSaturday',
  OVERTIME_ON_SUNDAY: 'overtimeOnSunday',
  OVERTIME_ON_WORKDAY: 'overtimeOnWorkday',
  OVERTIME_AFTER_END_THRESHOLD: 'overtimeAfterEndThreshold',
  CHECK_WINDOW_BEFORE: 'checkWindowBefore',
  LATE_THRESHOLD: 'lateThreshold',
  APP_VERSION: 'app_version'
}

// ==================== 精简版默认配置（供导入使用） ====================
export const DEFAULTS = {
  WORK_START: '09:00',
  WORK_END: '18:00',
  WORK_DAYS: [1, 2, 3, 4, 5]
}

// ==================== 托盘状态 ====================
export const TRAY_STATUS = {
  NONE: 'none',
  CHECKED_IN: 'checked_in',
  CHECKED_OUT: 'checked_out',
  COMPLETED: 'completed'
}

// ==================== 星期定义 ====================
export const WEEK_DAYS = [
  { value: 0, name: '周日', short: '日' },
  { value: 1, name: '周一', short: '一' },
  { value: 2, name: '周二', short: '二' },
  { value: 3, name: '周三', short: '三' },
  { value: 4, name: '周四', short: '四' },
  { value: 5, name: '周五', short: '五' },
  { value: 6, name: '周六', short: '六' }
]

// ==================== 托盘状态文本 ====================
export const TRAY_STATUS_TEXT = {
  [TRAY_STATUS.NONE]: '灵韵考勤打卡 - 未打卡',
  [TRAY_STATUS.CHECKED_IN]: '灵韵考勤打卡 - 已上班打卡',
  [TRAY_STATUS.CHECKED_OUT]: '灵韵考勤打卡 - 已下班打卡',
  [TRAY_STATUS.COMPLETED]: '灵韵考勤打卡 - 今日已完成'
}

// ==================== 为兼容性创建大写命名的别名 ====================
export const DEFAULT_CONFIG_WITH_CAPS = {
  ...DEFAULT_CONFIG,
  ...DEFAULT_CONFIG_CAPS
};

// ==================== 重新导出类型定义 ====================
export type {
  AttendanceRecord,
  WorkSettings,
  AutoCheckState,
  IpcResponse,
  AutoStartupResult
} from '../types/core'

// ==================== 打卡状态映射（前端专用） ====================
export const STATUS_MAP: Record<string, string> = {
  normal: '正常',
  late: '迟到',
  early: '早退',
  overtime: '加班',
  absent: '旷工',
  half_day_leave: '请假半天',
  full_day_leave: '请假一天'
}

export const STATUS_VALUE_MAP: Record<string, string> = {
  '正常': 'normal',
  '迟到': 'late',
  '早退': 'early',
  '加班': 'overtime',
  '旷工': 'absent',
  '请假半天': 'half_day_leave',
  '请假一天': 'full_day_leave'
}

// ==================== 导出格式定义（前端专用） ====================
export interface ExportFormat {
  id: string
  name: string
  desc: string
}

export const EXPORT_FORMATS: ExportFormat[] = [
  { id: 'excel', name: 'Excel', desc: '导出为Excel表格，支持数据筛选和统计' },
  { id: 'pdf', name: 'PDF', desc: '导出为PDF文档，适合打印和存档' }
]

// ==================== 打卡类型 ====================
export type CheckType = 'checkIn' | 'checkOut'

// ==================== 窗口状态 ====================
export type WindowState = 'normal' | 'minimized' | 'maximized' | 'hidden'
