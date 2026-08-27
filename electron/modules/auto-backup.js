// 自动滚动备份（架构层·数据安全）：FM-006 存储损坏时的最后防线
// 策略：每日首次写入前，若当日未备份 → 复制当前存储为 auto-backup-YYYY-MM-DD.json，滚动保留 7 份
// 契约测试: tests/autoBackup.test.js

const AUTO_PREFIX = 'auto-backup-'
const AUTO_RE = /^auto-backup-\d{4}-\d{2}-\d{2}\.json$/

/** 当日是否需要备份（已有当日备份则跳过） */
function shouldBackupToday(lastBackupName, todayStr) {
  if (!lastBackupName || !AUTO_RE.test(lastBackupName)) return true
  return !lastBackupName.includes(todayStr)
}

/**
 * 滚动清理：按文件名日期降序保留 keep 份，其余待删。
 * 仅处理 auto-backup-* 命名，手动备份不参与轮换。
 */
function rotateBackups(files, maxKeep = 7) {
  const autos = (files || []).filter(f => AUTO_RE.test(f))
  autos.sort((a, b) => b.localeCompare(a)) // 新→旧
  const keepSet = new Set(autos.slice(0, maxKeep))
  const keep = [], remove = []
  for (const f of files || []) {
    ;(keepSet.has(f) || !AUTO_RE.test(f) ? keep : remove).push(f)
  }
  return { keep, remove }
}

/** 今日备份文件名 */
function todayBackupName(dateStr) {
  return `${AUTO_PREFIX}${dateStr}.json`
}

module.exports = { shouldBackupToday, rotateBackups, todayBackupName, AUTO_RE }
