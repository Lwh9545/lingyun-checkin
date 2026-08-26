"use strict";
/**
 * 共享常量模块（TypeScript）— 唯一真相源
 * 供 Electron 主进程和渲染进程使用
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRAY_STATUS_TEXT = exports.WEEK_DAYS = exports.STORAGE_KEYS = exports.TRAY_STATUS = exports.DEFAULT_CONFIG = exports.DEFAULTS = exports.TIME = void 0;
// ==================== 时间常量 ====================
exports.TIME = {
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
};
// ==================== 默认配置（精简版，供主进程使用） ====================
exports.DEFAULTS = {
    WORK_START: '09:00',
    WORK_END: '18:00',
    WORK_DAYS: [1, 2, 3, 4, 5]
};
// ==================== 完整默认配置 ====================
exports.DEFAULT_CONFIG = {
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
};
// ==================== 托盘状态 ====================
exports.TRAY_STATUS = {
    NONE: 'none',
    CHECKED_IN: 'checked_in',
    CHECKED_OUT: 'checked_out',
    COMPLETED: 'completed'
};
// ==================== 存储键名（完整版本） ====================
exports.STORAGE_KEYS = {
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
};
// ==================== 星期定义 ====================
exports.WEEK_DAYS = [
    { value: 0, name: '周日', short: '日' },
    { value: 1, name: '周一', short: '一' },
    { value: 2, name: '周二', short: '二' },
    { value: 3, name: '周三', short: '三' },
    { value: 4, name: '周四', short: '四' },
    { value: 5, name: '周五', short: '五' },
    { value: 6, name: '周六', short: '六' }
];
// ==================== 托盘状态文本 ====================
exports.TRAY_STATUS_TEXT = {
    [exports.TRAY_STATUS.NONE]: '灵韵考勤打卡 - 未打卡',
    [exports.TRAY_STATUS.CHECKED_IN]: '灵韵考勤打卡 - 已上班打卡',
    [exports.TRAY_STATUS.CHECKED_OUT]: '灵韵考勤打卡 - 已下班打卡',
    [exports.TRAY_STATUS.COMPLETED]: '灵韵考勤打卡 - 今日已完成'
};
