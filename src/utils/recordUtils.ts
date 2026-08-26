/**
 * 打卡记录处理工具函数 (TypeScript)
 */
import type { AttendanceRecord, AttendanceStatus } from '../types/core'

/**
 * mergeRecords 单一规范源：shared/recordMerger.js（CommonJS，主进程 require + 渲染进程 import 共用）
 * 此处仅做类型化 re-export，禁止再实现第二份逻辑（FW-001 落地）。
 */
export { mergeRecords } from '../../shared/recordMerger.js'

export function isValidRecord(record: unknown): record is AttendanceRecord {
  if (!record || typeof record !== 'object' || record === null) return false
  if (!('date' in record)) return false
  return typeof record.date === 'string' && record.date.length > 0
}

export function findRecordByDate(records: AttendanceRecord[], date: string): AttendanceRecord | undefined {
  if (!Array.isArray(records) || !date) return undefined
  return records.find(r => r.date === date)
}

export function updateRecordByDate(records: AttendanceRecord[], date: string, updates: Partial<AttendanceRecord>): AttendanceRecord[] {
  if (!Array.isArray(records)) return []
  const now = Date.now()

  const result = records.map(r => {
    if (r.date !== date) return r
    return { ...r, ...updates, timestamp: now }
  })

  if (!result.some(r => r.date === date)) {
    result.push({ date, timestamp: now, checkIn: '', checkOut: '', duration: '', status: 'normal', ...updates })
  }

  return mergeRecords(result)
}

export function removeRecordByDate(records: AttendanceRecord[], date: string): AttendanceRecord[] {
  if (!Array.isArray(records) || !date) return records || []
  return records.filter(r => r.date !== date)
}

export function getRecordsStats(records: AttendanceRecord[]): { total: number; checkedIn: number; completed: number; withDuration: number } {
  const validRecords = Array.isArray(records) ? records.filter(isValidRecord) : []
  return {
    total: validRecords.length,
    checkedIn: validRecords.filter(r => r.checkIn).length,
    completed: validRecords.filter(r => r.checkIn && r.checkOut).length,
    withDuration: validRecords.filter(r => r.duration).length
  }
}
