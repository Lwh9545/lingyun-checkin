'use strict'

/**
 * IPC handlers 注册器（从 main.js 拆分 FW-005）
 *
 * 职责：注册除 Cloud File Manager 之外的所有 IPC handlers
 * 设计：纯注册函数，所有依赖通过工厂参数注入
 */

const { ipcMain, dialog, shell } = require('electron')
const fs = require('fs')
const path = require('path')
const v = require('./ipc-validate')

/**
 * 注册基础 IPC handlers
 * @param {Object} deps - 依赖
 * @param {Object} deps.storage - 存储管理器
 * @param {Object} deps.backup - 备份管理器
 * @param {Object} deps.windowMgr - 窗口管理器
 * @param {Object} deps.notify - 通知管理器
 * @param {Object} deps.trayMgr - 托盘管理器
 * @param {Object} deps.updater - 更新器
 * @param {{ setAutoStartup: Function, getAutoStartupStatus: Function }} deps.autoStartup - 自启管理器
 * @param {Object} deps.log - logger 实例
 * @param {string} deps.APP_VERSION - 应用版本
 * @param {() => Promise<any>} deps.safeShutdownCheckOut - 关机签退钩子
 */
function registerBaseIpcHandlers(deps) {
  const {
    storage, backup, windowMgr, notify, trayMgr, updater, autoStartup,
    log, APP_VERSION, safeShutdownCheckOut
  } = deps

  const { getStorageSync, setStorageSync, overwriteStorageSync, removeStorageSync } = storage
  const { backupDir, getBackupList, restoreFromBackup, exportData, importData, moveToRecycleBin } = backup

  // ==================== Storage / Tray ====================
  ipcMain.on('update-tray-status', (event, status) => trayMgr.updateTrayStatus(status))

  ipcMain.handle('storage-get', (event, key, defaultValue) => {
    if (!v.validateStorageKey(key).ok) return defaultValue
    return getStorageSync(key, defaultValue)
  })
  ipcMain.handle('storage-set', async (event, key, value) => {
    if (!v.validateStorageKey(key).ok) return false
    return setStorageSync(key, value)
  })
  ipcMain.handle('storage-overwrite', async (event, key, value) => {
    if (!v.validateStorageKey(key).ok) return false
    return overwriteStorageSync(key, value)
  })
  ipcMain.handle('storage-remove', async (event, key) => {
    if (!v.validateStorageKey(key).ok) return false
    return removeStorageSync(key)
  })

  // ==================== Auto-startup ====================
  ipcMain.handle('auto-startup-set', async (event, enabled) => autoStartup.setAutoStartup(enabled))
  ipcMain.handle('auto-startup-get', () => autoStartup.getAutoStartupStatus())

  // ==================== Backup / Data ====================
  ipcMain.handle('get-backup-list', async () => getBackupList())
  ipcMain.handle('restore-from-backup', async (event, name) => {
    if (!v.validateSafeBasename(name).ok) return { success: false, message: 'invalid backup name' }
    return restoreFromBackup(name)
  })
  ipcMain.handle('export-data', async (event, p) => exportData(p))
  ipcMain.handle('import-data', async (event, p) => importData(p))
  ipcMain.handle('get-app-version', () => APP_VERSION)

  ipcMain.handle('get-data-stats', async () => {
    try {
      if (!fs.existsSync(backupDir)) { fs.mkdirSync(backupDir, { recursive: true }) }
      const records = getStorageSync('attendance_records', [])
      const latestBackup = await getBackupList()
      return {
        totalRecords: records.length,
        backupCount: latestBackup.length,
        lastBackup: latestBackup.length > 0 ? latestBackup[0].modified : null,
        dataPath: storage.storagePath,
        backupPath: backupDir
      }
    } catch (error) {
      log.error('get-data-stats failed:', error)
      return null
    }
  })

  ipcMain.handle('delete-backup', async (event, backupFileName) => {
    try {
      if (!v.validateSafeBasename(backupFileName).ok) return false
      const filePath = path.join(backupDir, backupFileName)
      if (!fs.existsSync(filePath)) return false
      fs.unlinkSync(filePath)
      log.info('Backup deleted:', backupFileName)
      return true
    } catch (error) {
      log.error('Backup delete failed:', error)
      return false
    }
  })

  // FW-003:破坏性操作必须给后悔药 —— 先移到回收站,再清空
  ipcMain.handle('clear-all-records', async () => {
    const records = getStorageSync('attendance_records', [])
    if (records && records.length > 0) {
      try {
        const recycleName = moveToRecycleBin(records)
        log.info(`clear-all-records: moved ${records.length} records to recycle bin (${recycleName})`)
      } catch (e) {
        log.error('clear-all-records: recycle bin failed, abort to avoid data loss', e)
        return false
      }
    }
    return overwriteStorageSync('attendance_records', [])
  })

  // ==================== Dialog / Shell ====================
  ipcMain.handle('dialog-show-save', (event, options) => dialog.showSaveDialog(windowMgr.window, options))
  ipcMain.handle('dialog-show-open', (event, options) => dialog.showOpenDialog(windowMgr.window, options))
  ipcMain.handle('shell-open-path', (event, filePath) => {
    const check = v.assertOpenablePath(filePath)
    if (!check.ok) { log.warn('shell-open-path blocked:', check.reason); return false }
    return shell.openPath(filePath)
  })

  // ==================== Notification / Window ====================
  ipcMain.handle('send-notification', (event, title, body) => {
    const t = v.validateNotifyText(title)
    if (!t.ok) return false
    notify.send(t.value, v.validateNotifyText(body).value || '')
    return true
  })
  ipcMain.handle('window-minimize', () => { if (windowMgr.window) windowMgr.window.minimize(); return true })
  ipcMain.handle('window-show', () => { if (windowMgr.window) (windowMgr.window.show(), windowMgr.window.focus()); return true })
  ipcMain.handle('window-close', async () => {
    await safeShutdownCheckOut('ipc-window-close')
    return true
  })

  // ==================== Updater ====================
  ipcMain.handle('check-for-updates', async () => { await updater.checkForUpdates(); return updater.getUpdateInfo() })
  ipcMain.handle('download-update', async () => await updater.downloadUpdate())
  ipcMain.handle('quit-and-install', () => { updater.quitAndInstall(); return true })
  ipcMain.handle('get-encryption-status', () => storage.getEncryptionStatus())
}

module.exports = { registerBaseIpcHandlers }
