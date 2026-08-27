// 全面升级·特征测试（step2 先行）：趋势图表数据变换 + 请假类型契约
// 先红后绿：实现位于 src/utils/chartUtils.ts
import { describe, it, expect } from 'vitest'
import { parseDurationToMinutes, buildTrendData, LEAVE_TYPES } from '../src/utils/chartUtils'

describe('parseDurationToMinutes（契约：多种历史格式统一解析）', () => {
  it('解析中文格式 "8小时30分钟" → 510', () => {
    expect(parseDurationToMinutes('8小时30分钟')).toBe(510)
  })
  it('解析简短格式 "8:30" → 510', () => {
    expect(parseDurationToMinutes('8:30')).toBe(510)
  })
  it('解析纯数字 "8.5"（小时）→ 510', () => {
    expect(parseDurationToMinutes('8.5')).toBe(510)
  })
  it('null/空串/未知格式 → 0（不抛错，补全陷阱防御）', () => {
    expect(parseDurationToMinutes(null)).toBe(0)
    expect(parseDurationToMinutes('')).toBe(0)
    expect(parseDurationToMinutes('请假')).toBe(0)
  })
})

describe('buildTrendData（近 N 天趋势，空数据零崩溃）', () => {
  it('空记录数组 → 全 0 序列，天数正确', () => {
    const d = buildTrendData([], 7)
    expect(d.labels).toHaveLength(7)
    expect(d.minutes.every(m => m === 0)).toBe(true)
  })
  it('请假记录 → 当日工时 0 且标记 leave', () => {
    const rec = [{ date: '2026-08-28', status: 'leave', leaveType: 'sick', duration: null }]
    const d = buildTrendData(rec, 7)
    expect(d.leaveFlags.at(-1)).toBe('sick')
  })
  it('正常记录解析为分钟', () => {
    const rec = [{ date: '2026-08-28', checkIn: '09:00', checkOut: '18:00', duration: '8小时30分钟' }]
    const d = buildTrendData(rec, 7)
    expect(d.minutes.at(-1)).toBe(510)
  })
})

describe('LEAVE_TYPES（请假类型契约）', () => {
  it('四种法定类型：年假/病假/事假/调休，含中文标签', () => {
    expect(LEAVE_TYPES.map(t => t.value)).toEqual(['annual', 'sick', 'personal', 'compensatory'])
    expect(LEAVE_TYPES[0].label).toBe('年假')
  })
})
