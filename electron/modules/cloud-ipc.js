'use strict'

/**
 * Cloud File Manager IPC handlers（从 main.js 拆分 FW-005）
 *
 * 职责：注册云端文件管理的所有 IPC handlers
 * 设计：纯注册函数，依赖 file-manager + windowMgr + log
 */

const { ipcMain } = require('electron')
const {
  initCloudStorage, listFiles, uploadFile, uploadFileFromData,
  downloadFile, createFolder, deleteFile, renameFile,
  selectFilesToUpload, getStorageStats
} = require('./file-manager.js')

/**
 * 注册云端文件 IPC handlers
 * @param {{ windowMgr: Object, log: Object }} deps
 */
function registerCloudIpcHandlers({ windowMgr, log }) {
  ipcMain.handle('cloud-init', async () => {
    try {
      const cloudRoot = initCloudStorage()
      log.info('Cloud storage initialized:', cloudRoot)
      return { success: true, cloudRoot }
    } catch (error) {
      log.error('Cloud init failed:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('cloud-list-files', async (event, relativePath) => {
    try {
      const files = listFiles(relativePath || '/')
      return { success: true, files }
    } catch (error) {
      log.error('List files failed:', error)
      return { success: false, error: error.message, files: [] }
    }
  })

  ipcMain.handle('cloud-upload-file', async (event, sourcePath, relativePath) => {
    try {
      const uploadId = Date.now().toString()
      const result = await uploadFile(sourcePath, relativePath || '/', (percent) => {
        windowMgr.window?.webContents.send('upload-progress', { uploadId, percent })
      })
      log.info('File uploaded:', sourcePath)
      return result
    } catch (error) {
      log.error('Upload failed:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('cloud-upload-file-from-data', async (event, fileData, fileName, relativePath) => {
    try {
      const result = uploadFileFromData(fileData, fileName, relativePath || '/')
      log.info('File uploaded from data:', fileName)
      return result
    } catch (error) {
      log.error('Upload from data failed:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('cloud-download-file', async (event, fileId, savePath) => {
    try {
      const downloadId = Date.now().toString()
      const result = await downloadFile(fileId, savePath, (percent) => {
        windowMgr.window?.webContents.send('download-progress', { downloadId, percent })
      })
      log.info('File downloaded:', fileId)
      return result
    } catch (error) {
      log.error('Download failed:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('cloud-create-folder', async (event, relativePath, folderName) => {
    try {
      const result = createFolder(relativePath || '/', folderName)
      log.info('Folder created:', folderName)
      return result
    } catch (error) {
      log.error('Create folder failed:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('cloud-delete-file', async (event, fileId) => {
    try {
      const result = deleteFile(fileId)
      log.info('File deleted:', fileId)
      return result
    } catch (error) {
      log.error('Delete failed:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('cloud-rename-file', async (event, fileId, newName) => {
    try {
      const result = renameFile(fileId, newName)
      log.info('File renamed:', fileId, '->', newName)
      return result
    } catch (error) {
      log.error('Rename failed:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('cloud-select-files', async () => {
    try {
      const result = await selectFilesToUpload()
      return result
    } catch (error) {
      log.error('Select files failed:', error)
      return { canceled: true, files: [], error: error.message }
    }
  })

  ipcMain.handle('cloud-get-stats', async () => {
    try {
      const stats = getStorageStats()
      return { success: true, stats }
    } catch (error) {
      log.error('Get stats failed:', error)
      return { success: false, error: error.message }
    }
  })
}

module.exports = { registerCloudIpcHandlers }
