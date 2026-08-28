/**
 * 云盘文件操作 composable（从 Cloud.vue 拆分 FW-006）
 *
 * 职责：封装云盘 UI 交互层（拖拽上传、文件选择、右键菜单、对话框、路径导航）
 * 依赖：cloudStore（注入）、toast（注入）
 */

import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import { getErrorMessage } from '../utils/errorUtils'

/** 文件项 */
export interface CloudFileItem {
  id: string
  name: string
  type: 'folder' | 'file'
  path?: string
  size: number
  modified: number
}

/** 上传/下载任务 */
export interface TransferTask {
  id: string
  name: string
  percent: number
  status?: string
}

/** 右键菜单状态 */
export interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  file: CloudFileItem | null
}

/** Toast API 子集 */
interface ToastApi {
  success: (msg: string, dur?: number) => void
  error: (msg: string, dur?: number) => void
  warning: (msg: string, dur?: number) => void
  info: (msg: string, dur?: number) => void
}

/** CloudStore 必需子集（避免依赖 .js store 文件） */
interface CloudStoreApi {
  files: Ref<CloudFileItem[]>
  currentPath: Ref<string>
  uploadTasks: Ref<TransferTask[]>
  downloadTasks: Ref<TransferTask[]>
  initStorage: () => Promise<void>
  getStats: () => Promise<void>
  selectAndUploadFiles: () => Promise<{ uploaded: number; error?: string }>
  uploadDraggedFile: (file: File) => Promise<void>
  downloadFile: (fileId: string, fileName: string) => Promise<{ success: boolean; savePath?: string }>
  createFolder: (name: string) => Promise<void>
  deleteFile: (fileId: string) => Promise<void>
  renameFile: (fileId: string, newName: string) => Promise<void>
  enterFolder: (path: string) => void
  loadFiles: (path: string) => void
}

/**
 * 创建云盘文件操作管理器
 * @param cloudStore Pinia cloud store 实例
 * @param toast Toast 通知实例
 */
export function useCloudFiles(cloudStore: CloudStoreApi, toast: ToastApi) {
  const {
    files, currentPath, uploadTasks, downloadTasks,
    selectAndUploadFiles, uploadDraggedFile, downloadFile,
    createFolder, deleteFile, renameFile, enterFolder, loadFiles
  } = cloudStore

  // ── 本地 UI 状态 ──
  const isDragging = ref(false)
  const selectedFile = ref<CloudFileItem | null>(null)
  const contextMenu = ref<ContextMenuState>({ visible: false, x: 0, y: 0, file: null })
  const showCreateFolder = ref(false)
  const newFolderName = ref('')
  const showRename = ref(false)
  const newFileName = ref('')
  const folderInput = ref<HTMLInputElement | null>(null)
  const renameInput = ref<HTMLInputElement | null>(null)
  const searchQuery = ref('')
  const viewMode = ref<'grid' | 'list'>('grid')
  const sortBy = ref<'name' | 'size' | 'modified' | 'type'>('name')

  // ── 计算属性 ──
  const pathParts = computed(() => {
    if (!currentPath.value || currentPath.value === '/') return []
    return currentPath.value.split('/').filter(Boolean)
  })

  const folderCount = computed(() =>
    (files.value ?? []).filter(f => f.type === 'folder').length
  )

  const filteredFiles = computed(() => {
    let result = files.value ?? []

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(f => f.name.toLowerCase().includes(query))
    }

    result = [...result].sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1
      if (a.type !== 'folder' && b.type === 'folder') return 1

      switch (sortBy.value) {
        case 'name': return a.name.localeCompare(b.name)
        case 'size': return b.size - a.size
        case 'modified': return b.modified - a.modified
        case 'type': return a.type.localeCompare(b.type)
        default: return 0
      }
    })

    return result
  })

  // ── 生命周期：进度事件绑定 ──
  onMounted(async () => {
    await cloudStore.initStorage()
    await cloudStore.getStats()

    window.electronAPI?.onUploadProgress?.((data: { uploadId: string; percent: number }) => {
      const task = uploadTasks.value.find(t => t.id === data.uploadId)
      if (task) task.percent = data.percent
    })

    window.electronAPI?.onDownloadProgress?.((data: { downloadId: string; percent: number }) => {
      const task = downloadTasks.value.find(t => t.id === data.downloadId)
      if (task) task.percent = data.percent
    })
  })

  onUnmounted(() => {
    window.electronAPI?.removeUploadProgress?.()
    window.electronAPI?.removeDownloadProgress?.()
  })

  // 全局点击关闭右键菜单
  document.addEventListener('click', () => {
    contextMenu.value.visible = false
  })

  // ── 文件操作 ──
  async function selectFiles(): Promise<void> {
    const result = await selectAndUploadFiles()
    if (result.uploaded > 0) {
      toast.success(`成功上传 ${result.uploaded} 个文件`)
    }
    if (result.error) {
      toast.error(result.error)
    }
  }

  async function handleDrop(event: DragEvent): Promise<void> {
    isDragging.value = false
    const droppedFiles = event.dataTransfer?.files
    if (!droppedFiles || droppedFiles.length === 0) return

    toast.info(`正在上传 ${droppedFiles.length} 个文件...`)

    for (const file of droppedFiles) {
      try {
        await uploadDraggedFile(file)
      } catch (err) {
        toast.error(`上传 ${file.name} 失败: ${getErrorMessage(err)}`)
      }
    }

    toast.success('上传完成')
  }

  function handleFileClick(file: CloudFileItem): void {
    selectedFile.value = file
  }

  function handleFileDoubleClick(file: CloudFileItem): void {
    if (file.type === 'folder') {
      enterFolder(file.path ?? '')
    } else {
      void downloadFileAction(file)
    }
  }

  function showContextMenu(event: MouseEvent, file: CloudFileItem): void {
    contextMenu.value = {
      visible: true,
      x: event.clientX,
      y: event.clientY,
      file
    }
  }

  function enterFolderAction(): void {
    if (contextMenu.value.file?.type === 'folder') {
      enterFolder(contextMenu.value.file.path ?? '')
      contextMenu.value.visible = false
    }
  }

  async function downloadAction(): Promise<void> {
    const file = contextMenu.value.file
    if (file && file.type !== 'folder') {
      await downloadFileAction(file)
    }
    contextMenu.value.visible = false
  }

  async function downloadFileAction(file: CloudFileItem): Promise<void> {
    try {
      toast.info(`正在下载 ${file.name}...`)
      const result = await downloadFile(file.id, file.name)
      if (result.success && result.savePath) {
        toast.success(`文件已保存到: ${result.savePath}`)
      }
    } catch (err) {
      toast.error(`下载失败: ${getErrorMessage(err)}`)
    }
  }

  // ── 创建文件夹对话框 ──
  function showCreateFolderDialog(): void {
    showCreateFolder.value = true
    newFolderName.value = ''
    void nextTick(() => folderInput.value?.focus())
  }

  async function createFolderAction(): Promise<void> {
    if (!newFolderName.value) return

    try {
      await createFolder(newFolderName.value)
      toast.success(`文件夹 "${newFolderName.value}" 创建成功`)
      showCreateFolder.value = false
      newFolderName.value = ''
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  // ── 重命名对话框 ──
  function renameAction(): void {
    const file = contextMenu.value.file
    if (file) {
      showRename.value = true
      newFileName.value = file.name
      contextMenu.value.visible = false
      void nextTick(() => renameInput.value?.focus())
    }
  }

  async function renameFileAction(): Promise<void> {
    if (!newFileName.value) return

    try {
      await renameFile(contextMenu.value.file?.id ?? '', newFileName.value)
      toast.success('重命名成功')
      showRename.value = false
      newFileName.value = ''
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  async function deleteAction(): Promise<void> {
    const file = contextMenu.value.file
    if (file) {
      if (confirm(`确定要删除 "${file.name}" 吗？`)) {
        try {
          await deleteFile(file.id)
          toast.success(`"${file.name}" 已删除`)
        } catch (err) {
          toast.error(getErrorMessage(err))
        }
      }
    }
    contextMenu.value.visible = false
  }

  // ── 路径导航 ──
  function goToRoot(): void {
    loadFiles('/')
  }

  function goToPath(index: number): void {
    const path = '/' + pathParts.value.slice(0, index + 1).join('/')
    loadFiles(path)
  }

  return {
    // state
    isDragging, selectedFile, contextMenu,
    showCreateFolder, newFolderName, showRename, newFileName,
    folderInput, renameInput, searchQuery, viewMode, sortBy,
    // computed
    pathParts, folderCount, filteredFiles,
    // actions
    selectFiles, handleDrop, handleFileClick, handleFileDoubleClick,
    showContextMenu, enterFolderAction, downloadAction, downloadFileAction,
    showCreateFolderDialog, createFolderAction,
    renameAction, renameFileAction, deleteAction,
    goToRoot, goToPath
  }
}

// ═
// 工具函数（纯函数，可独立复用）
// ═

/** 文件类型扩展名映射 */
const FILE_TYPE_MAP: Record<string, string> = {
  pdf: 'pdf',
  doc: 'doc', docx: 'doc',
  xls: 'xls', xlsx: 'xls',
  ppt: 'ppt', pptx: 'ppt',
  zip: 'zip', rar: 'zip', '7z': 'zip',
  mp3: 'audio', wav: 'audio', flac: 'audio',
  mp4: 'video', avi: 'video', mkv: 'video',
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image',
  txt: 'text', md: 'text'
}

/** 获取文件预览类名 */
export function getFilePreviewClass(file: CloudFileItem): string {
  if (file.type === 'folder') return 'folder'
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return FILE_TYPE_MAP[ext] || 'file'
}

/** 格式化文件大小 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/** 格式化时间戳为相对时间 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前'

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
