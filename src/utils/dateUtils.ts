/**
 * 日期时间工具函数 (TypeScript)
 */
import type { DayInfo } from '../types/core'
import { WEEK_DAYS, TIME } from './constants.js'

export function getTodayString(): string {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

export function formatTime(date: Date = new Date()): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
}

export function formatTimeShort(date: Date = new Date()): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function formatDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function formatDateChinese(date: Date = new Date()): string {
  return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日 ${WEEK_DAYS[date.getDay()].name}`
}

export function getDayName(date: Date = new Date()): string {
  return WEEK_DAYS[date.getDay()].name
}

export function isToday(date: Date | string): boolean {
  const today = new Date()
  const targetDate = typeof date === 'string' ? new Date(normalizeDate(date) || date) : date
  if (isNaN(targetDate.getTime())) return false
  return targetDate.toDateString() === today.toDateString()
}

export function normalizeDate(dateStr: Date | string | null | undefined): string | null {
  if (!dateStr) return null

  if (dateStr instanceof Date) {
    return `${dateStr.getFullYear()}-${String(dateStr.getMonth() + 1).padStart(2, '0')}-${String(dateStr.getDate()).padStart(2, '0')}`
  }

  const now = new Date()
  const currentYear = now.getFullYear()

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  if (/^\d{1,2}-\d{1,2}$/.test(dateStr)) {
    const [month, day] = dateStr.split('-').map(Number)
    return `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/').map(Number)
    if (parts.length === 3) {
      return `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`
    }
  }

  return null
}

export function timeToMinutes(timeString: string | null | undefined): number {
  if (!timeString || typeof timeString !== 'string') return TIME.INVALID_MINUTES
  const [h, m] = timeString.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return TIME.INVALID_MINUTES
  return h * TIME.MINUTES_PER_HOUR + m
}

export function calculateTargetTime(baseTime: string, offsetMinutes: number): string | null {
  const totalMinutes = timeToMinutes(baseTime)
  if (totalMinutes === TIME.INVALID_MINUTES) return null
  const result = (totalMinutes + offsetMinutes + TIME.MINUTES_PER_DAY) % TIME.MINUTES_PER_DAY
  const hours = Math.floor(result / TIME.MINUTES_PER_HOUR).toString().padStart(2, '0')
  const minutes = (result % TIME.MINUTES_PER_HOUR).toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

export function isTimeToCheck(targetTime: string | null): boolean {
  if (!targetTime) return false
  const now = new Date()
  const currentMinutes = now.getHours() * TIME.MINUTES_PER_HOUR + now.getMinutes()
  const targetMinutes = timeToMinutes(targetTime)
  const diff = currentMinutes - targetMinutes
  return diff >= 0 && diff <= TIME.MINUTES_PER_HOUR
}

export function minutesToTime(totalMinutes: number): string {
  if (typeof totalMinutes !== 'number' || totalMinutes < 0) return '00:00'
  const hours = Math.floor(totalMinutes / TIME.MINUTES_PER_HOUR) % TIME.HOURS_PER_DAY
  const minutes = totalMinutes % TIME.MINUTES_PER_HOUR
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function calculateDuration(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return '--'
  const inMinutes = timeToMinutes(checkIn)
  const outMinutes = timeToMinutes(checkOut)
  if (inMinutes === TIME.INVALID_MINUTES || outMinutes === TIME.INVALID_MINUTES) return '--'
  const diff = outMinutes - inMinutes
  if (diff <= 0) return '--'
  const hours = Math.floor(diff / TIME.MINUTES_PER_HOUR)
  const minutes = diff % TIME.MINUTES_PER_HOUR
  return `${hours}小时${minutes}分钟`
}

export function getDayOfWeek(): number {
  return new Date().getDay()
}
