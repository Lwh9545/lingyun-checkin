/**
 * 日期时间工具函数（TypeScript 版本）
 */

import { TIME } from './types';

/**
 * 获取今日日期字符串 YYYY-MM-DD
 */
export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化时间为 HH:MM
 */
export function formatTimeShort(date: Date = new Date()): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 将 HH:MM 格式时间转换为分钟数
 * @param timeString - HH:MM 格式的时间字符串
 * @returns 分钟数，无效则返回 INVALID_MINUTES
 */
export function timeToMinutes(timeString: string): number {
  if (!timeString || typeof timeString !== 'string') {
    return TIME.INVALID_MINUTES;
  }
  const [h, m] = timeString.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) {
    return TIME.INVALID_MINUTES;
  }
  return h * TIME.MINUTES_PER_HOUR + m;
}

/**
 * 计算目标时间 = 基准时间 + 偏移分钟（自动取模 24h）
 * @param baseTime - HH:MM 格式的基准时间
 * @param offsetMinutes - 偏移分钟数（可正可负）
 * @returns HH:MM 格式的目标时间，无效输入返回 null
 */
export function calculateTargetTime(baseTime: string, offsetMinutes: number): string | null {
  const totalMinutes = timeToMinutes(baseTime);
  if (totalMinutes === TIME.INVALID_MINUTES) {
    return null;
  }
  const result = (totalMinutes + offsetMinutes + TIME.MINUTES_PER_DAY) % TIME.MINUTES_PER_DAY;
  const hours = Math.floor(result / TIME.MINUTES_PER_HOUR).toString().padStart(2, '0');
  const minutes = (result % TIME.MINUTES_PER_HOUR).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 判断当前是否到达目标时间（目标时间后1小时内视为窗口期）
 * @param targetTime - HH:MM 格式的目标时间
 * @returns 是否在打卡窗口期内
 */
export function isTimeToCheck(targetTime: string): boolean {
  if (!targetTime) {
    return false;
  }
  const now = new Date();
  const currentMinutes = now.getHours() * TIME.MINUTES_PER_HOUR + now.getMinutes();
  const targetMinutes = timeToMinutes(targetTime);
  const diff = currentMinutes - targetMinutes;
  return diff >= 0 && diff <= TIME.MINUTES_PER_HOUR;
}

/**
 * 判断当前日期是否为工作日
 * @param workDays - 工作日数组 [0=周日, 1=周一, ..., 6=周六]
 * @returns 是否为工作日
 */
export function isWorkDay(workDays: number[]): boolean {
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
export function isWithinTimeWindow(time1: string, time2: string, windowMinutes: number): boolean {
  const t1 = timeToMinutes(time1);
  const t2 = timeToMinutes(time2);
  if (t1 === TIME.INVALID_MINUTES || t2 === TIME.INVALID_MINUTES) {
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
export function getTimeDifferenceMinutes(time1: string, time2: string): number {
  const t1 = timeToMinutes(time1);
  const t2 = timeToMinutes(time2);
  if (t1 === TIME.INVALID_MINUTES || t2 === TIME.INVALID_MINUTES) {
    return TIME.INVALID_MINUTES;
  }
  return t2 - t1;
}

/**
 * 判断是否在休息时间内
 * @param restStart - 休息开始时间（HH:MM）
 * @param restEnd - 休息结束时间（HH:MM）
 * @returns 当前是否在休息时间内
 */
export function isInRestTime(restStart: string, restEnd: string): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * TIME.MINUTES_PER_HOUR + now.getMinutes();
  const startMinutes = timeToMinutes(restStart);
  const endMinutes = timeToMinutes(restEnd);
  
  if (startMinutes === TIME.INVALID_MINUTES || endMinutes === TIME.INVALID_MINUTES) {
    return false;
  }
  
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}
