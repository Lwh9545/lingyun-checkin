// IPC 输入校验层（架构层升级·FM-008 IPC 契约破裂防御）
// 主进程侧统一校验：渲染进程传入的一切参数先过此层再触达系统能力
// 契约测试: tests/ipcValidation.test.js

const path = require('path')
const STORAGE_KEY_RE = /^[a-zA-Z0-9_-]{1,64}$/
const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const SAFE_BASENAME_RE = /^[\w\u4e00-\u9fa5-]+\.(json|enc)$/
const SAFE_NAME_NOEXT_RE = /^[\w\u4e00-\u9fa5 .-]{1,128}$/
const EXECUTABLE_EXT_RE = /\.(exe|bat|cmd|ps1|vbs|vbe|js|jse|wsf|wsh|msi|scr|com|pif|jar)$/i
const DATA_EXT_RE = /\.(json|xlsx|xls|csv|txt)$/i
const EXPORT_EXT_RE = /\.(json|xlsx)$/i
const NOTIFY_MAX = 200
const MAX_IMPORT_BYTES = 5 * 1024 * 1024

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

module.exports = {
  validateStorageKey,
  validateSafeBasename,
  assertOpenablePath,
  validateNotifyText,
  MAX_IMPORT_BYTES,

  /** 数据导入导出通用路径锚点：允许目录白名单（documents/desktop/downloads/userData/temp）+ 扩展名白名单（json/xlsx）
   *  P0-1/P0-2 防御：禁止写 Startup / Windows / 系统目录。返回 { ok, normalized, reason }
   */
  assertAllowedUserPath(p, { allowedExtRe = EXPORT_EXT_RE, app } = {}) {
    if (typeof p !== 'string' || !p) return { ok: false, reason: 'invalid path' }
    if (p.includes('\0')) return { ok: false, reason: 'null byte' }
    if (p.includes('..')) return { ok: false, reason: 'path traversal detected' }
    if (!allowedExtRe.test(p)) return { ok: false, reason: 'extension blocked' }
    if (EXECUTABLE_EXT_RE.test(p)) return { ok: false, reason: 'executable blocked' }
    if (app) {
      const allowedRoots = [
        app.getPath('documents'),
        app.getPath('desktop'),
        app.getPath('downloads'),
        app.getPath('userData'),
        app.getPath('temp'),
        app.getPath('home')
      ].map(r => path.resolve(r) + path.sep)
      const target = path.resolve(p) + path.sep
      const inside = allowedRoots.some(r => target.startsWith(r) || path.resolve(p) === r.slice(0, -1))
      if (!inside) return { ok: false, reason: 'path outside user directory' }
    }
    return { ok: true, normalized: path.resolve(p) }
  },

  /** 云盘 relativePath：禁止每层 `..`、NUL 字节、路径分隔符作文件名；拼接后必须仍在 CLOUD_ROOT 内
   *  P0-3 防御：../../../Startup/mal.bat 穿透
   */
  validateSafeRelativePath(relativePath, CLOUD_ROOT) {
    if (relativePath == null) return { ok: false, reason: 'invalid relativePath' }
    const p = String(relativePath)
    if (p.includes('\0')) return { ok: false, reason: 'null byte' }
    if (p.includes('..')) return { ok: false, reason: 'path traversal detected' }
    // 每层 segment 不能是绝对根或 Windows 盘符
    const segments = p.split(/[/\\]/).filter(Boolean)
    for (const s of segments) {
      if (!/^[\w\u4e00-\u9fa5 .-]{1,128}$/.test(s)) {
        return { ok: false, reason: `invalid segment: ${s.slice(0, 32)}` }
      }
    }
    const joined = path.join(CLOUD_ROOT, p.startsWith('/') ? '.' + p : p)
    const resolved = path.resolve(joined)
    const root = path.resolve(CLOUD_ROOT)
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      return { ok: false, reason: 'path escapes CLOUD_ROOT' }
    }
    return { ok: true, resolved }
  },

  /** 纯文件 basename：长度 1-128 + 字符白名单（无 `..` `\` `/` NUL）
   *  P1-3/P1-4 rename/delete/folderName 共用
   */
  validateSafeBasenameLoose(name) {
    if (typeof name !== 'string' || !name || name.length > 128) return { ok: false, reason: 'invalid name' }
    if (name.includes('\0')) return { ok: false, reason: 'null byte' }
    if (name.includes('/') || name.includes('\\') || name.includes('..')) {
      return { ok: false, reason: 'path separator not allowed in basename' }
    }
    if (!SAFE_NAME_NOEXT_RE.test(name)) return { ok: false, reason: 'invalid characters' }
    return { ok: true }
  },

  /** fileId 解码后必须在 CLOUD_ROOT 内（P1-4 防御）；否则抛错不要静默 */
  decodeAndValidateFileId(fileId, CLOUD_ROOT) {
    if (typeof fileId !== 'string' || !fileId) {
      throw new Error('invalid file id')
    }
    let raw
    try {
      raw = Buffer.from(fileId, 'base64').toString('utf8')
    } catch (_) {
      throw new Error('file id base64 decode failed')
    }
    const resolved = path.resolve(raw)
    const root = path.resolve(CLOUD_ROOT)
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      throw new Error('file id outside CLOUD_ROOT')
    }
    return resolved
  }
}
