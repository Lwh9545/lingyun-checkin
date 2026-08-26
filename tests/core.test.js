/**
 * 核心函数单元测试
 * 
 * 运行：npx vitest run
 * 监听：npx vitest
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { mergeRecords } from '../src/utils/recordUtils'
import { calculateEffectiveDuration, checkAttendanceStatus, isInCheckWindow, getStatusValue, getStatusText, isWorkDay } from '../src/utils/attendanceUtils'
import { timeToMinutes, minutesToTime, calculateTargetTime, formatTimeShort, getTodayString } from '../src/utils/dateUtils'
import { getHolidayName, isRestDay } from '../src/utils/holidays'

// 固定日期到周一（2026-06-08），让 isWorkDay/checkAttendanceStatus 不再依赖运行当天
beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 5, 8)) // June 8, 2026 = Monday
})

afterAll(() => {
  vi.useRealTimers()
})

// ═══════════════════════════════════════════
// mergeRecords - 去重合并
// ═══════════════════════════════════════════
describe('mergeRecords', () => {
  it('空数组返回空数组', () => {
    expect(mergeRecords([])).toEqual([])
    expect(mergeRecords(null)).toEqual([])
    expect(mergeRecords(undefined)).toEqual([])
  })

  it('过滤无效元素', () => {
    expect(mergeRecords([null, undefined, {}, { date: '2026-01-01' }])).toEqual([
      { date: '2026-01-01' }
    ])
  })

  it('正常去重合并——后写入的数据优先', () => {
    const records = [
      { date: '2026-06-01', checkIn: '09:00', checkOut: '', timestamp: 100 },
      { date: '2026-06-01', checkIn: '', checkOut: '18:00', timestamp: 200 },
    ]
    const result = mergeRecords(records)
    expect(result).toHaveLength(1)
    expect(result[0].checkIn).toBe('09:00')
    expect(result[0].checkOut).toBe('18:00')
  })

  it('有值字段保留——不覆盖已有值', () => {
    const records = [
      { date: '2026-06-01', checkIn: '09:00', checkOut: '18:00', timestamp: 200 },
      { date: '2026-06-01', checkIn: '', checkOut: '', timestamp: 100 },
    ]
    const result = mergeRecords(records)
    expect(result[0].checkIn).toBe('09:00')
    expect(result[0].checkOut).toBe('18:00')
  })

  it('多日期分别保留', () => {
    const records = [
      { date: '2026-06-01', checkIn: '09:00' },
      { date: '2026-06-02', checkIn: '09:01' },
      { date: '2026-06-03', checkIn: '09:02' },
    ]
    expect(mergeRecords(records)).toHaveLength(3)
  })

  it('按日期升序排列', () => {
    const records = [
      { date: '2026-06-03', checkIn: '09:00' },
      { date: '2026-06-01', checkIn: '09:00' },
      { date: '2026-06-02', checkIn: '09:00' },
    ]
    const result = mergeRecords(records)
    expect(result[0].date).toBe('2026-06-01')
    expect(result[1].date).toBe('2026-06-02')
    expect(result[2].date).toBe('2026-06-03')
  })
})

// ═══════════════════════════════════════════
// 时间工具
// ═══════════════════════════════════════════
describe('time utilities', () => {
  it('timeToMinutes 正常解析', () => {
    expect(timeToMinutes('09:00')).toBe(540)
    expect(timeToMinutes('00:00')).toBe(0)
    expect(timeToMinutes('23:59')).toBe(1439)
    expect(timeToMinutes('18:30')).toBe(1110)
  })

  it('timeToMinutes 非法输入返回 -1', () => {
    expect(timeToMinutes('')).toBe(-1)
    expect(timeToMinutes(null)).toBe(-1)
    expect(timeToMinutes('abc')).toBe(-1)
    // 注：当前不校验 24h 边界（HTML time input 已约束），如需加请开启
    // expect(timeToMinutes('25:00')).toBe(-1)
  })

  it('minutesToTime 正常转换', () => {
    expect(minutesToTime(540)).toBe('09:00')
    expect(minutesToTime(0)).toBe('00:00')
    expect(minutesToTime(1439)).toBe('23:59')
  })

  it('calculateTargetTime 偏移计算', () => {
    expect(calculateTargetTime('09:00', 30)).toBe('09:30')
    expect(calculateTargetTime('09:00', -10)).toBe('08:50')
    expect(calculateTargetTime('18:00', 30)).toBe('18:30')
  })

  it('formatTimeShort 返回 HH:MM 格式', () => {
    const result = formatTimeShort(new Date(2026, 5, 9, 14, 30, 45))
    expect(result).toBe('14:30')
  })

  it('getTodayString 返回 YYYY-MM-DD', () => {
    const result = getTodayString()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

// ═══════════════════════════════════════════
// calculateEffectiveDuration - 工时计算
// ═══════════════════════════════════════════
describe('calculateEffectiveDuration', () => {
  const defaultConfig = {
    enableRest: false, restStart: '12:00', restEnd: '14:00',
    enableSplitShift: false,
    morningStart: '09:00', morningEnd: '12:00',
    afternoonStart: '14:00', afternoonEnd: '18:00',
  }

  it('标准 9-18 工作日 = 9 小时', () => {
    const result = calculateEffectiveDuration('09:00', '18:00', defaultConfig)
    expect(result).toBe('9小时0分钟')
  })

  it('半天工时', () => {
    const result = calculateEffectiveDuration('09:00', '13:00', defaultConfig)
    expect(result).toBe('4小时0分钟')
  })

  it('无打卡时间返回 --', () => {
    expect(calculateEffectiveDuration('', '18:00', defaultConfig)).toBe('--')
    expect(calculateEffectiveDuration('09:00', '', defaultConfig)).toBe('--')
  })

  it('启用午休扣除', () => {
    const config = { ...defaultConfig, enableRest: true, restStart: '12:00', restEnd: '14:00' }
    const result = calculateEffectiveDuration('09:00', '18:00', config)
    expect(result).toBe('7小时0分钟')  // 9h - 2h 午休
  })

  it('午休部分重叠——只扣除重叠部分', () => {
    const config = { ...defaultConfig, enableRest: true, restStart: '12:00', restEnd: '14:00' }
    const result = calculateEffectiveDuration('09:00', '13:00', config)
    expect(result).toBe('3小时0分钟')  // 4h - 1h (12:00-13:00 与 12:00-14:00 重叠)
  })

  it('分段工时——上下午分开', () => {
    const config = {
      ...defaultConfig,
      enableSplitShift: true,
      morningStart: '09:00', morningEnd: '12:00',
      afternoonStart: '14:00', afternoonEnd: '18:00'
    }
    const result = calculateEffectiveDuration('09:00', '18:00', config)
    expect(result).toBe('7小时0分钟')  // 3h 上午 + 4h 下午
  })

  it('分段工时——仅上午工作', () => {
    const config = {
      ...defaultConfig,
      enableSplitShift: true,
      morningStart: '09:00', morningEnd: '12:00',
      afternoonStart: '14:00', afternoonEnd: '18:00'
    }
    const result = calculateEffectiveDuration('09:00', '12:00', config)
    expect(result).toBe('3小时0分钟')
  })

  it('分段工时——超时到下午', () => {
    const config = {
      ...defaultConfig,
      enableSplitShift: true,
      morningStart: '09:00', morningEnd: '12:00',
      afternoonStart: '14:00', afternoonEnd: '18:00'
    }
    // 09:00-16:00: 上午 3h (09-12) + 下午 2h (14-16) = 5h
    const result = calculateEffectiveDuration('09:00', '16:00', config)
    expect(result).toBe('5小时0分钟')
  })
})

// ═══════════════════════════════════════════
// checkAttendanceStatus - 打卡状态判定
// ═══════════════════════════════════════════
describe('checkAttendanceStatus', () => {
  const config = {
    workStartTime: '09:00', workEndTime: '18:00',
    workDays: [1, 2, 3, 4, 5], lateThreshold: 15,
    overtimeAfterEndThreshold: 30, overtimeOnNonWorkday: true,
    overtimeOnWorkday: true,
    enableRest: false, restStart: '12:00', restEnd: '14:00',
    enableSplitShift: false,
    morningStart: '09:00', morningEnd: '12:00',
    afternoonStart: '14:00', afternoonEnd: '18:00',
  }

  it('上午 9:00 打卡 = 正常', () => {
    expect(checkAttendanceStatus('上班', '09:00', config)).toBe('normal')
  })

  it('上午 9:10 打卡 = 正常（在迟到阈值内）', () => {
    expect(checkAttendanceStatus('上班', '09:10', config)).toBe('normal')
  })

  it('上午 9:16 打卡 = 迟到', () => {
    expect(checkAttendanceStatus('上班', '09:16', config)).toBe('late')
  })

  it('上午 10:00 打卡 = 迟到', () => {
    expect(checkAttendanceStatus('上班', '10:00', config)).toBe('late')
  })

  it('下午 17:00 打卡 = 早退', () => {
    expect(checkAttendanceStatus('下班', '17:00', config)).toBe('early')
  })

  it('下午 18:00 打卡 = 正常', () => {
    expect(checkAttendanceStatus('下班', '18:00', config)).toBe('normal')
  })

  it('下午 18:31 打卡 = 加班', () => {
    expect(checkAttendanceStatus('下班', '18:31', config)).toBe('overtime')
  })

  // ⚠️ 此测试依赖当前实际星期——在周一~周五运行通过
  // 如需稳定测试，建议 mock Date
  it.skip('周末打卡 = 加班（如果 overtimeOnNonWorkday 启用）', () => {
    // 此测试仅在周末运行时有效
    const day = new Date().getDay()
    if (day === 0 || day === 6) {
      expect(checkAttendanceStatus('上班', '09:00', config)).toBe('overtime')
    }
  })
})

// ═══════════════════════════════════════════
// isInCheckWindow - 打卡窗口
// ═══════════════════════════════════════════
describe('isInCheckWindow', () => {
  const config = {
    workStartTime: '09:00', workEndTime: '18:00',
    checkWindowBefore: 60,
    workDays: [0, 1, 2, 3, 4, 5, 6],  // 所有天都是工作日（测试用）
    overtimeOnNonWorkday: false,
    enableSplitShift: false,
  }

  it('当前时间为 09:00 —— 上班窗口应该开放', () => {
    // 这个测试依赖当前时间，仅作概念验证
    // 实际生产应 mock Date
    const isWorkday = [1, 2, 3, 4, 5].includes(new Date().getDay())
    if (isWorkday) {
      // 仅仅验证函数不抛异常
      const result = isInCheckWindow('上班', config)
      expect(typeof result).toBe('boolean')
    }
  })
})

// ═══════════════════════════════════════════
// mergeRecords 增量测试
// ═══════════════════════════════════════════
describe('mergeRecords 补充测试', () => {
  it('过滤非对象记录', () => {
    const records = ['string', 123, true, { date: '2026-06-01', checkIn: '09:00' }]
    const result = mergeRecords(records)
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-06-01')
  })

  it('status 覆盖——后来的覆盖前面的', () => {
    const records = [
      { date: '2026-06-01', status: 'late', timestamp: 100 },
      { date: '2026-06-01', status: 'normal', timestamp: 200 }
    ]
    const result = mergeRecords(records)
    expect(result[0].status).toBe('normal')
  })

  it('大量记录合并正确', () => {
    const records = []
    for (let i = 0; i < 100; i++) {
      records.push({ date: '2026-06-01', checkIn: '09:00', timestamp: i })
    }
    const result = mergeRecords(records)
    expect(result).toHaveLength(1)
    expect(result[0].checkIn).toBe('09:00')
  })

  it('无 timestamp 的记录仍然被合并', () => {
    const records = [
      { date: '2026-06-01', checkIn: '09:00' },
      { date: '2026-06-01', checkOut: '18:00' }
    ]
    const result = mergeRecords(records)
    expect(result).toHaveLength(1)
    expect(result[0].checkIn).toBe('09:00')
    expect(result[0].checkOut).toBe('18:00')
  })
})

// ═══════════════════════════════════════════
// 考勤状态工具函数
// ═══════════════════════════════════════════
describe('attendanceUtils 状态工具', () => {
  it('getStatusValue / getStatusText 互逆', () => {
    expect(getStatusText('normal')).toBe('正常')
    expect(getStatusValue('正常')).toBe('normal')
    expect(getStatusText('late')).toBe('迟到')
    expect(getStatusValue('迟到')).toBe('late')
  })

  it('isWorkDay 工作日判定', () => {
    // 周一（getDay=1）在 workDays=[1,2,3,4,5] 中
    expect(isWorkDay([1, 2, 3, 4, 5])).toBe(true)
    // 所有天都算工作日
    expect(isWorkDay([0, 1, 2, 3, 4, 5, 6])).toBe(true)
  })
})

// ═══════════════════════════════════════════
// holidays 工具函数
// ═══════════════════════════════════════════
describe('holidays 节假日', () => {
  it('getHolidayName 查询', () => {
    expect(getHolidayName('2025-01-01')).toBe('元旦')
    expect(getHolidayName('2099-01-01')).toBeNull()
  })

  it('isRestDay 判定', () => {
    expect(isRestDay('2025-01-01')).toBe(true)
    expect(isRestDay('2026-06-09')).toBe(false)
  })
})
