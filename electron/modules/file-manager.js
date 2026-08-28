/**
 * 文件管理模块 - 处理本地文件的上传、下载、删除等操作
 * P1-3 加固：fileId 采用 uuid v4 不可反向解码，替代原 base64(绝对路径)；兼容旧 base64 fileId 平滑升级
 */

const fs = require('fs')
const path = require('path')
const { app, dialog } = require('electron')
const { v4: uuidv4 } = require('uuid')
const v = require('./ipc-validate.js')

// 云盘存储根目录
const CLOUD_ROOT = path.join(app.getPath('userData'), 'cloud-storage')
// fileId 索引文件（放云盘根内隐藏文件，重启自动恢复）
const FILE_INDEX_PATH = path.join(CLOUD_ROOT, '.file-index.json')
// 内存索引
let _fileIndex = null

/**
 * 确保目录存在
 * @param {string} dirPath - 目录路径
 */
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

/** ============ P1-3: uuid fileId 索引层（兼容旧 base64 升级） ============ */
function _emptyIndex() {
  return { version: 1, forward: Object.create(null), reverse: Object.create(null) }
}

/** 加载 fileId→absPath 索引；JSON 损坏则备份原索引不抛错 */
function loadFileIndex() {
  ensureDirectory(CLOUD_ROOT)
  if (_fileIndex) return _fileIndex
  if (!fs.existsSync(FILE_INDEX_PATH)) {
    _fileIndex = _emptyIndex()
    return _fileIndex
  }
  try {
    const raw = fs.readFileSync(FILE_INDEX_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    _fileIndex = {
      version: 1,
      forward: parsed && typeof parsed.forward === 'object' ? parsed.forward : Object.create(null),
      reverse: parsed && typeof parsed.reverse === 'object' ? parsed.reverse : Object.create(null)
    }
  } catch (err) {
    // 索引坏：隔离为 .corrupted，不阻塞当前流程（下次 listFiles 会重建）
    try { fs.renameSync(FILE_INDEX_PATH, FILE_INDEX_PATH + `.${Date.now()}.corrupted`) } catch (_) {}
    _fileIndex = _emptyIndex()
  }
  return _fileIndex
}

/** 原子化持久化索引（写 tmp → rename 防断电半写） */
function persistFileIndex() {
  if (!_fileIndex) return
  ensureDirectory(CLOUD_ROOT)
  const tmp = FILE_INDEX_PATH + `.tmp.${process.pid}`
  try {
    fs.writeFileSync(tmp, JSON.stringify(_fileIndex), 'utf8')
    fs.renameSync(tmp, FILE_INDEX_PATH)
  } catch (err) {
    try { fs.unlinkSync(tmp) } catch (_) {}
  }
}

/** 查 absPath→uuid；没有则生成 uuid 并写入双向映射（absPath 必须标准化） */
function getOrCreateFileId(absPath) {
  loadFileIndex()
  const key = path.resolve(absPath)
  if (_fileIndex.reverse[key]) return _fileIndex.reverse[key]
  const id = uuidv4()
  _fileIndex.forward[id] = key
  _fileIndex.reverse[key] = id
  persistFileIndex()
  return id
}

/** 删除 absPath 对应映射（文件被删/重命名旧路径清理） */
function removeFileIdByPath(absPath) {
  loadFileIndex()
  const key = path.resolve(absPath)
  const id = _fileIndex.reverse[key]
  if (id) delete _fileIndex.forward[id]
  delete _fileIndex.reverse[key]
  persistFileIndex()
}

/**
 * 解析 fileId 得真实绝对路径；兼容两阶段：
 * ① uuid→查 forward; ② 查不到→回退旧 base64 解码（P0 版本之前的 fileId 平滑兼容）
 * ③ 最终结果**必须在 CLOUD_ROOT 内**（双保险，防止索引被手动篡改写越界路径）
 * @param {string} fileId
 * @returns {string} resolvedAbsolutePath
 */
function resolveAndValidateFileId(fileId) {
  loadFileIndex()
  if (!fileId || typeof fileId !== 'string') throw new Error('resolveAndValidateFileId: empty fileId')
  let abs = null
  if (_fileIndex.forward[fileId]) {
    abs = path.resolve(_fileIndex.forward[fileId])
  } else {
    // 兼容 P0 及更早版本生成的 base64(路径) fileId；走原 decodeAndValidateFileId 的 base64→utf8→join CLOUD_ROOT 校验
    try { abs = v.decodeAndValidateFileId(fileId, CLOUD_ROOT) } catch (_) { abs = null }
    if (abs) abs = path.resolve(abs)
  }
  if (!abs) throw new Error(`fileId not found: ${String(fileId).slice(0, 12)}…`)
  // 防御：最终双校验必须在 CLOUD_ROOT 内（防止 forward 索引/反向解码被篡改写入 C:\Windows）
  const sep = path.sep
  const safeRoot = path.resolve(CLOUD_ROOT)
  if (abs !== safeRoot && !abs.startsWith(safeRoot + sep)) {
    throw new Error(`resolveAndValidateFileId: resolved path escapes CLOUD_ROOT`)
  }
  return abs
}

/**
 * 初始化云盘存储目录 + 加载 uuid 索引
 */
function initCloudStorage() {
  ensureDirectory(CLOUD_ROOT)
  loadFileIndex()
  return CLOUD_ROOT
}

/**
 * 获取文件列表
 * @param {string} relativePath - 相对路径
 * @returns {Array} 文件列表
 */
function listFiles(relativePath = '/') {
  const safe = v.validateSafeRelativePath(relativePath, CLOUD_ROOT)
  if (!safe.ok) throw new Error(`listFiles path rejected: ${safe.reason}`)
  const targetPath = safe.resolved
  ensureDirectory(targetPath)

  if (!fs.existsSync(targetPath)) {
    return []
  }

  const items = fs.readdirSync(targetPath, { withFileTypes: true })
  
  return items.map(item => {
    const fullPath = path.join(targetPath, item.name)
    const stats = fs.statSync(fullPath)
    
    return {
      id: getOrCreateFileId(fullPath),
      name: item.name,
      type: item.isDirectory() ? 'folder' : 'file',
      size: item.isFile() ? stats.size : 0,
      modified: stats.mtimeMs,
      path: path.join(relativePath, item.name)
    }
  }).sort((a, b) => {
    // 文件夹优先
    if (a.type === 'folder' && b.type !== 'folder') return -1
    if (a.type !== 'folder' && b.type === 'folder') return 1
    return a.name.localeCompare(b.name)
  })
}

/**
 * 上传文件到云盘
 * @param {string} sourcePath - 源文件路径
 * @param {string} relativePath - 目标相对路径
 * @param {Function} onProgress - 进度回调
 * @returns {Object} 上传结果
 */
function uploadFile(sourcePath, relativePath = '/', onProgress) {
  const safe = v.validateSafeRelativePath(relativePath, CLOUD_ROOT)
  if (!safe.ok) throw new Error(`uploadFile path rejected: ${safe.reason}`)
  const fileName = path.basename(sourcePath)
  const safeFn = v.validateSafeBasenameLoose(fileName)
  if (!safeFn.ok) throw new Error(`uploadFile fileName rejected: ${safeFn.reason}`)
  const targetPath = path.join(safe.resolved, fileName)

  ensureDirectory(safe.resolved)

  // 检查源文件是否存在
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`源文件不存在: ${sourcePath}`)
  }

  const sourceStats = fs.statSync(sourcePath)
  const fileSize = sourceStats.size

  // 复制文件
  const readStream = fs.createReadStream(sourcePath)
  const writeStream = fs.createWriteStream(targetPath)

  let copiedBytes = 0

  readStream.on('data', (chunk) => {
    copiedBytes += chunk.length
    if (onProgress) {
      onProgress(Math.round((copiedBytes / fileSize) * 100))
    }
  })

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      const stats = fs.statSync(targetPath)
      resolve({
        success: true,
        file: {
          id: getOrCreateFileId(targetPath),
          name: fileName,
          type: 'file',
          size: stats.size,
          modified: stats.mtimeMs,
          path: path.join(relativePath, fileName)
        }
      })
    })

    writeStream.on('error', (err) => {
      reject(new Error(`上传失败: ${err.message}`))
    })

    readStream.on('error', (err) => {
      reject(new Error(`读取源文件失败: ${err.message}`))
    })

    readStream.pipe(writeStream)
  })
}

/**
 * 下载文件到本地
 * @param {string} fileId - 文件ID (base64编码的完整路径)
 * @param {string} savePath - 保存路径 (可选，不提供则弹出保存对话框)
 * @param {Function} onProgress - 进度回调
 * @returns {Object} 下载结果
 */
async function downloadFile(fileId, savePath, onProgress) {
  const sourcePath = resolveAndValidateFileId(fileId)
  
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`文件不存在: ${sourcePath}`)
  }

  // 如果没有指定保存路径，弹出保存对话框；若渲染进程强制传入 savePath，强制要求落在用户白名单目录内（P1-4 防御）
  if (!savePath) {
    const fileName = path.basename(sourcePath)
    const result = await dialog.showSaveDialog({
      title: '保存文件',
      defaultPath: fileName,
      filters: [
        { name: '所有文件', extensions: ['*'] }
      ]
    })
    
    if (result.canceled || !result.filePath) {
      return { success: false, message: '用户取消保存' }
    }
    
    savePath = result.filePath
  } else {
    // 渲染进程强制传入 savePath：双重加固 → ① 用户目录白名单 ② 扩展名仅允许通用数据扩展名（DATA_EXT_RE：json/xlsx/xls/csv/txt…），禁 .bat/.exe/.ps1/.vbs 可执行
    const allowed = v.assertAllowedUserPath(savePath, { allowedExtRe: v.DATA_EXT_RE, app })
    if (!allowed.ok) throw new Error(`download savePath rejected: ${allowed.reason}`)
    savePath = allowed.normalized
  }

  const sourceStats = fs.statSync(sourcePath)
  const fileSize = sourceStats.size

  const readStream = fs.createReadStream(sourcePath)
  const writeStream = fs.createWriteStream(savePath)

  let copiedBytes = 0

  readStream.on('data', (chunk) => {
    copiedBytes += chunk.length
    if (onProgress) {
      onProgress(Math.round((copiedBytes / fileSize) * 100))
    }
  })

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      resolve({
        success: true,
        savePath,
        fileName: path.basename(savePath)
      })
    })

    writeStream.on('error', (err) => {
      reject(new Error(`下载失败: ${err.message}`))
    })

    readStream.on('error', (err) => {
      reject(new Error(`读取文件失败: ${err.message}`))
    })

    readStream.pipe(writeStream)
  })
}

/**
 * 创建文件夹
 * @param {string} relativePath - 父目录相对路径
 * @param {string} folderName - 文件夹名称
 * @returns {Object} 创建结果
 */
function createFolder(relativePath = '/', folderName) {
  const safe = v.validateSafeRelativePath(relativePath, CLOUD_ROOT)
  if (!safe.ok) throw new Error(`createFolder path rejected: ${safe.reason}`)
  const safeFn = v.validateSafeBasenameLoose(folderName)
  if (!safeFn.ok) throw new Error(`createFolder folderName rejected: ${safeFn.reason}`)
  const targetPath = path.join(safe.resolved, folderName)
  
  if (fs.existsSync(targetPath)) {
    throw new Error(`文件夹已存在: ${folderName}`)
  }

  fs.mkdirSync(targetPath, { recursive: true })

  return {
    success: true,
    folder: {
      id: getOrCreateFileId(targetPath),
      name: folderName,
      type: 'folder',
      size: 0,
      modified: Date.now(),
      path: path.join(relativePath, folderName)
    }
  }
}

/**
 * 删除文件或文件夹
 * @param {string} fileId - 文件ID (base64编码的完整路径)
 * @returns {Object} 删除结果
 */
function deleteFile(fileId) {
  const targetPath = resolveAndValidateFileId(fileId)
  
  if (!fs.existsSync(targetPath)) {
    throw new Error(`文件不存在`)
  }

  const stats = fs.statSync(targetPath)
  
  if (stats.isDirectory()) {
    fs.rmSync(targetPath, { recursive: true })
  } else {
    fs.unlinkSync(targetPath)
  }
  // P1-3：清理索引映射（下次同 absPath 再写入会重新生成 uuid）
  removeFileIdByPath(targetPath)

  return { success: true }
}

/**
 * 重命名文件或文件夹
 * @param {string} fileId - 文件ID
 * @param {string} newName - 新名称
 * @returns {Object} 重命名结果
 */
function renameFile(fileId, newName) {
  const oldPath = resolveAndValidateFileId(fileId)
  if (!fs.existsSync(oldPath)) throw new Error(`文件不存在`)
  const safeFn = v.validateSafeBasenameLoose(newName)
  if (!safeFn.ok) throw new Error(`renameFile newName rejected: ${safeFn.reason}`)
  const parentPath = path.dirname(oldPath)
  const newPath = path.join(parentPath, newName)
  
  if (fs.existsSync(newPath)) {
    throw new Error(`名称已存在: ${newName}`)
  }

  fs.renameSync(oldPath, newPath)
  // P1-3：旧 absPath→uuid 映射失效，清理（下次 listFiles 走 newPath 会生成新 uuid）
  removeFileIdByPath(oldPath)

  const stats = fs.statSync(newPath)
  const relativePath = path.relative(CLOUD_ROOT, newPath)

  return {
    success: true,
    file: {
      id: getOrCreateFileId(newPath),
      name: newName,
      type: stats.isDirectory() ? 'folder' : 'file',
      size: stats.isFile() ? stats.size : 0,
      modified: stats.mtimeMs,
      path: '/' + relativePath.replace(/\\/g, '/')
    }
  }
}

/**
 * 选择文件上传
 * @returns {Promise} 选择结果
 */
async function selectFilesToUpload() {
  const result = await dialog.showOpenDialog({
    title: '选择文件上传',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '所有文件', extensions: ['*'] }
    ]
  })

  if (result.canceled) {
    return { canceled: true, files: [] }
  }

  return { canceled: false, files: result.filePaths }
}

/**
 * 从内存数据上传文件（用于拖拽上传）
 * @param {Array} fileData - 文件数据数组（Uint8Array）
 * @param {string} fileName - 文件名
 * @param {string} relativePath - 目标相对路径
 * @returns {Object} 上传结果
 */
function uploadFileFromData(fileData, fileName, relativePath = '/') {
  const safe = v.validateSafeRelativePath(relativePath, CLOUD_ROOT)
  if (!safe.ok) throw new Error(`uploadFileFromData path rejected: ${safe.reason}`)
  const safeFn = v.validateSafeBasenameLoose(fileName)
  if (!safeFn.ok) throw new Error(`uploadFileFromData fileName rejected: ${safeFn.reason}`)
  const targetPath = path.join(safe.resolved, fileName)

  ensureDirectory(safe.resolved)

  // 将数组转换为 Buffer 并写入文件
  const buffer = Buffer.from(fileData)
  fs.writeFileSync(targetPath, buffer)

  const stats = fs.statSync(targetPath)
  
  return {
    success: true,
    file: {
      id: getOrCreateFileId(targetPath),
      name: fileName,
      type: 'file',
      size: stats.size,
      modified: stats.mtimeMs,
      path: path.join(relativePath, fileName)
    }
  }
}

/**
 * 获取云盘存储统计信息
 * @returns {Object} 存储统计
 */
function getStorageStats() {
  function calculateDirSize(dirPath) {
    if (!fs.existsSync(dirPath)) return 0
    
    const items = fs.readdirSync(dirPath, { withFileTypes: true })
    let totalSize = 0
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name)
      if (item.isDirectory()) {
        totalSize += calculateDirSize(fullPath)
      } else {
        totalSize += fs.statSync(fullPath).size
      }
    }
    
    return totalSize
  }

  const totalSize = calculateDirSize(CLOUD_ROOT)
  const fileCount = listFiles('/').length

  return {
    totalSize,
    fileCount,
    cloudRoot: CLOUD_ROOT
  }
}

module.exports = {
  initCloudStorage,
  listFiles,
  uploadFile,
  uploadFileFromData,
  downloadFile,
  createFolder,
  deleteFile,
  renameFile,
  selectFilesToUpload,
  getStorageStats,
  CLOUD_ROOT
}