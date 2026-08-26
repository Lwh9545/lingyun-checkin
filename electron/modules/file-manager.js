/**
 * 文件管理模块 - 处理本地文件的上传、下载、删除等操作
 */

const fs = require('fs')
const path = require('path')
const { app, dialog } = require('electron')

// 云盘存储根目录
const CLOUD_ROOT = path.join(app.getPath('userData'), 'cloud-storage')

/**
 * 确保目录存在
 * @param {string} dirPath - 目录路径
 */
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

/**
 * 初始化云盘存储目录
 */
function initCloudStorage() {
  ensureDirectory(CLOUD_ROOT)
  return CLOUD_ROOT
}

/**
 * 获取文件列表
 * @param {string} relativePath - 相对路径
 * @returns {Array} 文件列表
 */
function listFiles(relativePath = '/') {
  const targetPath = path.join(CLOUD_ROOT, relativePath)
  ensureDirectory(targetPath)

  if (!fs.existsSync(targetPath)) {
    return []
  }

  const items = fs.readdirSync(targetPath, { withFileTypes: true })
  
  return items.map(item => {
    const fullPath = path.join(targetPath, item.name)
    const stats = fs.statSync(fullPath)
    
    return {
      id: Buffer.from(fullPath).toString('base64'),
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
  const fileName = path.basename(sourcePath)
  const targetPath = path.join(CLOUD_ROOT, relativePath, fileName)
  
  ensureDirectory(path.join(CLOUD_ROOT, relativePath))

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
          id: Buffer.from(targetPath).toString('base64'),
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
  const sourcePath = Buffer.from(fileId, 'base64').toString()
  
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`文件不存在: ${sourcePath}`)
  }

  // 如果没有指定保存路径，弹出保存对话框
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
  const targetPath = path.join(CLOUD_ROOT, relativePath, folderName)
  
  if (fs.existsSync(targetPath)) {
    throw new Error(`文件夹已存在: ${folderName}`)
  }

  fs.mkdirSync(targetPath, { recursive: true })

  return {
    success: true,
    folder: {
      id: Buffer.from(targetPath).toString('base64'),
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
  const targetPath = Buffer.from(fileId, 'base64').toString()
  
  if (!fs.existsSync(targetPath)) {
    throw new Error(`文件不存在`)
  }

  const stats = fs.statSync(targetPath)
  
  if (stats.isDirectory()) {
    fs.rmSync(targetPath, { recursive: true })
  } else {
    fs.unlinkSync(targetPath)
  }

  return { success: true }
}

/**
 * 重命名文件或文件夹
 * @param {string} fileId - 文件ID
 * @param {string} newName - 新名称
 * @returns {Object} 重命名结果
 */
function renameFile(fileId, newName) {
  const oldPath = Buffer.from(fileId, 'base64').toString()
  
  if (!fs.existsSync(oldPath)) {
    throw new Error(`文件不存在`)
  }

  const parentPath = path.dirname(oldPath)
  const newPath = path.join(parentPath, newName)
  
  if (fs.existsSync(newPath)) {
    throw new Error(`名称已存在: ${newName}`)
  }

  fs.renameSync(oldPath, newPath)

  const stats = fs.statSync(newPath)
  const relativePath = path.relative(CLOUD_ROOT, newPath)

  return {
    success: true,
    file: {
      id: Buffer.from(newPath).toString('base64'),
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
  const targetPath = path.join(CLOUD_ROOT, relativePath, fileName)
  
  ensureDirectory(path.join(CLOUD_ROOT, relativePath))

  // 将数组转换为 Buffer 并写入文件
  const buffer = Buffer.from(fileData)
  fs.writeFileSync(targetPath, buffer)

  const stats = fs.statSync(targetPath)
  
  return {
    success: true,
    file: {
      id: Buffer.from(targetPath).toString('base64'),
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