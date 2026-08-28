/**
 * 灵韵打卡 — 核心类型定义
 * 所有 TypeScript 模块共享的类型基础
 */

// ═
// 打卡记录
// ═

export type AttendanceStatus =
  | 'normal'
  | 'late'
  | 'early'
  | 'overtime'
  | 'absent'
  | 'leave'
  | 'half_day_leave'
  | 'full_day_leave'

/** 请假类型（新契约：status='leave' 时必带，见 chartUtils.LEAVE_TYPES） */
export type LeaveType = 'sick' | 'annual' | 'personal' | 'comp'

export interface AttendanceRecord {
  date: string              // YYYY-MM-DD
  checkIn: string           // HH:MM 或空
  checkOut: string          // HH:MM 或空
  status: AttendanceStatus
  duration: string          // "8小时30分钟" 或空
  timestamp: number         // Unix ms
  leaveType?: LeaveType     // 请假类型（仅 status='leave' 时有意义；half/full_day_leave 为旧词汇，仅兼容旧数据导入）
}

export type CheckType = '上班' | '下班'

// ═
// 应用配置
// ═

export interface AppConfig {
  // 基础时间
  workStartTime: string           // HH:MM
  workEndTime: string             // HH:MM
  workDays: number[]              // 0=周日, 1=周一, ..., 6=周六
  lateThreshold: number           // 分钟
  overtimeThreshold: number

  // 自动打卡
  autoStartup: boolean
  autoCheckIn: boolean
  autoCheckInOffset: number       // 提前分钟
  autoCheckOutOnShutdown: boolean

  // 午休
  enableRest: boolean
  restStart: string               // HH:MM
  restEnd: string                 // HH:MM

  // 加班
  overtimeOnNonWorkday: boolean
  overtimeOnSaturday: boolean
  overtimeOnSunday: boolean
  overtimeOnWorkday: boolean
  overtimeAfterEndThreshold: number

  // 打卡窗口
  checkWindowBefore: number

  // 分段工时（可选，未在 UI 暴露但核心逻辑支持）
  enableSplitShift?: boolean
  morningStart?: string
  morningEnd?: string
  afternoonStart?: string
  afternoonEnd?: string
}

// ═
// 存储键名枚举
// ═

export const enum StorageKey {
  ATTENDANCE_RECORDS = 'attendance_records',
  WORK_START_TIME = 'workStartTime',
  WORK_END_TIME = 'workEndTime',
  WORK_DAYS = 'workDays',
  AUTO_CHECK_IN = 'autoCheckIn',
  AUTO_CHECK_IN_OFFSET = 'autoCheckInOffset',
  AUTO_CHECK_OUT_ON_SHUTDOWN = 'autoCheckOutOnShutdown',
  AUTO_STARTUP = 'autoStartup',
  ENABLE_REST = 'enableRest',
  REST_START = 'restStart',
  REST_END = 'restEnd',
  OVERTIME_ON_NON_WORKDAY = 'overtimeOnNonWorkday',
  OVERTIME_ON_SATURDAY = 'overtimeOnSaturday',
  OVERTIME_ON_SUNDAY = 'overtimeOnSunday',
  OVERTIME_ON_WORKDAY = 'overtimeOnWorkday',
  OVERTIME_AFTER_END_THRESHOLD = 'overtimeAfterEndThreshold',
  CHECK_WINDOW_BEFORE = 'checkWindowBefore',
  LATE_THRESHOLD = 'lateThreshold',
  LAST_CHECK_IN_DATE = 'lastCheckInDate',
  LAST_CHECK_OUT_DATE = 'lastCheckOutDate',
  LAST_AUTO_CHECK_DATE = 'lastAutoCheckDate',
  AUTO_CHECK_IN_EXECUTED = 'autoCheckInExecuted',
  APP_VERSION = 'app_version',
}

// ═
// 日历
// ═

export interface DayInfo {
  date: string
  day: number
  inMonth: boolean
  isSelected: boolean
  isToday: boolean
  isWeekend: boolean
  hasRecord: boolean
  hasCheckIn: boolean
  hasCheckOut: boolean
  holidayName: string | null
  isHoliday: boolean
  isMakeUp: boolean
}

export interface MonthStats {
  total: number
  normal: number
  late: number
  early: number
  overtime: number
}

export interface MonthDashboard {
  avgCheckIn: string
  avgDuration: string
  onTimeRate: number
}

export interface WeekDay {
  date: string
  day: number
  dayName: string
  isToday: boolean
  isWeekend: boolean
  hasCheckIn: boolean
  hasCheckOut: boolean
  status: string
  isComplete: boolean
}

// ═
// 数据管理
// ═

export interface DataStats {
  totalRecords: number
  backupCount: number
  lastBackup: string | null
  dataPath: string
  backupPath: string
}

export interface BackupItem {
  name: string
  modified: string
}

export interface HolidayStatus {
  state: 'idle' | 'loading' | 'success' | 'error'
  lastFetchYear: number | null
  lastFetchTime: number | null
  totalHolidays: number
  totalAdjustments: number
}

export interface UpdateInfo {
  available: boolean
  version?: string
  releaseDate?: string
  releaseNotes?: string
  error?: string
  dev?: boolean
}

// 费用报销：金额存「分」整数，消灭 0.1+0.2 浮点误差
export type ExpenseCategory = 'food' | 'transport' | 'hotel' | 'office' | 'other'
//   餐饮(外卖/打饭) 交通(地铁/打车/高铁) 住宿(出差酒店) 办公(文具/耗材) 其他(兜底含加油停车通讯)

export interface ReimbursementRecord {
  id: string
  date: string         // YYYY-MM-DD
  category: ExpenseCategory
  amountCents: number  // 整数分
  remark: string       // 选填 ≤200字
  createdAt: number
}

// ═
// IPC / Electron API
// ═

export interface ElectronAPI {
  storage: {
    get: (key: string, defaultValue?: unknown) => Promise<unknown>
    set: (key: string, value: unknown) => Promise<boolean>
    overwrite: (key: string, value: unknown) => Promise<boolean>
    remove: (key: string) => Promise<boolean>
  }
  autoStartup: {
    set: (enabled: boolean) => Promise<boolean>
    get: () => Promise<boolean>
  }
  notification: {
    send: (title: string, body: string) => Promise<boolean>
  }
  window: {
    minimize: () => Promise<boolean>
    show: () => Promise<boolean>
    close: () => Promise<boolean>
  }
  dataManager: {
    getBackupList: () => Promise<BackupItem[]>
    restoreFromBackup: (name: string) => Promise<boolean>
    deleteBackup: (name: string) => Promise<boolean>
    clearAllRecords: () => Promise<boolean>
    exportData: (path: string) => Promise<boolean>
    importData: (path: string) => Promise<{ success: boolean; version?: string; time?: string; error?: string }>
    getAppVersion: () => Promise<string>
    getDataStats: () => Promise<DataStats>
  }
  dialog: {
    showSaveDialog: (options: Record<string, unknown>) => Promise<{ canceled: boolean; filePath?: string }>
    showOpenDialog: (options: Record<string, unknown>) => Promise<{ canceled: boolean; filePaths: string[] }>
  }
  shell: {
    openPath: (path: string) => Promise<string>
  }
  tray: {
    updateStatus: (status: string) => void
  }
  onNotification: (cb: (data: unknown) => void) => void
  onTriggerCheckIn: (cb: () => void) => void
  removeTriggerCheckIn: () => void
  onTriggerCheckOut: (cb: () => void) => void
  removeTriggerCheckOut: () => void
  onTriggerAutoCheckIn: (cb: () => void) => void
  removeTriggerAutoCheckIn: () => void
  onCheckAutoCheckIn: (cb: () => void) => void
  removeCheckAutoCheckIn: () => void
  onShutdownCheckOut: (cb: () => void) => void
  removeShutdownCheckOut: () => void
  updater: {
    check: () => Promise<UpdateInfo | null>
    download: () => Promise<boolean>
    install: () => Promise<boolean>
    getEncryptionStatus: () => Promise<{ encrypted: boolean; available: boolean }>
  }
  onUpdateAvailable: (cb: (info: UpdateInfo) => void) => void
  onUpdateNotAvailable: (cb: () => void) => void
  onUpdateDownloaded: (cb: () => void) => void
  onUpdateProgress: (cb: (progress: { percent: number }) => void) => void
  onUpdateSkippedDev: (cb: () => void) => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
    __toast?: {
      show: (message: string, type?: string, duration?: number) => number
      dismiss: (id: number) => void
    }
  }
}

export {}
