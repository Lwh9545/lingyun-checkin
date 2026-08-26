const { app, ipcMain, shell, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

// ══════════════════════════════════════════
// GPU hardware acceleration
// ══════════════════════════════════════════
app.commandLine.appendSwitch('high-dpi-support', '1')
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('ignore-gpu-blocklist')
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('enable-features', 'UseSkiaRenderer')
}

// ── Windows taskbar icon binding ──
app.setAppUserModelId('com.lingyun.attendance')

// ==================== Shared modules ====================
const { TIME, DEFAULTS, TRAY_STATUS } = require('../shared/constants.js')
const { getTodayString, formatTimeShort, timeToMinutes, calculateTargetTime, isTimeToCheck, isWorkDay } = require('../shared/dateUtils.js')

// ==================== TypeScript shared types (for type hints) ====================
const { DEFAULT_CONFIG, STORAGE_KEYS } = require('../shared/types.js')

// ==================== Business modules ====================
const { createStorage } = require('./modules/storage')
const { createBackupManager } = require('./modules/backup')
const { createLogger, initLogger } = require('../shared/logger.js')

// ==================== App modules ====================
const { createIconUtils } = require('./modules/icon-utils.js')
const { createWindowManager } = require('./modules/window.js')
const { createTrayManager } = require('./modules/tray.js')
const { createNotificationManager } = require('./modules/notification.js')
const { createAutoCheckManager } = require('./modules/auto-check.js')
const { createUpdater } = require('./modules/updater.js')
const { createReminderManager } = require('./modules/reminder.js')
const { initCloudStorage, listFiles, uploadFile, uploadFileFromData, downloadFile, createFolder, deleteFile, renameFile, selectFilesToUpload, getStorageStats } = require('./modules/file-manager.js')

// ==================== Constants ====================
const APP_VERSION = '2.0.0'
const WINDOW_READY_DELAY = 2000

// ==================== Global state ====================
app.isQuitting = false
const userDataPath = app.getPath('userData')

// Initialize logger
initLogger(path.join(userDataPath, 'logs'), 'INFO')
const log = createLogger('main')

// Initialize storage
const storage = createStorage(userDataPath)
const { getStorageSync, setStorageSync, overwriteStorageSync, removeStorageSync, ensureStorageFile } = storage

// Initialize backup
const backup = createBackupManager(storage, userDataPath, APP_VERSION)
const { backupDir, initDataManager, getBackupList, restoreFromBackup, exportData, importData } = backup

// Initialize icon utilities
const { getValidIcon } = createIconUtils(app)

// Initialize window manager
const windowMgr = createWindowManager({
  iconPath: path.join(__dirname, '../public/app.ico'),
  preloadPath: path.join(__dirname, 'preload.js'),
  distIndexPath: path.join(__dirname, '../dist/index.html')
})

// Initialize notification manager
const notify = createNotificationManager({
  getValidIcon,
  getMainWindow: () => windowMgr.window,
  createWindow: () => windowMgr.createWindow(),
  log
})

// Initialize auto-check manager
const autoCheck = createAutoCheckManager({
  getStorageSync,
  setStorageSync,
  getMainWindow: () => windowMgr.window,
  sendNotification: notify.send,
  log,
  DEFAULTS,
  TIME,
  dateUtils: { getTodayString, formatTimeShort, timeToMinutes, calculateTargetTime, isTimeToCheck, isWorkDay }
})

// Initialize tray manager
const trayMgr = createTrayManager({
  getValidIcon,
  getMainWindow: () => windowMgr.window,
  createWindow: () => windowMgr.createWindow(),
  userDataPath,
  shutdownHandler: () => autoCheck.shutdownCheckOut(),
  log,
  TRAY_STATUS,
  windowReadyDelay: WINDOW_READY_DELAY
})

// Initialize updater
const updater = createUpdater({
  getMainWindow: () => windowMgr.window,
  getStorageSync: storage.getStorageSync,
  setStorageSync: storage.setStorageSync,
  log,
  APP_VERSION,
  app
})

// Initialize reminder manager
const reminder = createReminderManager({
  getStorageSync: storage.getStorageSync,
  setStorageSync: storage.setStorageSync,
  sendNotification: notify.send,
  log,
  DEFAULTS,
  dateUtils: { getTodayString, formatTimeShort, timeToMinutes, calculateTargetTime, isTimeToCheck, isWorkDay }
})

// Initialize file manager is not needed - functions are imported directly

// ==================== Auto-startup ====================
const { execSync } = require('child_process')
const AUTO_STARTUP_REG_NAME = 'LingyunAttendance'
const REG_RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'

/**
 * 通过 Windows 注册表设置开机自启（Electron 原生 API 的回退方案）
 * 注册表值中 exe 路径用反斜杠转义的引号包裹，保证路径含空格时仍正确执行
 * @param {boolean} enabled - 是否启用
 * @returns {boolean} 是否成功
 */
function setAutoStartupViaRegistry(enabled) {
  if (process.platform !== 'win32') return false
  try {
    const exePath = process.execPath
    if (enabled) {
      // 构造：\"C:\Program Files\xxx.exe\" --minimized，外层用整体引号包裹传给 reg add /d
      const escapedInner = `\\"${exePath}\\" --minimized`
      execSync(
        `reg add "${REG_RUN_KEY}" /v ${AUTO_STARTUP_REG_NAME} /t REG_SZ /d "${escapedInner}" /f`,
        { stdio: 'ignore' }
      )
    } else {
      execSync(
        `reg delete "${REG_RUN_KEY}" /v ${AUTO_STARTUP_REG_NAME} /f`,
        { stdio: 'ignore' }
      )
    }
    return true
  } catch (regError) {
    log.warn('Registry auto-startup fallback failed:', regError.message)
    return false
  }
}

/**
 * 读取 Windows 注册表中的开机自启状态
 * @returns {boolean|null} 注册表中是否启用，读不到返回 null
 */
function getAutoStartupFromRegistry() {
  if (process.platform !== 'win32') return null
  try {
    const result = execSync(
      `reg query "${REG_RUN_KEY}" /v ${AUTO_STARTUP_REG_NAME}`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    )
    return result.includes(AUTO_STARTUP_REG_NAME)
  } catch (_) {
    return null
  }
}

/**
 * 设置开机自启动
 * @param {boolean} enabled - 是否启用
 * @returns {Promise<{success: boolean, method: string, error?: string}>}
 */
async function setAutoStartup(enabled) {
  if (!app.isPackaged) {
    log.info('Dev mode, auto-startup skipped')
    return { success: true, method: 'skipped-dev' }
  }
  try {
    let methodName = ''
    if (process.platform === 'win32') {
      // Windows：仅使用 Electron 官方支持的参数
      app.setLoginItemSettings({
        openAtLogin: enabled,
        args: ['--minimized']
      })
      methodName = 'setLoginItemSettings'
      // 校验 Electron API 是否真的写入成功，失败则走注册表回退
      const actualAfter = app.getLoginItemSettings().openAtLogin
      if (actualAfter !== enabled) {
        log.warn(`Electron setLoginItemSettings mismatch, expected=${enabled}, actual=${actualAfter}, fallback to registry`)
        const regOk = setAutoStartupViaRegistry(enabled)
        if (regOk) methodName = 'registry-fallback'
      } else {
        // API 成功的同时同步写注册表，双重保障
        setAutoStartupViaRegistry(enabled)
      }
    } else if (process.platform === 'darwin') {
      app.setLoginItemSettings({
        openAtLogin: enabled,
        openAsHidden: true,
        args: ['--minimized']
      })
      methodName = 'setLoginItemSettings'
    } else {
      log.warn('Auto-startup not supported on this platform:', process.platform)
      return { success: false, error: 'Platform not supported' }
    }
    log.info(`Auto-startup: ${enabled ? 'enabled' : 'disabled'}, method=${methodName}`)
    return { success: true, method: methodName }
  } catch (error) {
    log.error('Auto-startup set failed:', error)
    // 主路径失败也尝试一下注册表回退
    if (process.platform === 'win32') {
      const regOk = setAutoStartupViaRegistry(enabled)
      if (regOk) {
        log.info('Auto-startup succeeded via catch-block registry fallback')
        return { success: true, method: 'registry-catch-fallback' }
      }
    }
    return { success: false, error: error.message }
  }
}

/**
 * 获取开机自启动状态（优先 Electron API，注册表作为二次确认）
 * @returns {boolean}
 */
function getAutoStartupStatus() {
  try {
    if (process.platform === 'win32') {
      const apiStatus = app.getLoginItemSettings().openAtLogin
      const regStatus = getAutoStartupFromRegistry()
      if (regStatus !== null) {
        return apiStatus || regStatus
      }
      return apiStatus
    }
    if (process.platform === 'darwin') {
      return app.getLoginItemSettings().openAtLogin
    }
    return false
  } catch (error) {
    log.error('Auto-startup get failed:', error)
    // 读取 API 失败时尝试注册表兜底
    if (process.platform === 'win32') {
      const regStatus = getAutoStartupFromRegistry()
      return regStatus === true
    }
    return false
  }
}

// ==================== IPC Handlers ====================
ipcMain.on('update-tray-status', (event, status) => trayMgr.updateTrayStatus(status))

ipcMain.handle('storage-get', (event, key, defaultValue) => getStorageSync(key, defaultValue))
ipcMain.handle('storage-set', async (event, key, value) => setStorageSync(key, value))
ipcMain.handle('storage-overwrite', async (event, key, value) => overwriteStorageSync(key, value))
ipcMain.handle('storage-remove', async (event, key) => removeStorageSync(key))

ipcMain.handle('auto-startup-set', async (event, enabled) => { return await setAutoStartup(enabled) })
ipcMain.handle('auto-startup-get', () => getAutoStartupStatus())
ipcMain.handle('get-backup-list', async () => getBackupList())
ipcMain.handle('restore-from-backup', async (event, name) => restoreFromBackup(name))
ipcMain.handle('export-data', async (event, p) => exportData(p))
ipcMain.handle('import-data', async (event, p) => importData(p))
ipcMain.handle('get-app-version', () => APP_VERSION)
ipcMain.handle('dialog-show-save', (event, options) => dialog.showSaveDialog(windowMgr.window, options))
ipcMain.handle('dialog-show-open', (event, options) => dialog.showOpenDialog(windowMgr.window, options))
ipcMain.handle('shell-open-path', (event, filePath) => shell.openPath(filePath))
ipcMain.handle('send-notification', (event, title, body) => { notify.send(title, body); return true })
ipcMain.handle('window-minimize', () => { if (windowMgr.window) windowMgr.window.minimize(); return true })
ipcMain.handle('window-show', () => { if (windowMgr.window) (windowMgr.window.show(), windowMgr.window.focus()); return true })
// NOTE: window-close moved to module-level safeShutdownCheckOut() path — see App Lifecycle section

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

ipcMain.handle('clear-all-records', async () => {
  return overwriteStorageSync('attendance_records', [])
})

// ── Updater IPC ──
ipcMain.handle('check-for-updates', async () => { await updater.checkForUpdates(); return updater.getUpdateInfo() })
ipcMain.handle('download-update', async () => await updater.downloadUpdate())
ipcMain.handle('quit-and-install', () => { updater.quitAndInstall(); return true })
ipcMain.handle('get-encryption-status', () => storage.getEncryptionStatus())

// ── Cloud File Manager IPC ──
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

// ==================== App Lifecycle ====================

// ========== 可靠的关机自动签退：模块级变量（供 IPC / before-quit / event handlers 共同访问）==========
let _shutdownCheckOutDone = false
let _autoCheckRef = null

/** 同步等待关机签退最多 SHUTDOWN_MAX_WAIT_MS，保证 Windows 关机场景数据写入成功 */
async function safeShutdownCheckOut(source) {
  if (_shutdownCheckOutDone) {
    log.info(`[shutdown] Skipped (already done), source=${source}`)
    return null
  }
  if (!_autoCheckRef) {
    log.warn(`[shutdown] _autoCheckRef not ready, source=${source}`)
    return null
  }
  _shutdownCheckOutDone = true
  log.info(`[shutdown] Execute: source=${source}`)
  try {
    const SHUTDOWN_MAX_WAIT_MS = 4500
    const timeoutPromise = new Promise(resolve => setTimeout(() => {
      log.warn(`[shutdown] Timeout after ${SHUTDOWN_MAX_WAIT_MS}ms, source=${source}`)
      resolve(null)
    }, SHUTDOWN_MAX_WAIT_MS))
    const result = await Promise.race([
      _autoCheckRef.shutdownCheckOut(),
      timeoutPromise
    ])
    log.info(`[shutdown] Result: ${JSON.stringify(result)}, source=${source}`)
    return result
  } catch (err) {
    log.error(`[shutdown] Exception, source=${source}:`, err)
    return null
  }
}

// IPC window-close 使用统一路径（因为窗口关闭默认是 hide，基本不会到这里）
ipcMain.handle('window-close', async () => {
  await safeShutdownCheckOut('ipc-window-close')
  return true
})

// Path 4（在 app.whenReady 外部先声明，避免重复绑定）
process.on('SIGTERM', () => {
  log.info('[SIGTERM] received')
  safeShutdownCheckOut('SIGTERM').then(() => process.exit(0))
})
process.on('SIGINT', () => {
  log.info('[SIGINT] received')
  safeShutdownCheckOut('SIGINT').then(() => process.exit(0))
})

// Path 2: Windows powerMonitor.shutdown —— 在 ready 时绑定（powerMonitor 需 app ready）

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = windowMgr.window
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  // Path 1: 标准退出（菜单退出 / app.quit() / tray quit），在 ready-to-show 外绑定
  app.on('before-quit', async (event) => {
    if (app.isQuitting) return
    app.isQuitting = true
    log.info('[before-quit] event received, preventing default for shutdown check-out')
    event.preventDefault()
    await safeShutdownCheckOut('before-quit')
    setTimeout(() => {
      log.info('[before-quit] Calling app.exit(0)')
      app.exit(0)
    }, 200)
  })

  app.whenReady().then(async () => {
    ensureStorageFile()
    _autoCheckRef = autoCheck
    log.info('App starting...')

    if (require('electron').Notification.isSupported()) log.info('Notification: OK')
    log.info('Platform:', process.platform)

    windowMgr.createWindow()
    trayMgr.createTray()

    // Path 2: Windows 系统关机/重启/注销 —— powerMonitor.shutdown（必须在 ready 之后注册）
    if (process.platform === 'win32') {
      try {
        const { powerMonitor } = require('electron')
        powerMonitor.on('shutdown', () => {
          log.info('[powerMonitor.shutdown] Shutdown event received')
          safeShutdownCheckOut('powerMonitor.shutdown').finally(() => {
            // 写日志后立即终止（Windows 给的时间很有限）
            setTimeout(() => app.exit(0), 100)
          })
        })
        powerMonitor.on('lock-screen', () => {
          log.info('[powerMonitor] lock-screen (no action)')
        })
      } catch (err) {
        log.warn('powerMonitor unavailable:', err.message)
      }
    }

    const win = windowMgr.window
    win?.once('ready-to-show', async () => {
      await initDataManager()

      if (app.isPackaged) {
        try {
          const autoStartup = getStorageSync('autoStartup', false)
          // 每次启动都主动同步一次系统自启状态（含关闭时也要清理注册表），
          // 防止用户在外部（如任务管理器）修改后与设置页不一致
          const result = await setAutoStartup(Boolean(autoStartup))
          log.info(
            result.success
              ? `autoStartup: synchronized (user=${autoStartup}, method=${result.method})`
              : `autoStartup: sync failed (user=${autoStartup}, error=${result.error})`
          )
        } catch (error) {
          log.error('autoStartup sync failed:', error)
        }
      }

      if (process.argv.includes('--minimized')) {
        log.info('Starting minimized')
        const w = windowMgr.window
        if (w) w.hide()
      }

      autoCheck.start()

      // 启动定时提醒
      reminder.start()

      // 启动周期性更新检查 + 首次延迟检查
      updater.startPeriodicCheck()
      setTimeout(() => updater.checkForUpdates(), 10000)

      setTimeout(() => {
        try {
          autoCheck.checkOnStartup()
        } catch (error) {
          log.error('Startup check failed:', error)
        }
      }, WINDOW_READY_DELAY)

      log.info('App startup complete')
    })
  })
}

app.on('window-all-closed', () => {})
app.on('activate', () => {
  const win = windowMgr.window
  if (win === null) windowMgr.createWindow()
  else win.show()
})
