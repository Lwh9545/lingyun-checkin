'use strict';

/**
 * Storage module — persistent read/write with memory cache + safeStorage encryption
 * 
 * Encryption: Uses Electron safeStorage (OS keychain-backed AES-GCM)
 * Format: Plain JSON by default; encrypted files have "LYEN" magic header
 * Graceful fallback: if safeStorage unavailable, stores plain JSON
 */

const fs = require('fs');
const path = require('path');
const { mergeRecords } = require('../../shared/recordMerger.js');
const { createLogger } = require('../../shared/logger.js');
const { shouldBackupToday, rotateBackups, todayBackupName, AUTO_RE } = require('./auto-backup.js');
const log = createLogger('storage');

// ── Encryption constants ──
const ENC_MAGIC = Buffer.from('LYEN'); // 4-byte header for encrypted files
const ENC_VERSION = 1;

/**
 * @param {string} userDataPath — Electron userData directory
 * @returns {{ storagePath, ensureStorageFile, getStorageSync, setStorageSync, overwriteStorageSync, removeStorageSync }}
 */
function createStorage(userDataPath) {
  const storagePath = path.join(userDataPath, 'storage.json');

  // ── Memory cache ──
  let _dataCache = null;
  let _cacheDirty = true;
  let _isEncrypted = false;
  let _safeStorageAvailable = false;

  // ── Lazy init safeStorage ──
  let _safeStorage = null;
  function _getSafeStorage() {
    if (_safeStorage !== null) return _safeStorage;
    try {
      _safeStorage = require('electron').safeStorage;
      if (_safeStorage && _safeStorage.isEncryptionAvailable()) {
        _safeStorageAvailable = true;
        log.info('safeStorage: encryption available');
      } else {
        log.info('safeStorage: encryption not available, storing plain');
      }
    } catch (e) {
      _safeStorage = null;
      log.info('safeStorage: API unavailable');
    }
    return _safeStorage;
  }

  function _encrypt(plainText) {
    const ss = _getSafeStorage();
    if (!ss || !_safeStorageAvailable) return null;
    try {
      const encrypted = ss.encryptString(plainText);
      // Prepend magic header + version
      const header = Buffer.alloc(5);
      ENC_MAGIC.copy(header);
      header[4] = ENC_VERSION;
      return Buffer.concat([header, encrypted]);
    } catch (e) {
      log.error('Encryption failed:', e.message);
      return null;
    }
  }

  function _decrypt(buffer) {
    const ss = _getSafeStorage();
    if (!ss || !_safeStorageAvailable) return null;
    try {
      // Strip 5-byte header
      const encrypted = buffer.slice(5);
      return ss.decryptString(encrypted);
    } catch (e) {
      log.error('Decryption failed:', e.message);
      return null;
    }
  }

  function _isEncryptedFile(buf) {
    return buf.length >= 5
      && buf[0] === ENC_MAGIC[0]
      && buf[1] === ENC_MAGIC[1]
      && buf[2] === ENC_MAGIC[2]
      && buf[3] === ENC_MAGIC[3];
  }

  function _readData() {
    if (!_cacheDirty && _dataCache !== null) return _dataCache;
    ensureStorageFile();

    try {
      const raw = fs.readFileSync(storagePath);
      // Empty file
      if (raw.length === 0) {
        _dataCache = {};
        _cacheDirty = false;
        return _dataCache;
      }

      // Check if encrypted
      if (_isEncryptedFile(raw)) {
        const decrypted = _decrypt(raw);
        if (decrypted !== null) {
          _isEncrypted = true;
          _dataCache = JSON.parse(decrypted);
          _cacheDirty = false;
          return _dataCache;
        }
        // Decryption failed — fall through to plain JSON parse attempt
        log.warn('Decryption failed, trying plain JSON');
      }

      // Plain JSON
      _isEncrypted = false;
      _dataCache = JSON.parse(raw.toString('utf8'));
      _cacheDirty = false;

      // Migrate: if encryption is available and file is plain, re-encrypt
      _getSafeStorage();
      if (_safeStorageAvailable && !_isEncrypted && Object.keys(_dataCache).length > 0) {
        const encrypted = _encrypt(JSON.stringify(_dataCache, null, 2));
        if (encrypted) {
          fs.writeFileSync(storagePath, encrypted);
          _isEncrypted = true;
          log.info('Migrated storage to encrypted format');
        }
      }

      return _dataCache;
    } catch (error) {
      log.error('Read failed:', error);
      return _recoverFromCorruption();
    }
  }

  /** FM-006 损坏自愈：优先从最近 auto-backup 恢复；无备份则隔离坏文件留证（绝不静默清空后覆盖） */
  function _recoverFromCorruption() {
    let recovered = null;
    try {
      const backupDir = path.join(userDataPath, 'backups');
      if (fs.existsSync(backupDir)) {
        const autos = fs.readdirSync(backupDir).filter(f => AUTO_RE.test(f)).sort().reverse();
        for (const name of autos) {
          try {
            const raw = fs.readFileSync(path.join(backupDir, name));
            const text = _isEncryptedFile(raw) ? _decrypt(raw) : raw.toString('utf8');
            recovered = JSON.parse(text);
            // 恢复内容原子写回主文件，并重建缓存
            const json = JSON.stringify(recovered, null, 2);
            const tmpPath = storagePath + '.tmp';
            fs.writeFileSync(tmpPath, json);
            fs.renameSync(tmpPath, storagePath);
            _dataCache = recovered;
            _cacheDirty = false;
            _isEncrypted = false;
            log.warn('FM-006 self-heal: recovered storage from', name);
            return _dataCache;
          } catch (e) { /* 该备份也坏，尝试更早一份 */ }
        }
      }
      // 无可用备份：隔离坏文件保留证据
      try {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        fs.renameSync(storagePath, path.join(userDataPath, `storage.json.corrupt-${stamp}`));
      } catch (e) { /* 文件可能不存在 */ }
      log.warn('Corrupt storage quarantined, starting fresh (no usable backup)');
    } catch (e) {
      log.error('Recovery failed:', e);
    }
    _dataCache = {};
    _cacheDirty = false;
    return _dataCache;
  }

  function _writeData(data) {
    try {
      const json = JSON.stringify(data, null, 2);
      const encrypted = _safeStorageAvailable ? _encrypt(json) : null;

      // 原子写：先写临时文件再 rename，强杀/断电时半写不可见（FM-006 预防）
      const tmpPath = storagePath + '.tmp';
      fs.writeFileSync(tmpPath, encrypted || json);
      fs.renameSync(tmpPath, storagePath);
      _dataCache = data;
      _cacheDirty = false;
      _isEncrypted = !!encrypted;
      return true;
    } catch (error) {
      log.error('Write failed:', error);
      _cacheDirty = true;
      return false;
    }
  }

  function ensureStorageFile() {
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    if (!fs.existsSync(storagePath)) {
      // Lazy-init safeStorage reference
      _getSafeStorage();
      const empty = '{}';
      const encrypted = _safeStorageAvailable ? _encrypt(empty) : null;
      if (encrypted) {
        fs.writeFileSync(storagePath, encrypted);
        _isEncrypted = true;
      } else {
        fs.writeFileSync(storagePath, empty);
        _isEncrypted = false;
      }
      _dataCache = {};
      _cacheDirty = false;
    }
  }

  /** 自动滚动备份：每日首次写入前快照旧状态（FW-003 后悔药 + FM-006 损坏防线），失败不阻塞主流程 */
  function ensureAutoBackup() {
    try {
      const backupDir = path.join(userDataPath, 'backups');
      if (!fs.existsSync(storagePath)) return;
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      const existing = fs.readdirSync(backupDir).filter(f => AUTO_RE.test(f));
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const latest = existing.sort().at(-1) || null;
      if (!shouldBackupToday(latest, today)) return;
      fs.copyFileSync(storagePath, path.join(backupDir, todayBackupName(today)));
      const { remove } = rotateBackups([...existing, todayBackupName(today)], 7);
      for (const f of remove) {
        try { fs.unlinkSync(path.join(backupDir, f)); } catch (e) { log.warn('rotate unlink failed:', f); }
      }
      log.info('auto-backup created:', todayBackupName(today));
    } catch (e) {
      log.warn('auto-backup skipped:', e.message);
    }
  }

  function getStorageSync(key, defaultValue = null) {
    const data = _readData();
    const value = data[key] !== undefined ? data[key] : defaultValue;
    if (key === 'attendance_records' && Array.isArray(value)) {
      return mergeRecords(value);
    }
    return value;
  }

  function setStorageSync(key, value) {
    ensureAutoBackup();
    const data = _readData();
    if (key === 'attendance_records' && Array.isArray(value)) {
      const existing = Array.isArray(data['attendance_records']) ? data['attendance_records'] : [];
      data[key] = mergeRecords([...existing, ...value]);
    } else {
      data[key] = value;
    }
    return _writeData(data);
  }

  function overwriteStorageSync(key, value) {
    ensureAutoBackup();
    const data = _readData();
    if (key === 'attendance_records' && Array.isArray(value)) {
      data[key] = mergeRecords(value);
    } else {
      data[key] = value;
    }
    return _writeData(data);
  }

  function removeStorageSync(key) {
    const data = _readData();
    delete data[key];
    return _writeData(data);
  }

  function invalidateCache() {
    _cacheDirty = true;
    _dataCache = null;
  }

  /** 获取存储加密状态 */
  function getEncryptionStatus() {
    _readData(); // ensure initialized
    return {
      encrypted: _isEncrypted,
      available: _safeStorageAvailable
    };
  }

  return {
    storagePath,
    ensureStorageFile,
    getStorageSync,
    setStorageSync,
    overwriteStorageSync,
    removeStorageSync,
    invalidateCache,
    getEncryptionStatus
  };
}

module.exports = { createStorage };
