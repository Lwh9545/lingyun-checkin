// IPC 输入校验层（架构层升级·FM-008 IPC 契约破裂防御）
// 主进程侧统一校验：渲染进程传入的一切参数先过此层再触达系统能力
// 契约测试: tests/ipcValidation.test.js

const STORAGE_KEY_RE = /^[a-zA-Z0-9_-]{1,64}$/
const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const SAFE_BASENAME_RE = /^[\w\u4e00-\u9fa5-]+\.(json|enc)$/
const EXECUTABLE_EXT_RE = /\.(exe|bat|cmd|ps1|vbs|vbe|js|jse|wsf|wsh|msi|scr|com|pif|jar)$/i
const DATA_EXT_RE = /\.(json|xlsx|xls|csv|txt)$/i
const NOTIFY_MAX = 200

/** 存储域 key：字符串、白名单字符集、限长（防注入/原型污染） */
function validateStorageKey(key) {
  if (typeof key !== 'string' || !STORAGE_KEY_RE.test(key)) {
    return { ok: false, reason: 'invalid storage key' }
  }
  if (RESERVED_KEYS.has(key.toLowerCase())) {
    return { ok: false, reason: 'reserved key' }
  }
  return { ok: true }
}

/** 备份/恢复文件名：仅允许数据扩展名，禁止路径分隔符与穿越 */
function validateSafeBasename(name) {
  if (typeof name !== 'string' || name.length > 128) return { ok: false, reason: 'invalid name' }
  if (name.includes('/') || name.includes('\\') || name.includes('..')) {
    return { ok: false, reason: 'path traversal detected' }
  }
  if (!SAFE_BASENAME_RE.test(name)) return { ok: false, reason: 'unallowed extension' }
  return { ok: true }
}

/** shell.openPath 防御：仅允许已知数据文件扩展，拒绝一切可执行/脚本 */
function assertOpenablePath(p) {
  if (typeof p !== 'string' || p.trim() === '') return { ok: false, reason: 'invalid path' }
  if (p.includes('\0')) return { ok: false, reason: 'null byte' }
  if (EXECUTABLE_EXT_RE.test(p)) return { ok: false, reason: 'executable blocked' }
  if (!DATA_EXT_RE.test(p)) return { ok: false, reason: 'unallowed file type' }
  return { ok: true }
}

/** 通知文本：类型校验 + 截断（防刷屏滥用） */
function validateNotifyText(text) {
  if (typeof text !== 'string' || text.trim() === '') return { ok: false, value: '' }
  return { ok: true, value: text.slice(0, NOTIFY_MAX) }
}

module.exports = { validateStorageKey, validateSafeBasename, assertOpenablePath, validateNotifyText }
