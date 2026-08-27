// 趋势图表数据变换 + 请假类型契约（全面升级 P1·产品功能层）
// 契约测试: tests/upgrade.test.js
export const LEAVE_TYPES = [
  { value: 'annual', label: '年假' },
  { value: 'sick', label: '病假' },
  { value: 'personal', label: '事假' },
  { value: 'compensatory', label: '调休' },
]

/**
 * 统一解析历史 duration 格式为分钟（向后兼容）:
 * '8小时30分钟' / '8:30' / '8.5'(小时) / null/未知 → 分钟数（失败为 0）
 */
export function parseDurationToMinutes(raw) {
  if (!raw) return 0
  const s = String(raw).trim()
  let m = s.match(/^(\d+)小时(\d+)/) // '8小时30分钟'
  if (m) return Number(m[1]) * 60 + Number(m[2])
  m = s.match(/^(\d{1,2}):(\d{2})$/) // '8:30'
  if (m) return Number(m[1]) * 60 + Number(m[2])
  m = s.match(/^(\d+(\.\d+)?)$/) // '8.5' 小时
  if (m) return Math.round(Number(m[1]) * 60)
  return 0
}

/** 近 N 天趋势: { labels, minutes, leaveFlags }（空数据安全，请假当日工时 0 并标记） */
export function buildTrendData(records, days = 14) {
  const out = { labels: [], minutes: [], leaveFlags: [] }
  const map = new Map((records || []).map(r => [r.date, r]))
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    out.labels.push(ds.slice(5)) // MM-DD
    const rec = map.get(ds)
    const isLeave = rec?.status === 'leave'
    out.minutes.push(isLeave ? 0 : parseDurationToMinutes(rec?.duration))
    out.leaveFlags.push(isLeave ? (rec.leaveType || 'unknown') : null)
  }
  return out
}
