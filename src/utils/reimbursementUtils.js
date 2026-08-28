// 费用报销工具：金额存「分」整数 → 消灭浮点误差
export const CATEGORY_META = {
  food:      { label: '餐饮', color: 'warning' }, // 外卖/打饭/聚餐垫付
  transport: { label: '交通', color: 'primary' }, // 地铁/打车/高铁
  hotel:     { label: '住宿', color: 'success' }, // 出差酒店
  office:    { label: '办公', color: 'primary' }, // 文具/耗材/打印
  other:     { label: '其他', color: 'warning' }, // 加油/停车/通讯/等兜底
}

/** 打工人高频排序 */
export const CATEGORY_ORDER = ['food','transport','hotel','office','other']

/** 元 → 整数分，round 防 8.5*100=849.999... */
export const yuanToCents = (y) => {
  const n = Number(y)
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

/** 分 → 元 */
export const centsToYuan = (c) => {
  const n = Number(c)
  return Number.isFinite(n) ? n / 100 : 0
}

/** 分 → ¥xx.xx */
export const formatYuan = (c) => `¥${((Number(c) || 0) / 100).toFixed(2)}`

const MAX_REMARK = 200
/** 换行/制表 → 单空格 + 连续空格合并 + ≤200 字 */
export function sanitizeRemark(str) {
  if (str == null) return ''
  const s = String(str).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim()
  return s.length > MAX_REMARK ? s.slice(0, MAX_REMARK) : s
}

let _idSeq = 0
const _rand4 = () => Math.floor(1000 + Math.random() * 9000)
export const genId = () => `${Date.now()}${_rand4()}${String(_idSeq++).padStart(3,'0')}`

const allZeroCats = () => CATEGORY_ORDER.reduce((o, c) => (o[c] = 0, o), {})

/** 按分类合计「分」*/
export function sumByCategory(records) {
  const out = allZeroCats()
  for (const r of Array.isArray(records) ? records : []) {
    if (r?.category in out) out[r.category] += Number(r.amountCents) || 0
  }
  return out
}

/** 总金额「分」*/
export const totalCents = (records) =>
  (Array.isArray(records) ? records : []).reduce((s, r) => s + (Number(r?.amountCents) || 0), 0)

/** 按分类笔数 */
export function countByCategory(records) {
  const out = allZeroCats()
  for (const r of Array.isArray(records) ? records : []) {
    if (r?.category in out) out[r.category] += 1
  }
  return out
}

/** 金额最高分类；空 → null */
export function topCategory(records) {
  const arr = Array.isArray(records) ? records : []
  if (!arr.length) return null
  const centsMap = sumByCategory(arr)
  const countMap = countByCategory(arr)
  let best = null
  for (const c of CATEGORY_ORDER) {
    if (!best || centsMap[c] > best.cents) best = { category: c, cents: centsMap[c], count: countMap[c] }
  }
  return best && best.cents > 0 ? best : null
}

/** 按 yyyy-mm 过滤 + 日期/创建时升序 */
export function monthRecords(records, y, m) {
  const prefix = `${y}-${String(m).padStart(2, '0')}`
  const filtered = (Array.isArray(records) ? records : [])
    .filter(r => typeof r?.date === 'string' && r.date.startsWith(prefix))
  return filtered.sort((a, b) =>
    a.date === b.date ? (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0) : a.date.localeCompare(b.date)
  )
}
