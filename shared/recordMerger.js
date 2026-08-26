'use strict';

/**
 * 共享模块：打卡记录去重合并 —— 单一规范源（FW-001 落地）
 *
 * 使用 CommonJS 格式，可同时被 Electron 主进程 (require) 和 Vite 渲染进程 (import) 引用。
 * 类型声明见同目录 recordMerger.d.ts；渲染进程通过 src/utils/recordUtils.ts re-export 引用。
 * ⚠️ 禁止在任何其他位置重新实现 mergeRecords 逻辑，修改请直接改本文件。
 */

function pickNewerField(existingVal, newVal, newerIsRecord) {
  if (newVal) {
    return existingVal ? (newerIsRecord ? newVal : existingVal) : newVal;
  }
  return existingVal || '';
}

/**
 * 合并并去重打卡记录
 * 同一日期的多条记录合并为一条，保留非空字段中最新的数据
 * @param {Array} records - 原始记录数组
 * @returns {Array} 合并去重后的记录数组，按日期升序排列
 */
function mergeRecords(records) {
  if (!Array.isArray(records) || records.length === 0) return [];

  const map = new Map();
  for (const record of records) {
    if (!record || !record.date) continue;

    const existing = map.get(record.date);
    if (!existing) {
      map.set(record.date, { ...record });
      continue;
    }

    const existingTs = existing.timestamp || 0;
    const newTs = record.timestamp || 0;
    const newerIsRecord = newTs >= existingTs;

    map.set(record.date, {
      date: record.date,
      checkIn: pickNewerField(existing.checkIn, record.checkIn, newerIsRecord),
      checkOut: pickNewerField(existing.checkOut, record.checkOut, newerIsRecord),
      duration: pickNewerField(existing.duration, record.duration, newerIsRecord),
      status: newerIsRecord ? (record.status || existing.status) : (existing.status || record.status),
      timestamp: Math.max(existingTs, newTs)
    });
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = { mergeRecords };
