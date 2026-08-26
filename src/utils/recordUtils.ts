/**
 * 打卡记录处理工具函数 (TypeScript)
 */
import type { AttendanceRecord, AttendanceStatus } from '../types/core'

export function mergeRecords(records: AttendanceRecord[] | null | undefined): AttendanceRecord[] {
  if (!Array.isArray(records) || records.length === 0) return []

  function pickNewerField(existingVal: string, newVal: string, newerIsRecord: boolean): string {
    if (newVal) {
      return existingVal ? (newerIsRecord ? newVal : existingVal) : newVal
    }
    return existingVal || ''
  }

  const map = new Map<string, AttendanceRecord>()
  for (const record of records) {
    if (!record || !record.date) continue

    const existing = map.get(record.date)
    if (!existing) {
      map.set(record.date, { ...record })
      continue
    }

    const existingTs = existing.timestamp || 0
    const newTs = record.timestamp || 0
    const newerIsRecord = newTs >= existingTs

    map.set(record.date, {
      date: record.date,
      checkIn: pickNewerField(existing.checkIn, record.checkIn, newerIsRecord),
      checkOut: pickNewerField(existing.checkOut, record.checkOut, newerIsRecord),
      duration: pickNewerField(existing.duration, record.duration, newerIsRecord),
      status: (newerIsRecord ? (record.status || existing.status) : (existing.status || record.status)) as AttendanceStatus,
      timestamp: Math.max(existingTs, newTs)
    })
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export function isValidRecord(record: unknown): record is AttendanceRecord {
  return !!(record && typeof record === 'object' && record !== null && 'date' in record && typeof (record as AttendanceRecord).date === 'string' && (record as AttendanceRecord).date.length > 0)
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
