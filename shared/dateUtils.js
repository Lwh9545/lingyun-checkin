"use strict";
/**
 * 日期时间工具函数（TypeScript 版本）
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTodayString = getTodayString;
exports.formatTimeShort = formatTimeShort;
exports.timeToMinutes = timeToMinutes;
exports.calculateTargetTime = calculateTargetTime;
exports.isTimeToCheck = isTimeToCheck;
exports.isWorkDay = isWorkDay;
exports.isWithinTimeWindow = isWithinTimeWindow;
exports.getTimeDifferenceMinutes = getTimeDifferenceMinutes;
exports.isInRestTime = isInRestTime;
const types_1 = require("./types");
/**
 * 获取今日日期字符串 YYYY-MM-DD
 */
function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}
/**
 * 格式化时间为 HH:MM
 */
function formatTimeShort(date = new Date()) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}
/**
 * 将 HH:MM 格式时间转换为分钟数
 * @param timeString - HH:MM 格式的时间字符串
 * @returns 分钟数，无效则返回 INVALID_MINUTES
 */
function timeToMinutes(timeString) {
    if (!timeString || typeof timeString !== 'string') {
        return types_1.TIME.INVALID_MINUTES;
    }
    const [h, m] = timeString.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) {
        return types_1.TIME.INVALID_MINUTES;
    }
    return h * types_1.TIME.MINUTES_PER_HOUR + m;
}
/**
 * 计算目标时间 = 基准时间 + 偏移分钟（自动取模 24h）
 * @param baseTime - HH:MM 格式的基准时间
 * @param offsetMinutes - 偏移分钟数（可正可负）
 * @returns HH:MM 格式的目标时间，无效输入返回 null
 */
function calculateTargetTime(baseTime, offsetMinutes) {
    const totalMinutes = timeToMinutes(baseTime);
    if (totalMinutes === types_1.TIME.INVALID_MINUTES) {
        return null;
    }
    const result = (totalMinutes + offsetMinutes + types_1.TIME.MINUTES_PER_DAY) % types_1.TIME.MINUTES_PER_DAY;
    const hours = Math.floor(result / types_1.TIME.MINUTES_PER_HOUR).toString().padStart(2, '0');
    const minutes = (result % types_1.TIME.MINUTES_PER_HOUR).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}
/**
 * 判断当前是否到达目标时间（目标时间后1小时内视为窗口期）
 * @param targetTime - HH:MM 格式的目标时间
 * @returns 是否在打卡窗口期内
 */
function isTimeToCheck(targetTime) {
    if (!targetTime) {
        return false;
    }
    const now = new Date();
    const currentMinutes = now.getHours() * types_1.TIME.MINUTES_PER_HOUR + now.getMinutes();
    const targetMinutes = timeToMinutes(targetTime);
    const diff = currentMinutes - targetMinutes;
    return diff >= 0 && diff <= types_1.TIME.MINUTES_PER_HOUR;
}
/**
 * 判断当前日期是否为工作日
 * @param workDays - 工作日数组 [0=周日, 1=周一, ..., 6=周六]
 * @returns 是否为工作日
 */
function isWorkDay(workDays) {
    if (!workDays || !Array.isArray(workDays)) {
        return true;
    }
    return workDays.includes(new Date().getDay());
}
/**
 * 判断两个时间是否在指定分钟差内
 * @param time1 - 第一个时间（HH:MM）
 * @param time2 - 第二个时间（HH:MM）
 * @param windowMinutes - 时间窗口（分钟）
 * @returns 是否在时间窗口内
 */
function isWithinTimeWindow(time1, time2, windowMinutes) {
    const t1 = timeToMinutes(time1);
    const t2 = timeToMinutes(time2);
    if (t1 === types_1.TIME.INVALID_MINUTES || t2 === types_1.TIME.INVALID_MINUTES) {
        return false;
    }
    const diff = Math.abs(t1 - t2);
    return diff <= windowMinutes;
}
/**
 * 计算两个时间之间的分钟差
 * @param time1 - 开始时间（HH:MM）
 * @param time2 - 结束时间（HH:MM）
 * @returns 分钟差（可为负数表示跨天）
 */
function getTimeDifferenceMinutes(time1, time2) {
    const t1 = timeToMinutes(time1);
    const t2 = timeToMinutes(time2);
    if (t1 === types_1.TIME.INVALID_MINUTES || t2 === types_1.TIME.INVALID_MINUTES) {
        return types_1.TIME.INVALID_MINUTES;
    }
    return t2 - t1;
}
/**
 * 判断是否在休息时间内
 * @param restStart - 休息开始时间（HH:MM）
 * @param restEnd - 休息结束时间（HH:MM）
 * @returns 当前是否在休息时间内
 */
function isInRestTime(restStart, restEnd) {
    const now = new Date();
    const currentMinutes = now.getHours() * types_1.TIME.MINUTES_PER_HOUR + now.getMinutes();
    const startMinutes = timeToMinutes(restStart);
    const endMinutes = timeToMinutes(restEnd);
    if (startMinutes === types_1.TIME.INVALID_MINUTES || endMinutes === types_1.TIME.INVALID_MINUTES) {
        return false;
    }
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}
