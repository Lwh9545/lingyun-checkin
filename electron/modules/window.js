'use strict';

/**
 * Window management module
 */

const { BrowserWindow, app, session } = require('electron');
const path = require('path');

/**
 * 严格 CSP 策略字符串
 * - script-src 'self': 仅允许同源脚本（禁止 unsafe-eval / unsafe-inline）
 * - 移除 ws://localhost:*（Electron 不使用 HMR）
 * - worker-src 'self' blob: 兼容 xlsx Web Worker
 */
const STRICT_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://timor.tech https://*.timor.tech",
  "worker-src 'self' blob:"
].join('; ');

/**
 * 在主进程注册 CSP 响应头（比 meta 标签更可靠，覆盖 file:// 和 http://）
 * 必须在 app.ready 前调用，确保所有渲染进程加载前生效。
 */
function registerStrictCSP() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [STRICT_CSP]
      }
    });
  });
}

/**
 * @param {Object} opts
 * @param {string} opts.iconPath - path to app.ico
 * @param {string} opts.preloadPath - path to preload.js
 * @param {string} opts.distIndexPath - path to dist/index.html
 * @returns {{ mainWindow: BrowserWindow|null, createWindow: Function }}
 */
function createWindowManager(opts) {
  let mainWindow = null;

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 500, height: 900,
      minWidth: 500, minHeight: 900,
      maxWidth: 500, maxHeight: 900,
      resizable: false,
      autoHideMenuBar: true,
      useContentSize: true,
      roundedCorners: true,
      backgroundColor: '#f8fafc',
      paintWhenInitiallyHidden: true,
      backgroundThrottling: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: opts.preloadPath,
        sandbox: false,
        spellcheck: false,
        enableWebSQL: false,
        defaultEncoding: 'UTF-8',
        offscreen: false
      },
      icon: opts.iconPath,
      show: false
    });

    mainWindow.setMenu(null);

    mainWindow.once('ready-to-show', () => {
      if (!process.argv.includes('--minimized')) mainWindow.show();
    });

    // 始终加载构建产物 dist/index.html
    // （electron:dev 流程为 `vite build && electron .`，无 dev server）
    mainWindow.loadFile(opts.distIndexPath);

    // 渲染进程错误转发：console-message 把渲染报错拉到主进程日志落盘，
    // 根治"错误只在用户 DevTools 里、技能/日志看不到"的盲区（P0 工作包）
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      if (level >= 3) { // 3=ERROR
        const { createLogger } = require('../shared/logger.js');
        createLogger('renderer').error(`[console] ${message} (${sourceId}:${line})`);
      }
    });

    // 开发环境打开 DevTools 便于调试
    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    mainWindow.on('close', (event) => {
      const { app } = require('electron');
      if (!app.isQuitting) { event.preventDefault(); mainWindow.hide(); }
    });
    mainWindow.on('closed', () => { mainWindow = null; });

    return mainWindow;
  }

  return { get window() { return mainWindow; }, createWindow, registerStrictCSP };
}

module.exports = { createWindowManager };
