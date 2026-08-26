'use strict';

/**
 * Structured logger with file output
 * Usage:
 *   const { createLogger } = require('./shared/logger.js')
 *   const log = createLogger('module-name')
 *   log.info('message', { extra: 'data' })
 */

const fs = require('fs');
const path = require('path');

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const LOG_LABELS = { 0: 'DEBUG', 1: 'INFO', 2: 'WARN', 3: 'ERROR' };

/** @type {string|null} log file path (null = no file output) */
let _logFilePath = null;
let _minLevel = LOG_LEVELS.DEBUG;

/**
 * Initialize log file path and minimum level
 * @param {string} logDir - log directory
 * @param {'DEBUG'|'INFO'|'WARN'|'ERROR'} minLevel
 */
function initLogger(logDir, minLevel = 'INFO') {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const today = new Date().toISOString().slice(0, 10);
  _logFilePath = path.join(logDir, `app-${today}.log`);
  _minLevel = LOG_LEVELS[minLevel] || LOG_LEVELS.INFO;

  // Clean logs older than 7 days
  try {
    const files = fs.readdirSync(logDir).filter(f => f.endsWith('.log'));
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    files.forEach(f => {
      const fp = path.join(logDir, f);
      if (fs.statSync(fp).mtimeMs < cutoff) fs.unlinkSync(fp);
    });
  } catch (_) { /* ignore cleanup errors */ }
}

/**
 * Create module logger
 * @param {string} tag - module identifier
 * @returns {{ debug, info, warn, error }}
 */
function createLogger(tag) {
  function _write(level, ...args) {
    if (level < _minLevel) return;
    const now = new Date();
    const _pad = (n) => String(n).padStart(2, '0');
    const ts = `${now.getFullYear()}-${_pad(now.getMonth() + 1)}-${_pad(now.getDate())} ${_pad(now.getHours())}:${_pad(now.getMinutes())}:${_pad(now.getSeconds())}`;
    const label = LOG_LABELS[level] || '?';
    const message = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');

    // Console
    const consoleFn = level >= LOG_LEVELS.ERROR ? console.error : level >= LOG_LEVELS.WARN ? console.warn : console.log;
    consoleFn(`[${ts}] [${label}] [${tag}] ${message}`);

    // File
    if (_logFilePath) {
      try {
        fs.appendFileSync(_logFilePath, `[${ts}] [${label}] [${tag}] ${message}\n`);
      } catch (_) { /* ignore write errors */ }
    }
  }

  return {
    debug: (...args) => _write(LOG_LEVELS.DEBUG, ...args),
    info: (...args) => _write(LOG_LEVELS.INFO, ...args),
    warn: (...args) => _write(LOG_LEVELS.WARN, ...args),
    error: (...args) => _write(LOG_LEVELS.ERROR, ...args)
  };
}

module.exports = { createLogger, initLogger, LOG_LEVELS };
