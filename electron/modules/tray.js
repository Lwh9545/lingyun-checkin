'use strict';

/**
 * Tray management module
 */

const { Tray, Menu, shell, nativeImage } = require('electron');

const FALLBACK_ICON_DATA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAGPSURBVFhH7ZY9TsNAEIXXG0IqBBJSUlBQQEJJQ0dvwRtwA16AN+ANeAN6egeChIQAIaGgoEBIhJg4Tuw4Tuw4Tuw4Tuw4dvy+kp+vM4lE4t/2e2Zh7/0mIYT/D4g/x4H8D4g/x0H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8B4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8D4g/x4H8='

/**
 * @param {Object} opts
 * @param {Function} opts.getValidIcon
 * @param {Function} opts.getMainWindow
 * @param {Function} opts.createWindow
 * @param {string} opts.userDataPath
 * @param {Function} opts.shutdownHandler - autoCheckOutOnShutdown
 * @param {Object} opts.log
 * @param {Object} opts.TRAY_STATUS
 * @param {number} opts.windowReadyDelay
 */
function createTrayManager(opts) {
  let tray = null;

  function updateTrayStatus(status) {
    if (!tray) return;
    const statusText = {
      [opts.TRAY_STATUS.NONE]: '灵韵打卡 - 未打卡',
      [opts.TRAY_STATUS.CHECKED_IN]: '灵韵打卡 - 已签到',
      [opts.TRAY_STATUS.CHECKED_OUT]: '灵韵打卡 - 已签退',
      [opts.TRAY_STATUS.COMPLETED]: '灵韵打卡 - 已完成'
    };
    tray.setToolTip(statusText[status] || '灵韵考勤打卡');
  }

  function createTray() {
    try {
      const trayIcon = opts.getValidIcon();
      if (!trayIcon || trayIcon.isEmpty()) {
        opts.log.warn('Tray icon not found, using fallback');
        tray = new Tray(nativeImage.createFromDataURL(FALLBACK_ICON_DATA));
      } else {
        tray = new Tray(trayIcon);
        opts.log.info('Tray icon loaded');
      }
    } catch (error) {
      opts.log.error('Tray creation failed:', error);
      tray = new Tray(nativeImage.createFromDataURL(FALLBACK_ICON_DATA));
    }

    const { app } = require('electron');
    const contextMenu = Menu.buildFromTemplate([
      { label: '显示窗口', click: () => {
        const win = opts.getMainWindow();
        win ? (win.show(), win.focus()) : opts.createWindow();
      }},
      { type: 'separator' },
      { label: '立即签到', click: () => {
        const win = opts.getMainWindow();
        win && (win.show(), win.focus(), win.webContents.send('trigger-check-in'));
      }},
      { label: '立即签退', click: () => {
        const win = opts.getMainWindow();
        win && (win.show(), win.focus(), win.webContents.send('trigger-check-out'));
      }},
      { type: 'separator' },
      { label: '打开数据目录', click: () => shell.openPath(opts.userDataPath) },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          opts.log.info('Tray: exit clicked, calling app.quit() (shutdown handler via before-quit)');
          app.quit();
        }
      }
    ]);

    tray.setToolTip('灵韵考勤打卡');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
      const win = opts.getMainWindow();
      win ? (win.show(), win.focus()) : opts.createWindow();
    });
    tray.on('click', () => {
      const win = opts.getMainWindow();
      if (win) win.isVisible() ? win.hide() : (win.show(), win.focus());
    });
  }

  return { get tray() { return tray; }, createTray, updateTrayStatus };
}

module.exports = { createTrayManager };
