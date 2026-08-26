const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  storage: {
    get: (key, defaultValue) => ipcRenderer.invoke('storage-get', key, defaultValue),
    set: (key, value) => ipcRenderer.invoke('storage-set', key, value),
    overwrite: (key, value) => ipcRenderer.invoke('storage-overwrite', key, value),
    remove: (key) => ipcRenderer.invoke('storage-remove', key)
  },
  autoStartup: {
    set: (enabled) => ipcRenderer.invoke('auto-startup-set', enabled),
    get: () => ipcRenderer.invoke('auto-startup-get')
  },
  notification: {
    send: (title, body) => ipcRenderer.invoke('send-notification', title, body)
  },
  window: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    show: () => ipcRenderer.invoke('window-show'),
    close: () => ipcRenderer.invoke('window-close')
  },
  dataManager: {
    getBackupList: () => ipcRenderer.invoke('get-backup-list'),
    restoreFromBackup: (backupFileName) => ipcRenderer.invoke('restore-from-backup', backupFileName),
    deleteBackup: (backupFileName) => ipcRenderer.invoke('delete-backup', backupFileName),
    clearAllRecords: () => ipcRenderer.invoke('clear-all-records'),
    exportData: (exportPath) => ipcRenderer.invoke('export-data', exportPath),
    importData: (importPath) => ipcRenderer.invoke('import-data', importPath),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getDataStats: () => ipcRenderer.invoke('get-data-stats')
  },
  dialog: {
    showSaveDialog: (options) => ipcRenderer.invoke('dialog-show-save', options),
    showOpenDialog: (options) => ipcRenderer.invoke('dialog-show-open', options)
  },
  shell: {
    openPath: (filePath) => ipcRenderer.invoke('shell-open-path', filePath)
  },
  tray: {
    updateStatus: (status) => ipcRenderer.send('update-tray-status', status)
  },
  onNotification: (callback) => {
    ipcRenderer.on('show-notification', (event, data) => callback(data))
  },
  onTriggerCheckIn: (callback) => {
    ipcRenderer.on('trigger-check-in', () => callback())
  },
  removeTriggerCheckIn: () => {
    ipcRenderer.removeAllListeners('trigger-check-in')
  },
  onTriggerCheckOut: (callback) => {
    ipcRenderer.on('trigger-check-out', () => callback())
  },
  removeTriggerCheckOut: () => {
    ipcRenderer.removeAllListeners('trigger-check-out')
  },
  onTriggerAutoCheckIn: (callback) => {
    ipcRenderer.on('trigger-auto-check-in', () => callback())
  },
  removeTriggerAutoCheckIn: () => {
    ipcRenderer.removeAllListeners('trigger-auto-check-in')
  },
  onCheckAutoCheckIn: (callback) => {
    ipcRenderer.on('check-auto-check-in', () => callback())
  },
  removeCheckAutoCheckIn: () => {
    ipcRenderer.removeAllListeners('check-auto-check-in')
  },
  onShutdownCheckOut: (callback) => {
    ipcRenderer.on('shutdown-check-out', () => callback())
  },
  removeShutdownCheckOut: () => {
    ipcRenderer.removeAllListeners('shutdown-check-out')
  },
  updater: {
    check: () => ipcRenderer.invoke('check-for-updates'),
    download: () => ipcRenderer.invoke('download-update'),
    install: () => ipcRenderer.invoke('quit-and-install'),
    getEncryptionStatus: () => ipcRenderer.invoke('get-encryption-status')
  },
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, info) => callback(info))
  },
  onUpdateNotAvailable: (callback) => {
    ipcRenderer.on('update-not-available', () => callback())
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', () => callback())
  },
  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-download-progress', (event, progress) => callback(progress))
  },
  onUpdateSkippedDev: (callback) => {
    ipcRenderer.on('update-skipped-dev', () => callback())
  },
  // 文件管理 - 云盘功能
  cloud: {
    init: () => ipcRenderer.invoke('cloud-init'),
    listFiles: (relativePath) => ipcRenderer.invoke('cloud-list-files', relativePath),
    uploadFile: (sourcePath, relativePath) => ipcRenderer.invoke('cloud-upload-file', sourcePath, relativePath),
    uploadFileFromData: (fileData, fileName, relativePath) => ipcRenderer.invoke('cloud-upload-file-from-data', fileData, fileName, relativePath),
    downloadFile: (fileId, savePath) => ipcRenderer.invoke('cloud-download-file', fileId, savePath),
    createFolder: (relativePath, folderName) => ipcRenderer.invoke('cloud-create-folder', relativePath, folderName),
    deleteFile: (fileId) => ipcRenderer.invoke('cloud-delete-file', fileId),
    renameFile: (fileId, newName) => ipcRenderer.invoke('cloud-rename-file', fileId, newName),
    selectFiles: () => ipcRenderer.invoke('cloud-select-files'),
    getStats: () => ipcRenderer.invoke('cloud-get-stats')
  },
  // 上传进度监听
  onUploadProgress: (callback) => {
    ipcRenderer.on('upload-progress', (event, data) => callback(data))
  },
  removeUploadProgress: () => {
    ipcRenderer.removeAllListeners('upload-progress')
  },
  // 下载进度监听
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (event, data) => callback(data))
  },
  removeDownloadProgress: () => {
    ipcRenderer.removeAllListeners('download-progress')
  }
})
