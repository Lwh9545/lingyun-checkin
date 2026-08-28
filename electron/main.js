const { app } = require('electron')
const path = require('path')

// ══════════════════════════════════════════
// GPU hardware acceleration（必须在 app.ready 前执行）
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
const { createAutoStartupManager } = require('./modules/auto-startup.js')
const { registerBaseIpcHandlers } = require('./modules/ipc-handlers.js')
const { registerCloudIpcHandlers } = require('./modules/cloud-ipc.js')
const { createLifecycleManager } = require('./modules/lifecycle.js')

// ==================== Constants ====================
// 版本单一真相源：package.json（打包后由 app.getVersion() 提供），禁止硬编码
const APP_VERSION = app.getVersion()
const WINDOW_READY_DELAY = 2000

// ==================== Global state ====================
app.isQuitting = false
const userDataPath = app.getPath('userData')

// Initialize logger
initLogger(path.join(userDataPath, 'logs'), 'INFO')
const log = createLogger('main')

// Initialize storage
const storage = createStorage(userDataPath)
const { getStorageSync, setStorageSync } = storage

// Initialize backup
const backup = createBackupManager(storage, userDataPath, APP_VERSION)

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

// Initialize auto-startup manager
const autoStartup = createAutoStartupManager({ app, log })

// Initialize lifecycle manager
const lifecycle = createLifecycleManager({
  app, windowMgr, autoCheck, reminder, updater, autoStartup,
  backup, storage, trayMgr, log, windowReadyDelay: WINDOW_READY_DELAY
})

// ==================== Register IPC handlers ====================
registerBaseIpcHandlers({
  storage, backup, windowMgr, notify, trayMgr, updater, autoStartup,
  log, APP_VERSION, safeShutdownCheckOut: lifecycle.safeShutdownCheckOut
})
registerCloudIpcHandlers({ windowMgr, log })

// ==================== Register lifecycle ====================
lifecycle.registerProcessSignals()
lifecycle.registerWindowLifecycle()
lifecycle.startApp()
