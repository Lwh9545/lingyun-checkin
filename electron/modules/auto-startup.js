'use strict'

/**
 * 开机自启管理器（从 main.js 拆分 FW-005）
 *
 * 职责：管理 Windows/macOS 开机自启状态
 * 设计：Electron API 为主路径，注册表作为 Windows 平台二次确认与回退兜底
 * P1-4 加固：Windows 注册表操作统一使用 execFile('reg.exe', [数组参数]) — 禁用 shell 拼接，防命令注入
 */

const { execFile } = require('child_process')
const { promisify } = require('util')
const execFileAsync = promisify(execFile)

const AUTO_STARTUP_REG_NAME = 'LingyunAttendance'
const REG_RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'

/**
 * 创建开机自启管理器
 * @param {{ app: Electron.App, log: import('../../shared/logger').Logger }} opts
 * @returns {{
 *   setAutoStartup: (enabled: boolean) => Promise<{success: boolean, method: string, error?: string}>,
 *   getAutoStartupStatus: () => Promise<boolean>
 * }}
 */
function createAutoStartupManager({ app, log }) {
  /**
   * 通过 Windows 注册表设置开机自启（Electron 原生 API 的回退方案）
   * P1-4 加固：execFile('reg.exe', args) 无 shell，参数按数组传递避免 exePath 里含 " & calc.exe" 类注入
   * @param {boolean} enabled - 是否启用
   * @returns {Promise<boolean>} 是否成功
   */
  async function setAutoStartupViaRegistry(enabled) {
    if (process.platform !== 'win32') return false
    try {
      const exePath = process.execPath
      // 值："C:\Program Files\xxx.exe" --minimized（引号包裹路径本身，保证路径含空格时仍正确执行）
      const regValue = `"${exePath}" --minimized`
      if (enabled) {
        await execFileAsync('reg.exe', [
          'add', REG_RUN_KEY,
          '/v', AUTO_STARTUP_REG_NAME,
          '/t', 'REG_SZ',
          '/d', regValue,
          '/f'
        ], { windowsHide: true, stdio: 'ignore' })
      } else {
        await execFileAsync('reg.exe', [
          'delete', REG_RUN_KEY,
          '/v', AUTO_STARTUP_REG_NAME,
          '/f'
        ], { windowsHide: true, stdio: 'ignore' })
      }
      return true
    } catch (regError) {
      log.warn('Registry auto-startup fallback failed:', regError.message)
      return false
    }
  }

  /**
   * 读取 Windows 注册表中的开机自启状态
   * P1-4 加固：execFile('reg.exe', args) 数组参数
   * @returns {Promise<boolean|null>} 注册表中是否启用，读不到返回 null
   */
  async function getAutoStartupFromRegistry() {
    if (process.platform !== 'win32') return null
    try {
      const { stdout } = await execFileAsync('reg.exe', [
        'query', REG_RUN_KEY,
        '/v', AUTO_STARTUP_REG_NAME
      ], { encoding: 'utf8', windowsHide: true })
      return stdout.includes(AUTO_STARTUP_REG_NAME)
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
        // 校验 Electron API 是否真的写入成功，失败则走注册表回退（P1-4：await 注册表函数）
        const actualAfter = app.getLoginItemSettings().openAtLogin
        if (actualAfter !== enabled) {
          log.warn(`Electron setLoginItemSettings mismatch, expected=${enabled}, actual=${actualAfter}, fallback to registry`)
          const regOk = await setAutoStartupViaRegistry(enabled)
          if (regOk) methodName = 'registry-fallback'
        } else {
          // API 成功的同时同步写注册表，双重保障
          await setAutoStartupViaRegistry(enabled)
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
        const regOk = await setAutoStartupViaRegistry(enabled)
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
   * P1-4：getAutoStartupFromRegistry 已 async，await 兜底
   * @returns {Promise<boolean>}
   */
  async function getAutoStartupStatus() {
    try {
      if (process.platform === 'win32') {
        const apiStatus = app.getLoginItemSettings().openAtLogin
        const regStatus = await getAutoStartupFromRegistry()
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
        const regStatus = await getAutoStartupFromRegistry()
        return regStatus === true
      }
      return false
    }
  }

  return { setAutoStartup, getAutoStartupStatus }
}

module.exports = { createAutoStartupManager }
