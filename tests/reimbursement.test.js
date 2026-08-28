/**
 * 费用报销特征测试
 * 金标准：金额存「分」整数 → 0.1+0.2=30 分精确
 */
import { describe, it, expect } from 'vitest'
import {
  CATEGORY_META, CATEGORY_ORDER,
  yuanToCents, centsToYuan, formatYuan,
  sanitizeRemark, genId,
  sumByCategory, totalCents, countByCategory,
  topCategory, monthRecords,
} from '../src/utils/reimbursementUtils'

describe('金额精度（分存储）', () => {
  it('0.1+0.2 = 30 分精确，无浮点尾差', () => {
    expect(yuanToCents(0.1) + yuanToCents(0.2)).toBe(30)
    expect(centsToYuan(30)).toBe(0.3)
    expect(formatYuan(30)).toBe('¥0.30')
  })
  it('8.5 → 850 分；非法值 → 0 / ¥0.00', () => {
    expect(yuanToCents(8.5)).toBe(850)
    expect(yuanToCents(null)).toBe(0)
    expect(formatYuan(NaN)).toBe('¥0.00')
  })
})

describe('5 大分类元数据', () => {
  it('5 类齐全（餐饮/交通/住宿/办公/其他），color 限 4 色系', () => {
    expect(Object.keys(CATEGORY_META)).toHaveLength(5)
    expect(CATEGORY_ORDER).toEqual(['food','transport','hotel','office','other'])
    for (const c of CATEGORY_ORDER) {
      expect(['primary','success','warning','danger']).toContain(CATEGORY_META[c].color)
    }
  })
})

describe('备注清洗 + ID', () => {
  it('换行/制表 → 单空格；≤200字；空→""', () => {
    expect(sanitizeRemark('  加班\r\n和\t老板   吃饭  ')).toBe('加班 和 老板 吃饭')
    expect(sanitizeRemark('a'.repeat(300))).toHaveLength(200)
    expect(sanitizeRemark(null)).toBe('')
  })
  it('genId 连续 100 次不重复', () => {
    const s = new Set()
    for (let i = 0; i < 100; i++) s.add(genId())
    expect(s.size).toBe(100)
  })
})

const samples = [
  { id: '1', date: '2026-03-02', category: 'food',      amountCents: 3000,  remark: '加班外卖', createdAt: 1 },
  { id: '2', date: '2026-03-05', category: 'transport', amountCents: 5600,  remark: '打车',     createdAt: 2 },
  { id: '3', date: '2026-03-08', category: 'food',      amountCents: 2500,  remark: '',         createdAt: 3 },
  { id: '4', date: '2026-03-15', category: 'hotel',     amountCents: 42000, remark: '出差3晚',  createdAt: 4 },
  { id: '5', date: '2026-02-28', category: 'other',     amountCents: 800,   remark: '停车费',   createdAt: 5 },
]

describe('合计/笔数/Top 分类', () => {
  it('sumByCategory：food=5500, hotel=42000, 其他=800', () => {
    const s = sumByCategory(samples)
    expect(s.food).toBe(5500)
    expect(s.hotel).toBe(42000)
    expect(s.office).toBe(0)
  })
  it('totalCents = 3000+5600+2500+42000+800 = 53900（¥539.00）', () => {
    expect(totalCents(samples)).toBe(53900)
    expect(formatYuan(53900)).toBe('¥539.00')
  })
  it('countByCategory：food=2，hotel=1，office=0', () => {
    const c = countByCategory(samples)
    expect(c.food).toBe(2); expect(c.hotel).toBe(1); expect(c.office).toBe(0)
  })
  it('topCategory：Top = 住宿 42000 分；空 → null', () => {
    expect(topCategory(samples).category).toBe('hotel')
    expect(topCategory([])).toBeNull()
  })
  it('空/非法记录不崩', () => {
    expect(totalCents(null)).toBe(0)
    expect(sumByCategory(undefined).food).toBe(0)
  })
})

describe('月过滤 + 排序', () => {
  const m3 = monthRecords(samples, 2026, 3)
  it('3 月 4 条（不含 2 月 other）；按日期升：03-02 → 03-15', () => {
    expect(m3).toHaveLength(4)
    expect(m3[0].date).toBe('2026-03-02')
    expect(m3[3].date).toBe('2026-03-15')
  })
  it('2 月 1 条（other）；空查询不崩', () => {
    expect(monthRecords(samples, 2026, 2)).toHaveLength(1)
    expect(monthRecords(null, 2026, 12)).toEqual([])
  })
})
