/**
 * 考勤记录类型定义
 */
export interface AttendanceRecord {
  date: string;           // YYYY-MM-DD
  checkIn?: string;       // HH:MM
  checkOut?: string;      // HH:MM
  status?: 'normal' | 'late' | 'early' | 'overtime' | 'half_day_leave' | 'full_day_leave';
  note?: string;
  duration?: string;      // 工作时长
  timestamp?: number;     // Unix ms
}

/**
 * 工作配置类型定义
 */
export interface WorkSettings {
  workStartTime: string;           // HH:MM
  workEndTime: string;             // HH:MM
  workDays: number[];              // [0=周日, 1=周一, ..., 6=周六]
  lateThreshold: number;           // 迟到阈值（分钟）
  overtimeThreshold: number;       // 加班阈值（分钟）
  
  autoStartup: boolean;            // 开机自启
  autoCheckIn: boolean;            // 自动上班打卡
  autoCheckOut: boolean;           // 自动下班打卡
  autoCheckInOffset: number;       // 上班打卡偏移（分钟）
  autoCheckOutOffset: number;      // 下班打卡偏移（分钟）
  autoCheckOutOnShutdown: boolean; // 关机自动打卡
  
  enableRest: boolean;             // 启用午休
  restStart: string;               // 午休开始
  restEnd: string;                 // 午休结束
  
  overtimeOnNonWorkday: boolean;   // 非工作日加班（兼容字段）
  overtimeOnSaturday: boolean;     // 周六加班
  overtimeOnSunday: boolean;       // 周日加班
  overtimeOnWorkday: boolean;      // 工作日加班
  overtimeAfterEndThreshold: number; // 下班后加班阈值
  
  checkWindowBefore: number;       // 打卡前窗口（分钟）
}

/**
 * 自动打卡状态
 */
export interface AutoCheckState {
  lastAutoCheckDate: string;
  autoCheckInExecuted: boolean;
  autoCheckOutExecuted: boolean;
  lastCheckInDate: string;
  lastCheckOutDate: string;
}

/**
 * IPC API 响应类型
 */
export interface IpcResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 自动启动设置结果
 */
export interface AutoStartupResult {
  success: boolean;
  method?: string;
  error?: string;
}

/**
 * 存储键名枚举
 */
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
} as const;

/**
 * 默认配置（与 shared/constants.js 保持一致）
 */
export const DEFAULT_CONFIG: WorkSettings = {
  workStartTime: '09:00',
  workEndTime: '18:00',
  workDays: [1, 2, 3, 4, 5],
  lateThreshold: 15,
  overtimeThreshold: 30,
  
  autoStartup: false,
  autoCheckIn: false,
  autoCheckOut: false,
  autoCheckInOffset: 0,
  autoCheckOutOffset: 0,
  autoCheckOutOnShutdown: false,
  
  enableRest: true,
  restStart: '12:00',
  restEnd: '14:00',
  
  overtimeOnNonWorkday: true,
  overtimeOnSaturday: true,
  overtimeOnSunday: true,
  overtimeOnWorkday: false,
  overtimeAfterEndThreshold: 30,
  
  checkWindowBefore: 60
} as const;

/**
 * 大写命名的默认配置（为了兼容性保留）
 */
export const DEFAULT_CONFIG_CAPS = {
  WORK_START_TIME: DEFAULT_CONFIG.workStartTime,
  WORK_END_TIME: DEFAULT_CONFIG.workEndTime,
  WORK_DAYS: DEFAULT_CONFIG.workDays,
  LATE_THRESHOLD: DEFAULT_CONFIG.lateThreshold,
  OVERTIME_THRESHOLD: DEFAULT_CONFIG.overtimeThreshold,
  AUTO_STARTUP: DEFAULT_CONFIG.autoStartup,
  AUTO_CHECK_IN: DEFAULT_CONFIG.autoCheckIn,
  AUTO_CHECK_OUT: DEFAULT_CONFIG.autoCheckOut,
  AUTO_CHECK_IN_OFFSET: DEFAULT_CONFIG.autoCheckInOffset,
  AUTO_CHECK_OUT_OFFSET: DEFAULT_CONFIG.autoCheckOutOffset,
  AUTO_CHECK_OUT_ON_SHUTDOWN: DEFAULT_CONFIG.autoCheckOutOnShutdown,
  ENABLE_REST: DEFAULT_CONFIG.enableRest,
  REST_START: DEFAULT_CONFIG.restStart,
  REST_END: DEFAULT_CONFIG.restEnd,
  OVERTIME_ON_NON_WORKDAY: DEFAULT_CONFIG.overtimeOnNonWorkday,
  OVERTIME_ON_SATURDAY: DEFAULT_CONFIG.overtimeOnSaturday,
  OVERTIME_ON_SUNDAY: DEFAULT_CONFIG.overtimeOnSunday,
  OVERTIME_ON_WORKDAY: DEFAULT_CONFIG.overtimeOnWorkday,
  OVERTIME_AFTER_END_THRESHOLD: DEFAULT_CONFIG.overtimeAfterEndThreshold,
  CHECK_WINDOW_BEFORE: DEFAULT_CONFIG.checkWindowBefore
};

/**
 * 时间常量
 */
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
} as const;
