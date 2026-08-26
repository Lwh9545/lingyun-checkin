'use strict';

/**
 * Window management module
 */

const { BrowserWindow, app } = require('electron');
const path = require('path');

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

    if (!app.isPackaged) {
      mainWindow.loadURL('http://localhost:5173');
      mainWindow.webContents.openDevTools();
    } else {
      mainWindow.loadFile(opts.distIndexPath);
    }

    mainWindow.on('close', (event) => {
      const { app } = require('electron');
      if (!app.isQuitting) { event.preventDefault(); mainWindow.hide(); }
    });
    mainWindow.on('closed', () => { mainWindow = null; });

    return mainWindow;
  }

  return { get window() { return mainWindow; }, createWindow };
}

module.exports = { createWindowManager };
