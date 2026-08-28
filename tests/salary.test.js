// 工资核对器·特征测试先行：加班三分类 + 加班费计算（数据→应得工资）
import { describe, it, expect } from 'vitest'
import { classifyDay, calculateOvertimePay, calculateOvertimeDetail, DEFAULT_RATES, formatPay } from '../src/utils/salaryUtils'

// 法定分类器注入桩：手工指定每日类型
const stubClassifier = (map) => (date) => map[date] || 'workday'

describe('classifyDay（三分类：工作日/休息日/法定节假日）', () => {
  it('法定节假日优先于休息日（调休补班的周末上班日=工作日）', () => {
    expect(classifyDay('2026-10-01', { isHoliday: true, isRestDay: true })).toBe('holiday')
    expect(classifyDay('2026-08-29', { isHoliday: false, isRestDay: true })).toBe('restday')
    expect(classifyDay('2026-08-28', { isHoliday: false, isRestDay: false })).toBe('workday')
  })
})

describe('DEFAULT_RATES（法定倍率默认值契约）', () => {
  it('工作日 1.5 / 休息日 2 / 法定节假日 3', () => {
    expect(DEFAULT_RATES).toEqual({ workday: 1.5, restday: 2, holiday: 3 })
  })
})

describe('calculateOvertimePay（加班费核算核心）', () => {
  const recs = [
    // 工作日加班 1 小时（9h）
    { date: '2026-08-26', checkIn: '09:00', checkOut: '19:00', duration: '9小时0分钟', status: 'overtime' },
    // 休息日加班 2 小时
    { date: '2026-08-30', checkIn: '10:00', checkOut: '13:00', duration: '2小时30分钟', status: 'overtime' },
    // 法定节假日加班 1 小时
    { date: '2026-10-01', checkIn: '09:00', checkOut: '11:00', duration: '1小时30分钟', status: 'overtime' },
    // 正常 8 小时不算加班
    { date: '2026-08-25', checkIn: '09:00', checkOut: '18:00', duration: '8小时0分钟', status: 'normal' },
    // 请假日不算
    { date: '2026-08-27', status: 'leave', leaveType: 'sick', duration: '请假' }
  ]
  const classifier = stubClassifier({
    '2026-08-26': 'workday', '2026-08-30': 'restday', '2026-10-01': 'holiday', '2026-08-25': 'workday'
  })
  const cfg = { hourlyWage: 50 }

  it('按标准 8 小时基准计算各类加班分钟（duration 超出部分）', () => {
    const r = calculateOvertimePay(recs, cfg, classifier)
    expect(r.workdayMinutes).toBe(60)    // 9h - 8h = 1h
    expect(r.restdayMinutes).toBe(150)   // 休息日全额计薪（2.5h）
    expect(r.holidayMinutes).toBe(90)    // 节假日全额计薪（1.5h）
  })
  it('金额 = 分钟/60 × 时薪 × 倍率，总额为三项之和', () => {
    const r = calculateOvertimePay(recs, cfg, classifier)
    // 1h×50×1.5=75；2.5h×50×2=250；1.5h×50×3=225
    expect(r.totalPay).toBe(550)
  })
  it('未配置时薪 → totalPay=null 但分类统计仍可用', () => {
    const r = calculateOvertimePay(recs, null, classifier)
    expect(r.totalPay).toBeNull()
    expect(r.workdayMinutes).toBe(60)
  })
  it('空记录 → 全零不抛错', () => {
    const r = calculateOvertimePay([], cfg, classifier)
    expect(r.totalPay).toBe(0)
  })
})

describe('calculateOvertimeDetail（逐日对账明细）', () => {
  const recs = [
    { date: '2026-08-26', checkIn: '09:00', checkOut: '19:00', duration: '9小时0分钟', status: 'overtime' },
    { date: '2026-08-25', checkIn: '09:00', checkOut: '18:00', duration: '8小时0分钟', status: 'normal' },
    { date: '2026-08-30', checkIn: '10:00', checkOut: '13:00', duration: '2小时30分钟', status: 'overtime' }
  ]
  const classifier = stubClassifier({ '2026-08-26': 'workday', '2026-08-30': 'restday' })

  it('只列计薪分钟>0的日子，按日期升序，含类型与逐日金额', () => {
    const r = calculateOvertimeDetail(recs, { hourlyWage: 50 }, classifier)
    expect(r.items.map(i => i.date)).toEqual(['2026-08-26', '2026-08-30'])
    expect(r.items[0]).toMatchObject({ kind: 'workday', minutes: 60, pay: 75 })   // 1h×50×1.5
    expect(r.items[1]).toMatchObject({ kind: 'restday', minutes: 150, pay: 250 }) // 2.5h×50×2
  })
  it('汇总分钟与 totalPay 与 calculateOvertimePay 完全一致', () => {
    const d = calculateOvertimeDetail(recs, { hourlyWage: 50 }, classifier)
    const p = calculateOvertimePay(recs, { hourlyWage: 50 }, classifier)
    expect(d.workdayMinutes).toBe(p.workdayMinutes)
    expect(d.restdayMinutes).toBe(p.restdayMinutes)
    expect(d.holidayMinutes).toBe(p.holidayMinutes)
    expect(d.totalPay).toBe(p.totalPay)
  })
  it('未配置时薪 → pay=null，分钟统计照常', () => {
    const r = calculateOvertimeDetail(recs, null, classifier)
    expect(r.items[0].pay).toBeNull()
    expect(r.items[0].minutes).toBe(60)
    expect(r.totalPay).toBeNull()
  })
})

describe('formatPay（金额显示契约）', () => {
  it('数字→两位小数；null→--', () => {
    expect(formatPay(550)).toBe('¥550.00')
    expect(formatPay(null)).toBe('--')
  })
})
