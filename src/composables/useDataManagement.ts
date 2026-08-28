/**
 * 数据管理 composable（从 Settings.vue 拆分 FW-006）
 *
 * 职责：版本/数据统计、备份列表、更新检查、导入导出、清空记录、加密状态
 * 依赖：electronAPI（Data Manager / Updater / Dialog / Shell）
 */

import { ref } from 'vue'
import { createLogger } from '../utils/logger'
import { getErrorMessage } from '../utils/errorUtils'

/** 数据统计信息 */
export interface DataStats {
  totalRecords: number
  backupCount: number
  backupPath: string
  lastBackup?: string | null
  dataPath?: string
}

/** 备份项 */
export interface BackupItem {
  name: string
  modified: string
  size?: number
}

/** 加密状态 */
export interface EncryptionStatus {
  encrypted: boolean
  available: boolean
}

/** 更新信息 */
export interface UpdateInfo {
  available: boolean
  version?: string
  dev?: boolean
}

/** Toast API 子集（避免循环依赖 useToast.js） */
export interface ToastApi {
  success: (msg: string, dur?: number) => void
  error: (msg: string, dur?: number) => void
  warning: (msg: string, dur?: number) => void
  info: (msg: string, dur?: number) => void
}

/**
 * 创建数据管理器
 * @param reloadRecords 重新加载考勤记录的回调（导入/恢复/清空后调用）
 * @param toast Toast 通知实例（由调用方注入）
 */
export function useDataManagement(reloadRecords: () => Promise<void>, toast: ToastApi) {
  const log = createLogger('data-mgmt')

  const appVersion = ref<string>('')
  const dataStats = ref<DataStats>({ totalRecords: 0, backupCount: 0, backupPath: '' })
  const backupList = ref<BackupItem[]>([])
  const isExporting = ref(false)
  const isImporting = ref(false)
  const checkingUpdate = ref(false)
  const updateInfo = ref<UpdateInfo | null>(null)
  const encryptionStatus = ref<EncryptionStatus>({ encrypted: false, available: false })

  /** 加载数据统计与备份列表 */
  async function loadDataStats(): Promise<void> {
    try {
      if (window.electronAPI?.dataManager) {
        appVersion.value = await window.electronAPI.dataManager.getAppVersion()
        dataStats.value = await window.electronAPI.dataManager.getDataStats()
        backupList.value = await window.electronAPI.dataManager.getBackupList()
      }
    } catch (e) {
      log.error('加载数据统计失败:', e)
    }
  }

  /** 检查应用更新 */
  async function checkForUpdates(): Promise<void> {
    if (checkingUpdate.value) return
    checkingUpdate.value = true
    try {
      if (window.electronAPI?.updater) {
        const info = await window.electronAPI.updater.check()
        updateInfo.value = info
        if (info?.available) {
          toast.info(`发现新版本 v${info.version}`)
        } else if (info?.dev) {
          toast.info('开发模式，跳过更新检查')
        } else {
          toast.success('已是最新版本')
        }
      } else {
        toast.info('更新功能仅在桌面应用中可用')
      }
    } catch {
      toast.error('检查更新失败')
    } finally {
      checkingUpdate.value = false
    }
  }

  /** 下载更新包 */
  async function downloadUpdate(): Promise<void> {
    if (!window.electronAPI?.updater) return
    toast.info('开始下载更新...')
    const ok = await window.electronAPI.updater.download()
    if (ok) {
      toast.success('更新下载完成，下次启动时安装')
    } else {
      toast.error('下载更新失败')
    }
  }

  /** 加载加密状态 */
  async function loadEncryptionStatus(): Promise<void> {
    try {
      if (window.electronAPI?.updater?.getEncryptionStatus) {
        encryptionStatus.value = await window.electronAPI.updater.getEncryptionStatus()
      }
    } catch (err) {
      // 非 Electron 环境（Vite dev SSR 或纯 Web 构建）下 electronAPI 不存在，属于正常降级
      if (typeof console !== 'undefined') {
        console.debug('[useDataManagement] electronAPI unavailable in current env; downgrade to web-only features')
      }
    }
  }

  function getEncryptionHint(): string {
    if (encryptionStatus.value.encrypted) return '已加密保护'
    if (encryptionStatus.value.available) return '明文存储'
    return '加密不可用'
  }

  function getEncryptionLabel(): string {
    if (encryptionStatus.value.encrypted) return '已加密'
    if (encryptionStatus.value.available) return '明文'
    return '不可用'
  }

  function getEncryptionBadgeClass(): string {
    if (encryptionStatus.value.encrypted) return 'status-badge--encrypted'
    if (encryptionStatus.value.available) return 'status-badge--available'
    return 'status-badge--unavailable'
  }

  /** 导出数据到 JSON 文件 */
  async function exportData(): Promise<void> {
    if (isExporting.value) return
    isExporting.value = true
    try {
      const now = new Date()
      const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
      const dp = `灵韵打卡_数据导出_${ts}.json`
      if (!window.electronAPI?.dialog) {
        toast.warning('导出功能仅在桌面应用中可用')
        return
      }
      const result = await window.electronAPI.dialog.showSaveDialog({
        title: '导出打卡数据',
        defaultPath: dp,
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
      })
      if (!result.canceled && result.filePath) {
        const ok = await window.electronAPI.dataManager.exportData(result.filePath)
        if (ok) toast.success(`数据导出成功！位置: ${result.filePath}`)
        else toast.error('导出失败')
      }
    } catch (e) {
      toast.error('导出失败: ' + getErrorMessage(e))
    } finally {
      isExporting.value = false
    }
  }

  /** 从 JSON 文件导入数据 */
  async function importData(): Promise<void> {
    if (isImporting.value) return
    isImporting.value = true
    try {
      if (!window.electronAPI?.dialog) {
        toast.warning('导入功能仅在桌面应用中可用')
        return
      }
      const result = await window.electronAPI.dialog.showOpenDialog({
        title: '导入打卡数据',
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        properties: ['openFile']
      })
      if (!result.canceled && result.filePaths.length > 0) {
        const res = await window.electronAPI.dataManager.importData(result.filePaths[0])
        if (res.success) {
          toast.success(`数据导入成功！版本: ${res.version}`)
          await loadDataStats()
          await reloadRecords()
        } else {
          toast.error('导入失败: ' + res.error)
        }
      }
    } catch (e) {
      toast.error('导入失败: ' + getErrorMessage(e))
    } finally {
      isImporting.value = false
    }
  }

  /** 从备份恢复 */
  async function restoreBackup(name: string): Promise<void> {
    if (!confirm(`确定恢复此备份吗？\n${name}\n\n会覆盖当前数据。`)) return
    try {
      const ok = await window.electronAPI.dataManager.restoreFromBackup(name)
      if (ok) {
        toast.success('恢复成功！')
        await loadDataStats()
        await reloadRecords()
      } else {
        toast.error('恢复失败')
      }
    } catch (e) {
      toast.error('恢复失败: ' + getErrorMessage(e))
    }
  }

  /** 删除备份 */
  async function deleteBackup(name: string): Promise<void> {
    if (!confirm(`确定删除此备份吗？\n${name}`)) return
    try {
      const ok = await window.electronAPI.dataManager.deleteBackup(name)
      if (ok) {
        await loadDataStats()
        toast.success('备份已删除')
      } else {
        toast.error('删除失败')
      }
    } catch (e) {
      toast.error('删除失败: ' + getErrorMessage(e))
    }
  }

  /** 清空所有考勤记录（先移到回收站，30 天内可恢复） */
  async function clearAllRecords(): Promise<void> {
    if (!confirm('确定清空所有考勤记录吗？\n记录会先移到回收站,30 天内可从备份目录恢复。')) return
    if (!confirm('再次确认：真的要清空全部考勤记录吗？')) return
    try {
      if (!window.electronAPI?.dataManager) {
        toast.warning('此功能仅在桌面应用中可用')
        return
      }
      const ok = await window.electronAPI.dataManager.clearAllRecords()
      if (ok) {
        toast.success('已清空,记录已移到回收站(30 天内可恢复)')
        await loadDataStats()
        await reloadRecords()
      } else {
        toast.error('清空失败(回收站写入失败,已中止以保护数据)')
      }
    } catch (e) {
      toast.error('清空失败: ' + getErrorMessage(e))
    }
  }

  /** 打开备份目录 */
  function openBackupFolder(): void {
    const p = dataStats.value.backupPath
    if (p && window.electronAPI?.shell?.openPath) {
      window.electronAPI.shell.openPath(p)
    } else {
      toast.warning('备份目录不存在或当前环境不支持')
    }
  }

  /** 格式化时间戳为 'YYYY-MM-DD HH:MM' */
  function formatTime(date: string): string {
    if (!date) return '未知'
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return {
    // state
    appVersion, dataStats, backupList, isExporting, isImporting,
    checkingUpdate, updateInfo, encryptionStatus,
    // methods
    loadDataStats, checkForUpdates, downloadUpdate, loadEncryptionStatus,
    getEncryptionHint, getEncryptionLabel, getEncryptionBadgeClass,
    exportData, importData, restoreBackup, deleteBackup, clearAllRecords,
    openBackupFolder, formatTime
  }
}
