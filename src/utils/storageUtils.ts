/**
 * 本地存储工具函数 (TypeScript)
 */
import { STORAGE_KEYS } from './constants.js'
import { mergeRecords } from './recordUtils'
import type { AttendanceRecord } from '../types/core'

// ══════════════════════════════════
// 内存缓存
// ══════════════════════════════════

const _cache: Record<string, unknown> = {
  [STORAGE_KEYS.ATTENDANCE_RECORDS]: null,
}

function hasElectronAPI(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI?.storage
}

// ══════════════════════════════════
// 核心读写
// ══════════════════════════════════

export async function getStorage<T = unknown>(key: string, defaultValue: T): Promise<T> {
  if (_cache[key] !== undefined && _cache[key] !== null) {
    return _cache[key] as T
  }
  try {
    let value: unknown
    if (hasElectronAPI()) {
      value = await window.electronAPI!.storage.get(key, defaultValue)
    } else {
      const raw = localStorage.getItem(key)
      value = raw !== null ? JSON.parse(raw) : defaultValue
    }
    if (key in _cache) {
      _cache[key] = value
    }
    return value as T
  } catch (e) {
    console.error(`[storage] get failed [${key}]:`, e)
    return defaultValue
  }
}

export async function setStorage(key: string, value: unknown): Promise<boolean> {
  try {
    let success: boolean
    if (hasElectronAPI()) {
      success = await window.electronAPI!.storage.set(key, value)
    } else {
      localStorage.setItem(key, JSON.stringify(value))
      success = true
    }
    if (success && key in _cache) {
      _cache[key] = value
    }
    return success
  } catch (e) {
    console.error(`[storage] set failed [${key}]:`, e)
    return false
  }
}

export async function removeStorage(key: string): Promise<boolean> {
  try {
    let success: boolean
    if (hasElectronAPI()) {
      success = await window.electronAPI!.storage.remove(key)
    } else {
      localStorage.removeItem(key)
      success = true
    }
    if (success && key in _cache) {
      _cache[key] = null
    }
    return success
  } catch (e) {
    console.error(`[storage] remove failed [${key}]:`, e)
    return false
  }
}

export function clearCache(key: string): void {
  if (key in _cache) _cache[key] = null
}

export function clearAllCache(): void {
  Object.keys(_cache).forEach(k => { _cache[k] = null })
}

// ══════════════════════════════════
// 业务函数
// ══════════════════════════════════

export async function getAttendanceRecords(): Promise<AttendanceRecord[]> {
  const raw = await getStorage<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE_RECORDS, [])
  return Array.isArray(raw) ? mergeRecords(raw) : []
}

export async function saveAttendanceRecords(records: AttendanceRecord[]): Promise<boolean> {
  if (!Array.isArray(records)) {
    console.warn('[storage] saveAttendanceRecords: not an array')
    return false
  }
  try {
    const existing = await getStorage<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE_RECORDS, [])
    const combined = Array.isArray(existing) ? [...existing, ...records] : [...records]
    return await setStorage(STORAGE_KEYS.ATTENDANCE_RECORDS, mergeRecords(combined))
  } catch (e) {
    console.error('[storage] saveAttendanceRecords failed:', e)
    return await setStorage(STORAGE_KEYS.ATTENDANCE_RECORDS, mergeRecords(records))
  }
}

export async function overwriteAttendanceRecords(records: AttendanceRecord[]): Promise<boolean> {
  if (!Array.isArray(records)) {
    console.warn('[storage] overwriteAttendanceRecords: not an array')
    return false
  }
  const clean = mergeRecords(records)
  const key = STORAGE_KEYS.ATTENDANCE_RECORDS
  try {
    let success: boolean
    if (hasElectronAPI()) {
      success = await window.electronAPI!.storage.overwrite(key, clean)
    } else {
      localStorage.setItem(key, JSON.stringify(clean))
      success = true
    }
    if (success && key in _cache) {
      _cache[key] = clean
    }
    return success
  } catch (e) {
    console.error('[storage] overwriteAttendanceRecords failed:', e)
    return false
  }
}
