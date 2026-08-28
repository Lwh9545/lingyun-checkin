/** 本地存储：electron 通道优先，失败降级 localStorage */
import { STORAGE_KEYS } from './constants.js'
import { mergeRecords } from './recordUtils'
import { createLogger } from './logger'
import type { AttendanceRecord } from '../types/core'

const log = createLogger('storage')
const _cache: Record<string, unknown> = { [STORAGE_KEYS.ATTENDANCE_RECORDS]: null }
const hasElectronAPI = (): boolean => typeof window !== 'undefined' && !!window.electronAPI?.storage

export async function getStorage<T = unknown>(key: string, defaultValue: T): Promise<T> {
  if (_cache[key] !== undefined && _cache[key] !== null) return _cache[key] as T
  try {
    let value: unknown
    let usedElectron = false
    if (hasElectronAPI()) {
      try { value = await window.electronAPI!.storage.get(key, defaultValue); usedElectron = true }
      catch (eIpc) { log.warn(`[storage] electron.get(${key}) fallback:`, eIpc) }
    }
    if (!usedElectron) {
      const raw = localStorage.getItem(key)
      value = raw !== null ? JSON.parse(raw) : defaultValue
    }
    if (key in _cache) _cache[key] = value
    return value as T
  } catch (e) {
    log.error(`[storage] get failed [${key}]:`, e)
    return defaultValue
  }
}

export async function setStorage(key: string, value: unknown): Promise<boolean> {
  try {
    let success = false
    if (hasElectronAPI()) {
      try { success = await window.electronAPI!.storage.set(key, value) }
      catch (eIpc) { log.warn(`[storage] electron.set(${key}) fallback:`, eIpc) }
      if (!success) { localStorage.setItem(key, JSON.stringify(value)); success = true }
    } else {
      localStorage.setItem(key, JSON.stringify(value))
      success = true
    }
    if (success && key in _cache) _cache[key] = value
    return success
  } catch (e) {
    if (key in _cache) _cache[key] = value
    log.error(`[storage] set failed [${key}]:`, e)
    return false
  }
}

export async function removeStorage(key: string): Promise<boolean> {
  try {
    let success = false
    if (hasElectronAPI()) {
      try { success = await window.electronAPI!.storage.remove(key) }
      catch (eIpc) { log.warn(`[storage] electron.remove(${key}) fallback:`, eIpc) }
      try { localStorage.removeItem(key) } catch (e) { log.warn(`[storage] localStorage.remove failed (privacy mode / quota): ${key}`, e.message); }
      if (!success) success = true
    } else {
      localStorage.removeItem(key)
      success = true
    }
    if (success && key in _cache) _cache[key] = null
    return success
  } catch (e) {
    log.error(`[storage] remove failed [${key}]:`, e)
    return false
  }
}

// ═
// 业务函数
// ═

export async function getAttendanceRecords(): Promise<AttendanceRecord[]> {
  const raw = await getStorage<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE_RECORDS, [])
  return Array.isArray(raw) ? mergeRecords(raw) : []
}

export async function saveAttendanceRecords(records: AttendanceRecord[]): Promise<boolean> {
  if (!Array.isArray(records)) {
    log.warn('[storage] saveAttendanceRecords: not an array')
    return false
  }
  try {
    const existing = await getStorage<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE_RECORDS, [])
    const combined = Array.isArray(existing) ? [...existing, ...records] : [...records]
    return await setStorage(STORAGE_KEYS.ATTENDANCE_RECORDS, mergeRecords(combined))
  } catch (e) {
    log.error('[storage] saveAttendanceRecords failed:', e)
    return await setStorage(STORAGE_KEYS.ATTENDANCE_RECORDS, mergeRecords(records))
  }
}

export async function overwriteAttendanceRecords(records: AttendanceRecord[]): Promise<boolean> {
  if (!Array.isArray(records)) {
    log.warn('[storage] overwriteAttendanceRecords: not an array')
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
    log.error('[storage] overwriteAttendanceRecords failed:', e)
    return false
  }
}
