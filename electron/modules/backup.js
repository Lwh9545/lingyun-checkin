'use strict';

/**
 * Backup & data migration module
 */

const fs = require('fs');
const path = require('path');
const { createLogger } = require('../../shared/logger.js');
const log = createLogger('backup');

const BACKUP_KEEP_COUNT = 10;

/**
 * @param {{ storagePath: string, getStorageSync, setStorageSync, invalidateCache }} storage
 * @param {string} userDataPath
 * @param {string} appVersion
 */
function createBackupManager(storage, userDataPath, appVersion) {
  const backupDir = path.join(userDataPath, 'backups');
  const { getStorageSync, setStorageSync } = storage;
  const storagePath = storage.storagePath;

  async function initDataManager() {
    try {
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
        log.info('Backup dir created:', backupDir);
      }
      await checkAndMigrateData();
      await createAutoBackup();
      log.info('Data manager initialized');
    } catch (error) {
      log.error('Init failed:', error);
    }
  }

  async function checkAndMigrateData() {
    const currentVersion = getStorageSync('app_version', '0.0.0');
    log.info(`Version: current=${currentVersion}, latest=${appVersion}`);
    if (currentVersion !== appVersion) {
      await migrateData(currentVersion, appVersion);
      await setStorageSync('app_version', appVersion);
      log.info('Data migration complete');
    }
  }

  async function migrateData(fromVersion, toVersion) {
    try {
      if (!fs.existsSync(storagePath)) return true;
      const data = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
      const migrationBackupPath = path.join(backupDir, `migration_backup_${fromVersion}_${Date.now()}.json`);
      fs.writeFileSync(migrationBackupPath, JSON.stringify(data, null, 2));
      log.info('Migration backup created:', migrationBackupPath);
      return true;
    } catch (error) {
      log.error('Migration failed:', error);
      return false;
    }
  }

  async function createAutoBackup() {
    try {
      const data = getStorageSync('attendance_records', []);
      if (!data || Object.keys(data).length === 0) return false;
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const backupPath = path.join(backupDir, `backup_${timestamp}.json`);
      fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
      log.info('Auto-backup created:', backupPath);
      await cleanupOldBackups(BACKUP_KEEP_COUNT);
      return true;
    } catch (error) {
      log.error('Auto-backup failed:', { message: error.message, stack: error.stack, name: error.name });
      return false;
    }
  }

  async function cleanupOldBackups(keepCount) {
    try {
      if (!fs.existsSync(backupDir)) return;
      const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
        .map(f => ({ name: f, path: path.join(backupDir, f), time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

      if (files.length > keepCount) {
        files.slice(keepCount).forEach(file => {
          fs.unlinkSync(file.path);
          log.info('Old backup deleted:', file.name);
        });
      }
      log.info(`Cleanup done, keeping ${Math.min(files.length, keepCount)} backups`);
    } catch (error) {
      log.error('Cleanup failed:', error);
    }
  }

  async function restoreFromBackup(backupFileName) {
    try {
      const backupPath = path.join(backupDir, backupFileName);
      if (!fs.existsSync(backupPath)) return false;
      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      if (fs.existsSync(storagePath)) {
        const currentBackupPath = path.join(backupDir, `before_restore_${Date.now()}.json`);
        const currentData = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
        fs.writeFileSync(currentBackupPath, JSON.stringify(currentData, null, 2));
      }
      fs.writeFileSync(storagePath, JSON.stringify(backupData, null, 2));
      if (storage.invalidateCache) storage.invalidateCache();
      log.info('Data restored from backup:', backupFileName);
      return true;
    } catch (error) {
      log.error('Restore failed:', error);
      return false;
    }
  }

  async function getBackupList() {
    try {
      if (!fs.existsSync(backupDir)) return [];
      return fs.readdirSync(backupDir)
        .filter(f => (f.startsWith('backup_') || f.startsWith('migration_')) && f.endsWith('.json'))
        .map(f => {
          const filePath = path.join(backupDir, f);
          const stats = fs.statSync(filePath);
          return { name: f, path: filePath, size: stats.size, created: stats.birthtime, modified: stats.mtime };
        })
        .sort((a, b) => b.modified - a.modified);
    } catch (error) {
      log.error('Get backup list failed:', error);
      return [];
    }
  }

  async function exportData(exportPath) {
    try {
      if (!fs.existsSync(storagePath)) return false;
      const data = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
      const exportContent = { version: appVersion, exportTime: new Date().toISOString(), data: data };
      fs.writeFileSync(exportPath, JSON.stringify(exportContent, null, 2));
      log.info('Data exported:', exportPath);
      return true;
    } catch (error) {
      log.error('Export failed:', error);
      return false;
    }
  }

  async function importData(importPath) {
    try {
      if (!fs.existsSync(importPath)) return { success: false, error: 'File not found' };
      const importContent = JSON.parse(fs.readFileSync(importPath, 'utf8'));
      if (!importContent.data) return { success: false, error: 'Invalid import file format' };
      if (fs.existsSync(storagePath)) await createAutoBackup();
      fs.writeFileSync(storagePath, JSON.stringify(importContent.data, null, 2));
      if (storage.invalidateCache) storage.invalidateCache();
      log.info('Data imported successfully');
      return { success: true, version: importContent.version, time: importContent.exportTime };
    } catch (error) {
      log.error('Import failed:', error);
      return { success: false, error: error.message };
    }
  }

  return {
    backupDir,
    initDataManager,
    createAutoBackup,
    restoreFromBackup,
    getBackupList,
    exportData,
    importData,
    moveToRecycleBin
  };

  /**
   * 把记录移到回收站(软删除),30 天内可恢复
   * 落地 FW-003:破坏性操作必须给后悔药
   * @param {Array} records - 即将被清空的记录
   * @returns {string} 回收站文件名(用于恢复)
   */
  function moveToRecycleBin(records) {
    const recycleDir = path.join(userDataPath, 'recycle');
    if (!fs.existsSync(recycleDir)) {
      fs.mkdirSync(recycleDir, { recursive: true });
    }
    // 清理 30 天前的回收站文件
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    try {
      for (const f of fs.readdirSync(recycleDir)) {
        const fp = path.join(recycleDir, f);
        const stat = fs.statSync(fp);
        if (stat.mtimeMs < thirtyDaysAgo) {
          fs.unlinkSync(fp);
          log.info(`Recycle: expired ${f}`);
        }
      }
    } catch (e) {
      log.warn('Recycle: cleanup failed', e.message);
    }
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `recycle_${ts}.json`;
    fs.writeFileSync(
      path.join(recycleDir, filename),
      JSON.stringify({ records, deletedAt: new Date().toISOString(), count: records.length }, null, 2)
    );
    log.info(`Recycle: moved ${records.length} records to ${filename}`);
    return filename;
  }
}

module.exports = { createBackupManager };
