'use strict'

/**
 * 应用生命周期管理器（从 main.js 拆分 FW-005）
 *
 * 职责：
 *  - safeShutdownCheckOut 关机签退（IPC / before-quit / SIGTERM / SIGINT / powerMonitor.shutdown 共用）
 *  - 进程信号注册（SIGTERM / SIGINT）
 *  - Electron app 事件注册（second-instance / before-quit / whenReady / window-all-closed / activate）
 *
 * 设计：纯注册函数，所有依赖通过工厂参数注入；返回 safeShutdownCheckOut 供 IPC 使用
 */

const SHUTDOWN_MAX_WAIT_MS = 4500

/**
 * 创建应用生命周期管理器
 * @param {Object} deps
 * @param {Electron.App} deps.app
 * @param {Object} deps.windowMgr - 窗口管理器
 * @param {Object} deps.autoCheck - 自动打卡管理器
 * @param {Object} deps.reminder - 提醒管理器
 * @param {Object} deps.updater - 更新器
 * @param {{ setAutoStartup: Function }} deps.autoStartup - 自启管理器
 * @param {Object} deps.backup - 备份管理器（需要 initDataManager）
 * @param {Object} deps.storage - 存储管理器（需要 ensureStorageFile / getStorageSync）
 * @param {Object} deps.trayMgr - 托盘管理器
 * @param {Object} deps.log - logger 实例
 * @param {number} deps.windowReadyDelay - 窗口就绪后延迟（ms）
 * @returns {{ safeShutdownCheckOut: (source: string) => Promise<unknown> }}
 */
function createLifecycleManager(deps) {
  const {
    app, windowMgr, autoCheck, reminder, updater, autoStartup,
    backup, storage, trayMgr, log, windowReadyDelay
  } = deps

  // 模块级状态（仅本模块可见）
  let _shutdownCheckOutDone = false
  let _autoCheckRef = null

  /**
   * 同步等待关机签退最多 SHUTDOWN_MAX_WAIT_MS，保证 Windows 关机场景数据写入成功
   * @param {string} source - 调用来源标记
   * @returns {Promise<unknown>}
   */
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

  /**
   * 注册进程级信号（SIGTERM / SIGINT）
   */
  function registerProcessSignals() {
    process.on('SIGTERM', () => {
      log.info('[SIGTERM] received')
      safeShutdownCheckOut('SIGTERM').then(() => process.exit(0))
    })
    process.on('SIGINT', () => {
      log.info('[SIGINT] received')
      safeShutdownCheckOut('SIGINT').then(() => process.exit(0))
    })
  }

  /**
   * 启动应用：注册 app event + whenReady 主流程
   */
  function startApp() {
    const gotTheLock = app.requestSingleInstanceLock()

    if (!gotTheLock) {
      app.quit()
      return
    }

    app.on('second-instance', () => {
      const win = windowMgr.window
      if (win) {
        if (win.isMinimized()) win.restore()
        win.focus()
      }
    })

    // Path 1: 标准退出（菜单退出 / app.quit() / tray quit）
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
      storage.ensureStorageFile()
      _autoCheckRef = autoCheck
      log.info('App starting...')

      if (require('electron').Notification.isSupported()) log.info('Notification: OK')
      log.info('Platform:', process.platform)

      windowMgr.createWindow()
      trayMgr.createTray()

      // Path 2: Windows 系统关机/重启/注销 —— powerMonitor.shutdown（必须在 ready 之后注册）
      if (process.platform === 'win32') {
        registerPowerMonitorHandlers()
      }

      const win = windowMgr.window
      win?.once('ready-to-show', () => onWindowReadyToShow())
    })
  }

  /**
   * 注册 Windows powerMonitor 事件处理器
   */
  function registerPowerMonitorHandlers() {
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

  /**
   * 窗口 ready-to-show 回调：执行所有"应用启动后"业务
   */
  async function onWindowReadyToShow() {
    await backup.initDataManager()

    if (app.isPackaged) {
      await syncAutoStartupOnLaunch()
    }

    if (process.argv.includes('--minimized')) {
      log.info('Starting minimized')
      const w = windowMgr.window
      if (w) w.hide()
    }

    autoCheck.start()
    reminder.start()
    updater.startPeriodicCheck()
    setTimeout(() => updater.checkForUpdates(), 10000)

    setTimeout(() => {
      try {
        autoCheck.checkOnStartup()
      } catch (error) {
        log.error('Startup check failed:', error)
      }
    }, windowReadyDelay)

    log.info('App startup complete')
  }

  /**
   * 每次启动同步系统自启状态（含关闭时清理注册表），
   * 防止用户在外部（如任务管理器）修改后与设置页不一致
   */
  async function syncAutoStartupOnLaunch() {
    try {
      const autoStartupEnabled = storage.getStorageSync('autoStartup', false)
      const result = await autoStartup.setAutoStartup(Boolean(autoStartupEnabled))
      log.info(
        result.success
          ? `autoStartup: synchronized (user=${autoStartupEnabled}, method=${result.method})`
          : `autoStartup: sync failed (user=${autoStartupEnabled}, error=${result.error})`
      )
    } catch (error) {
      log.error('autoStartup sync failed:', error)
    }
  }

  /**
   * 注册 window-all-closed / activate 事件
   */
  function registerWindowLifecycle() {
    app.on('window-all-closed', () => {})
    app.on('activate', () => {
      const win = windowMgr.window
      if (win === null) windowMgr.createWindow()
      else win.show()
    })
  }

  return {
    safeShutdownCheckOut,
    registerProcessSignals,
    startApp,
    registerWindowLifecycle
  }
}

module.exports = { createLifecycleManager }
