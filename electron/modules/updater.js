'use strict';

/**
 * Auto-updater module
 * Uses electron-updater for silent background update checks
 * 
 * Configuration:
 *   Set UPDATE_FEED_URL in electron-builder publish config, or pass via env
 *   For GitHub Releases: set GH_TOKEN env var, configure publish.provider = "github"
 * 
 * Dev mode: auto-update disabled (skipped when !app.isPackaged)
 */

const { autoUpdater } = require('electron-updater');

function createUpdater(opts) {
  const { getMainWindow, getStorageSync, setStorageSync, log, APP_VERSION, app } = opts;

  // ── Configuration ──
  autoUpdater.autoDownload = false;      // Download only when user confirms
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.logger = {
    info: (msg) => log.info(`[updater] ${msg}`),
    warn: (msg) => log.warn(`[updater] ${msg}`),
    error: (msg) => log.error(`[updater] ${msg}`),
    debug: (msg) => log.info(`[updater:debug] ${msg}`),
    verbose: () => {},
    silly: () => {}
  };

  let _updateInfo = null;
  let _checkInProgress = false;

  // ── Event handlers ──
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
    _updateInfo = null;
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
    _updateInfo = {
      available: true,
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes
    };
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-available', _updateInfo);
    }
  });

  autoUpdater.on('update-not-available', () => {
    log.info('No update available');
    _updateInfo = { available: false };
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-not-available');
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-download-progress', progress);
    }
  });

  autoUpdater.on('update-downloaded', () => {
    log.info('Update downloaded, ready to install');
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-downloaded');
    }
  });

  autoUpdater.on('error', (error) => {
    log.error('Update error:', error.message);
    _updateInfo = { available: false, error: error.message };
  });

  // ── Public API ──

  /** Check for updates (no-op in dev mode) */
  async function checkForUpdates() {
    if (!app.isPackaged) {
      log.info('Dev mode, skipping update check');
      _updateInfo = { available: false, dev: true };
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('update-skipped-dev');
      }
      return;
    }
    if (_checkInProgress) return;
    _checkInProgress = true;
    try {
      await autoUpdater.checkForUpdates();
    } catch (e) {
      log.error('Update check failed:', e.message);
    } finally {
      _checkInProgress = false;
    }
  }

  /** Download the available update */
  async function downloadUpdate() {
    try {
      await autoUpdater.downloadUpdate();
      return true;
    } catch (e) {
      log.error('Download failed:', e.message);
      return false;
    }
  }

  /** Install update and restart */
  function quitAndInstall() {
    autoUpdater.quitAndInstall(true, true);
  }

  function getUpdateInfo() {
    return _updateInfo;
  }

  // ── Schedule periodic check (every 4 hours) ──
  let _checkTimer = null;

  function startPeriodicCheck() {
    if (_checkTimer) clearInterval(_checkTimer);
    const CHECK_INTERVAL = 4 * 60 * 60 * 1000; // 4h
    _checkTimer = setInterval(() => {
      if (!_checkInProgress) checkForUpdates();
    }, CHECK_INTERVAL);
    log.info(`Periodic update check: every ${CHECK_INTERVAL / 3600000}h`);
  }

  function stopPeriodicCheck() {
    if (_checkTimer) { clearInterval(_checkTimer); _checkTimer = null; }
  }

  return {
    checkForUpdates,
    downloadUpdate,
    quitAndInstall,
    getUpdateInfo,
    startPeriodicCheck,
    stopPeriodicCheck,
    autoUpdater
  };
}

module.exports = { createUpdater };
