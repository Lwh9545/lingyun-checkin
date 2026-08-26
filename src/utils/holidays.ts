/**
 * 中国法定节假日数据 (TypeScript)
 * 数据源：内置 fallback + timor.tech 在线 API
 */
import type { HolidayStatus } from '../types/core'

// ═══════════════════════════════════════════════
// 内置兜底数据
// ═══════════════════════════════════════════════

const BUILTIN_HOLIDAYS: Record<string, string> = {
  // 2025
  '2025-01-01': '元旦',
  '2025-01-28': '春节', '2025-01-29': '春节', '2025-01-30': '春节', '2025-01-31': '春节',
  '2025-02-01': '春节', '2025-02-02': '春节', '2025-02-03': '春节', '2025-02-04': '春节',
  '2025-04-04': '清明', '2025-04-05': '清明', '2025-04-06': '清明',
  '2025-05-01': '劳动节', '2025-05-02': '劳动节', '2025-05-03': '劳动节', '2025-05-04': '劳动节', '2025-05-05': '劳动节',
  '2025-05-31': '端午', '2025-06-01': '端午', '2025-06-02': '端午',
  '2025-10-01': '国庆中秋', '2025-10-02': '国庆中秋', '2025-10-03': '国庆中秋', '2025-10-04': '国庆中秋',
  '2025-10-05': '国庆中秋', '2025-10-06': '国庆中秋', '2025-10-07': '国庆中秋', '2025-10-08': '国庆中秋',
  // 2026
  '2026-01-01': '元旦', '2026-01-02': '元旦', '2026-01-03': '元旦',
  '2026-02-16': '春节', '2026-02-17': '春节', '2026-02-18': '春节', '2026-02-19': '春节',
  '2026-02-20': '春节', '2026-02-21': '春节', '2026-02-22': '春节', '2026-02-23': '春节', '2026-02-24': '春节',
  '2026-04-04': '清明', '2026-04-05': '清明', '2026-04-06': '清明',
  '2026-05-01': '劳动节', '2026-05-02': '劳动节', '2026-05-03': '劳动节', '2026-05-04': '劳动节', '2026-05-05': '劳动节',
  '2026-06-19': '端午', '2026-06-20': '端午', '2026-06-21': '端午',
  '2026-10-01': '国庆', '2026-10-02': '国庆', '2026-10-03': '国庆', '2026-10-04': '国庆',
  '2026-10-05': '国庆', '2026-10-06': '国庆', '2026-10-07': '国庆', '2026-10-08': '国庆',
}

const BUILTIN_WORK_ADJUSTMENTS: Record<string, boolean> = {
  '2025-01-26': true, '2025-02-08': true, '2025-04-13': true, '2025-09-28': true, '2025-10-11': true,
  '2026-02-15': true, '2026-02-28': true, '2026-04-11': true, '2026-05-09': true, '2026-09-27': true, '2026-10-10': true,
}

// ═══════════════════════════════════════════════
// 运行时状态
// ═══════════════════════════════════════════════

let _holidays: Record<string, string> = { ...BUILTIN_HOLIDAYS }
let _workAdjustments: Record<string, boolean> = { ...BUILTIN_WORK_ADJUSTMENTS }
let _fetchState: HolidayStatus['state'] = 'idle'
let _lastFetchYear: number | null = null
let _lastFetchTime: number | null = null

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 天
const API_BASE = 'https://timor.tech/api/holiday'
const FETCH_TIMEOUT_MS = 8000

// ═══════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════

/** timor.tech API 返回的单条节假日信息 */
interface TimorHolidayInfo {
  holiday: boolean
  name: string
  wage: number
  date: string
}

/** timor.tech API 响应结构 */
interface TimorApiResponse {
  code: number
  holiday?: Record<string, TimorHolidayInfo>
}

async function fetchYearFromAPI(year: number): Promise<{ holidays: Record<string, string>; adjustments: Record<string, boolean> } | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const resp = await fetch(`${API_BASE}/year/${year}`, { signal: controller.signal })
    clearTimeout(timeout)
    if (!resp.ok) return null

    const json: TimorApiResponse = await resp.json()
    if (json.code !== 0) return null

    const holidays: Record<string, string> = {}
    const adjustments: Record<string, boolean> = {}

    for (const [key, info] of Object.entries(json.holiday || {})) {
      const dateStr = key.length === 5 ? `${year}-${key}` : key
      if (info.holiday) {
        holidays[dateStr] = info.name || '节假日'
      }
      if (info.wage && info.date) {
        const rawDate: string = info.date
        const fullDate = rawDate.includes('-') && rawDate.length === 10
          ? rawDate
          : `${year}-${rawDate}`
        const d = new Date(fullDate)
        if (!isNaN(d.getTime())) {
          const dow = d.getDay()
          if (dow === 0 || dow === 6) {
            adjustments[fullDate] = true
          }
        }
      }
    }

    return { holidays, adjustments }
  } catch {
    return null
  }
}

export async function refreshHolidayData(): Promise<void> {
  if (_fetchState === 'loading') return
  _fetchState = 'loading'

  const currentYear = new Date().getFullYear()
  try {
    const results = await Promise.allSettled([
      fetchYearFromAPI(currentYear),
      fetchYearFromAPI(currentYear + 1)
    ])

    let anySuccess = false
    const merged = {
      holidays: { ...BUILTIN_HOLIDAYS },
      adjustments: { ...BUILTIN_WORK_ADJUSTMENTS }
    }

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        anySuccess = true
        Object.assign(merged.holidays, result.value.holidays)
        Object.assign(merged.adjustments, result.value.adjustments)
      }
    }

    if (anySuccess) {
      _holidays = merged.holidays
      _workAdjustments = merged.adjustments
      _lastFetchYear = currentYear
      _lastFetchTime = Date.now()
      _fetchState = 'success'

      try {
        localStorage.setItem('holidays_cache', JSON.stringify({
          holidays: _holidays, adjustments: _workAdjustments,
          year: currentYear, time: _lastFetchTime
        }))
      } catch { /* localStorage 不可用 */ }
    } else {
      _fetchState = 'error'
    }
  } catch {
    _fetchState = 'error'
  }
}

export function loadCachedHolidays(): boolean {
  try {
    const raw = localStorage.getItem('holidays_cache')
    if (!raw) return false

    const cache = JSON.parse(raw)
    const cacheAge = Date.now() - (cache.time || 0)
    if (cacheAge > CACHE_TTL_MS) return false

    if (cache.holidays && cache.adjustments) {
      _holidays = { ...BUILTIN_HOLIDAYS, ...cache.holidays }
      _workAdjustments = { ...BUILTIN_WORK_ADJUSTMENTS, ...cache.adjustments }
      _lastFetchYear = cache.year
      _lastFetchTime = cache.time
      _fetchState = 'success'
      return true
    }
  } catch { /* ignore */ }
  return false
}

export function getHolidayStatus(): HolidayStatus {
  return {
    state: _fetchState,
    lastFetchYear: _lastFetchYear,
    lastFetchTime: _lastFetchTime,
    totalHolidays: Object.keys(_holidays).length,
    totalAdjustments: Object.keys(_workAdjustments).length
  }
}

// ═══════════════════════════════════════════════
// 查询
// ═══════════════════════════════════════════════

export function getHolidayName(dateStr: string): string | null {
  return _holidays[dateStr] || null
}

export function isWorkAdjustment(dateStr: string): boolean {
  return !!_workAdjustments[dateStr]
}

export function isRestDay(dateStr: string, dateObj?: Date): boolean {
  const d = dateObj || new Date(
    Number(dateStr.slice(0, 4)),
    Number(dateStr.slice(5, 7)) - 1,
    Number(dateStr.slice(8, 10))
  )
  const dow = d.getDay()
  const isWeekend = dow === 0 || dow === 6
  const isHoliday = !!_holidays[dateStr]
  const isMakeUp = !!_workAdjustments[dateStr]
  return (isWeekend || isHoliday) && !isMakeUp
}

export function getHolidayInfo(dateStr: string): { name: string | null; isHoliday: boolean; isMakeUp: boolean } {
  return {
    name: _holidays[dateStr] || null,
    isHoliday: !!_holidays[dateStr],
    isMakeUp: !!_workAdjustments[dateStr]
  }
}

export function getHolidaysYearRange(): string {
  const years = new Set<number>()
  Object.keys(_holidays).forEach(d => years.add(Number(d.slice(0, 4))))
  const sorted = [...years].sort((a, b) => a - b)
  if (sorted.length === 0) return ''
  if (sorted.length === 1) return sorted[0] + ' 年'
  return sorted[0] + '-' + sorted[sorted.length - 1] + ' 年'
}
