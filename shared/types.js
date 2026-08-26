"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIME = exports.DEFAULT_CONFIG_CAPS = exports.DEFAULT_CONFIG = exports.STORAGE_KEYS = void 0;
/**
 * 存储键名枚举
 */
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
/**
 * 默认配置（与 shared/constants.js 保持一致）
 */
exports.DEFAULT_CONFIG = {
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
};
/**
 * 大写命名的默认配置（为了兼容性保留）
 */
exports.DEFAULT_CONFIG_CAPS = {
    WORK_START_TIME: exports.DEFAULT_CONFIG.workStartTime,
    WORK_END_TIME: exports.DEFAULT_CONFIG.workEndTime,
    WORK_DAYS: exports.DEFAULT_CONFIG.workDays,
    LATE_THRESHOLD: exports.DEFAULT_CONFIG.lateThreshold,
    OVERTIME_THRESHOLD: exports.DEFAULT_CONFIG.overtimeThreshold,
    AUTO_STARTUP: exports.DEFAULT_CONFIG.autoStartup,
    AUTO_CHECK_IN: exports.DEFAULT_CONFIG.autoCheckIn,
    AUTO_CHECK_OUT: exports.DEFAULT_CONFIG.autoCheckOut,
    AUTO_CHECK_IN_OFFSET: exports.DEFAULT_CONFIG.autoCheckInOffset,
    AUTO_CHECK_OUT_OFFSET: exports.DEFAULT_CONFIG.autoCheckOutOffset,
    AUTO_CHECK_OUT_ON_SHUTDOWN: exports.DEFAULT_CONFIG.autoCheckOutOnShutdown,
    ENABLE_REST: exports.DEFAULT_CONFIG.enableRest,
    REST_START: exports.DEFAULT_CONFIG.restStart,
    REST_END: exports.DEFAULT_CONFIG.restEnd,
    OVERTIME_ON_NON_WORKDAY: exports.DEFAULT_CONFIG.overtimeOnNonWorkday,
    OVERTIME_ON_SATURDAY: exports.DEFAULT_CONFIG.overtimeOnSaturday,
    OVERTIME_ON_SUNDAY: exports.DEFAULT_CONFIG.overtimeOnSunday,
    OVERTIME_ON_WORKDAY: exports.DEFAULT_CONFIG.overtimeOnWorkday,
    OVERTIME_AFTER_END_THRESHOLD: exports.DEFAULT_CONFIG.overtimeAfterEndThreshold,
    CHECK_WINDOW_BEFORE: exports.DEFAULT_CONFIG.checkWindowBefore
};
/**
 * 时间常量
 */
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
