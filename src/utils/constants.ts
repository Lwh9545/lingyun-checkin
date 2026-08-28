/**
 * 前端常量配置（TypeScript）
 * 通用 7 组常量统一从 @shared/constants.js 单点 re-export，避免主进程/渲染进程双份漂移。
 * 前端专用扩展（大写别名 / 小写键 / 状态映射 / 导出格式 / type 重导出）在此文件保留。
 */
import type { AttendanceStatus } from '../types/core'

// ==================== 通用常量（唯一真相源：shared/constants.js） ====================
// 先 import 进本地作用域（供 DEFAULT_CONFIG_CAPS/DEFAULT_CONFIG_LOWER/STATUS_MAP 引用），
// 再整体 export（避免 re-export 不创建本地绑定的 ES module 坑）。
import {
  TIME,
  DEFAULTS,
  DEFAULT_CONFIG,
  TRAY_STATUS,
  STORAGE_KEYS,
  WEEK_DAYS,
  TRAY_STATUS_TEXT
} from '@shared/constants.js'
export {
  TIME,
  DEFAULTS,
  DEFAULT_CONFIG,
  TRAY_STATUS,
  STORAGE_KEYS,
  WEEK_DAYS,
  TRAY_STATUS_TEXT
}

// ==================== 前端专用：大写别名 DEFAULT_CONFIG_CAPS ====================
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

// ==================== 前端专用：小写键 DEFAULT_CONFIG_LOWER（供 store） ====================
export const DEFAULT_CONFIG_LOWER = {
  workStartTime: DEFAULT_CONFIG.WORK_START_TIME,
  workEndTime: DEFAULT_CONFIG.WORK_END_TIME,
  workDays: [...DEFAULT_CONFIG.WORK_DAYS],
  lateThreshold: DEFAULT_CONFIG.LATE_THRESHOLD,
  overtimeThreshold: DEFAULT_CONFIG.OVERTIME_THRESHOLD,
  autoStartup: DEFAULT_CONFIG.AUTO_STARTUP,
  autoCheckIn: DEFAULT_CONFIG.AUTO_CHECK_IN,
  autoCheckInOffset: DEFAULT_CONFIG.AUTO_CHECK_IN_OFFSET,
  autoCheckOutOnShutdown: DEFAULT_CONFIG.AUTO_CHECK_OUT_ON_SHUTDOWN,
  enableRest: DEFAULT_CONFIG.ENABLE_REST,
  restStart: DEFAULT_CONFIG.REST_START,
  restEnd: DEFAULT_CONFIG.REST_END,
  overtimeOnNonWorkday: DEFAULT_CONFIG.OVERTIME_ON_NON_WORKDAY,
  overtimeAfterEndThreshold: DEFAULT_CONFIG.OVERTIME_AFTER_END_THRESHOLD,
  checkWindowBefore: DEFAULT_CONFIG.CHECK_WINDOW_BEFORE
}

// 为兼容性创建大写命名的别名
export const DEFAULT_CONFIG_WITH_CAPS = {
  ...DEFAULT_CONFIG,
  ...DEFAULT_CONFIG_CAPS
};

// 重新导出类型定义
export type {
  AttendanceRecord,
  WorkSettings,
  AutoCheckState,
  IpcResponse,
  AutoStartupResult
} from '../types/core'

// 打卡状态映射（前端专用）
export const STATUS_MAP: Record<string, string> = {
  normal: '正常',
  late: '迟到',
  early: '早退',
  overtime: '加班',
  absent: '旷工',
  half_day_leave: '请假半天',
  full_day_leave: '请假一天',
  missing_check_in: '缺卡'
}

export const STATUS_VALUE_MAP: Record<string, AttendanceStatus> = {
  '正常': 'normal',
  '迟到': 'late',
  '早退': 'early',
  '加班': 'overtime',
  '旷工': 'absent',
  '请假半天': 'half_day_leave',
  '请假一天': 'full_day_leave'
}

// 导出格式定义（前端专用）
export interface ExportFormat {
  id: string
  name: string
  desc: string
}

export const EXPORT_FORMATS: ExportFormat[] = [
  { id: 'excel', name: 'Excel', desc: '导出为Excel表格，支持数据筛选和统计' },
  { id: 'pdf', name: 'PDF', desc: '导出为PDF文档，适合打印和存档' }
]

// 打卡类型
export type CheckType = 'checkIn' | 'checkOut'

// 窗口状态
export type WindowState = 'normal' | 'minimized' | 'maximized' | 'hidden'
