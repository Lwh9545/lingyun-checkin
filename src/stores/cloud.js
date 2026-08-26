import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 云盘文件管理 Store
 */
export const useCloudStore = defineStore('cloud', () => {
  // 状态
  const files = ref([])
  const currentPath = ref('/')
  const navigationHistory = ref(['/'])
  const isLoading = ref(false)
  const uploadTasks = ref([])
  const downloadTasks = ref([])
  const storageStats = ref({ totalSize: 0, fileCount: 0, cloudRoot: '' })
  const error = ref(null)

  // 计算属性
  const canGoBack = computed(() => navigationHistory.value.length > 1)
  const hasFiles = computed(() => files.value.length > 0)
  const totalUploadProgress = computed(() => {
    if (uploadTasks.value.length === 0) return 0
    const total = uploadTasks.value.reduce((sum, task) => sum + task.percent, 0)
    return Math.round(total / uploadTasks.value.length)
  })

  /**
   * 初始化云盘存储
   */
  async function initStorage() {
    try {
      isLoading.value = true
      const result = await window.electronAPI.cloud.init()
      if (result.success) {
        storageStats.value.cloudRoot = result.cloudRoot
        await loadFiles('/')
      } else {
        error.value = result.error
      }
    } catch (err) {
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 加载文件列表
   * @param {string} path - 路径
   */
  async function loadFiles(path = currentPath.value) {
    try {
      isLoading.value = true
      error.value = null
      const result = await window.electronAPI.cloud.listFiles(path)
      if (result.success) {
        files.value = result.files
        currentPath.value = path
      } else {
        error.value = result.error
      }
    } catch (err) {
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 进入文件夹
   * @param {string} folderPath - 文件夹路径
   */
  async function enterFolder(folderPath) {
    navigationHistory.value.push(folderPath)
    await loadFiles(folderPath)
  }

  /**
   * 返回上一级
   */
  async function goBack() {
    if (navigationHistory.value.length > 1) {
      navigationHistory.value.pop()
      const previousPath = navigationHistory.value[navigationHistory.value.length - 1]
      await loadFiles(previousPath)
    }
  }

  /**
   * 选择并上传文件
   */
  async function selectAndUploadFiles() {
    try {
      const result = await window.electronAPI.cloud.selectFiles()
      if (result.canceled || result.files.length === 0) {
        return { uploaded: 0 }
      }

      const uploadResults = []
      for (const filePath of result.files) {
        const fileName = filePath.split(/[/\\]/).pop()
        const taskId = Date.now() + Math.random().toString(36).slice(2)
        
        uploadTasks.value.push({
          id: taskId,
          name: fileName,
          percent: 0,
          status: 'uploading'
        })

        try {
          const uploadResult = await window.electronAPI.cloud.uploadFile(filePath, currentPath.value)
          if (uploadResult.success) {
            uploadTasks.value = uploadTasks.value.filter(t => t.id !== taskId)
            uploadResults.push(uploadResult.file)
          } else {
            const task = uploadTasks.value.find(t => t.id === taskId)
            if (task) task.status = 'error'
          }
        } catch (err) {
          const task = uploadTasks.value.find(t => t.id === taskId)
          if (task) {
            task.status = 'error'
            task.error = err.message
          }
        }
      }

      // 刷新文件列表
      await loadFiles()
      
      return { uploaded: uploadResults.length }
    } catch (err) {
      error.value = err.message
      return { uploaded: 0, error: err.message }
    }
  }

  /**
   * 上传指定文件（用于拖拽上传）
   * 由于渲染进程无法直接访问文件系统，需要先通过 IPC 将文件数据传递给主进程
   * @param {File} file - 文件对象
   */
  async function uploadDraggedFile(file) {
    const taskId = Date.now() + Math.random().toString(36).slice(2)
    
    uploadTasks.value.push({
      id: taskId,
      name: file.name,
      percent: 0,
      status: 'uploading'
    })

    try {
      // 读取文件为 ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      const fileData = Array.from(new Uint8Array(arrayBuffer))
      
      // 通过 IPC 传递文件数据到主进程
      // 注意：这里需要添加一个新的 IPC handler 来处理内存数据上传
      const result = await window.electronAPI.cloud.uploadFileFromData?.(
        fileData,
        file.name,
        currentPath.value
      )
      
      if (result?.success) {
        uploadTasks.value = uploadTasks.value.filter(t => t.id !== taskId)
        await loadFiles()
        return result.file
      } else {
        throw new Error(result?.error || '上传失败')
      }
    } catch (err) {
      const task = uploadTasks.value.find(t => t.id === taskId)
      if (task) {
        task.status = 'error'
        task.error = err.message
      }
      throw err
    }
  }

  /**
   * 下载文件
   * @param {string} fileId - 文件ID
   * @param {string} fileName - 文件名
   */
  async function downloadFile(fileId, fileName) {
    const taskId = Date.now() + Math.random().toString(36).slice(2)
    
    downloadTasks.value.push({
      id: taskId,
      name: fileName,
      percent: 0,
      status: 'downloading'
    })

    try {
      const result = await window.electronAPI.cloud.downloadFile(fileId)
      
      if (result.success) {
        downloadTasks.value = downloadTasks.value.filter(t => t.id !== taskId)
        return result
      } else {
        throw new Error(result.message || result.error)
      }
    } catch (err) {
      const task = downloadTasks.value.find(t => t.id === taskId)
      if (task) {
        task.status = 'error'
        task.error = err.message
      }
      throw err
    }
  }

  /**
   * 创建文件夹
   * @param {string} folderName - 文件夹名称
   */
  async function createFolder(folderName) {
    try {
      const result = await window.electronAPI.cloud.createFolder(currentPath.value, folderName)
      if (result.success) {
        await loadFiles()
        return result.folder
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  /**
   * 删除文件
   * @param {string} fileId - 文件ID
   */
  async function deleteFile(fileId) {
    try {
      const result = await window.electronAPI.cloud.deleteFile(fileId)
      if (result.success) {
        await loadFiles()
        return true
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  /**
   * 重命名文件
   * @param {string} fileId - 文件ID
   * @param {string} newName - 新名称
   */
  async function renameFile(fileId, newName) {
    try {
      const result = await window.electronAPI.cloud.renameFile(fileId, newName)
      if (result.success) {
        await loadFiles()
        return result.file
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  /**
   * 获取存储统计
   */
  async function getStats() {
    try {
      const result = await window.electronAPI.cloud.getStats()
      if (result.success) {
        storageStats.value = result.stats
        return result.stats
      }
      return null
    } catch (err) {
      return null
    }
  }

  /**
   * 清除错误
   */
  function clearError() {
    error.value = null
  }

  /**
   * 清除已完成的上传任务
   */
  function clearCompletedUploads() {
    uploadTasks.value = uploadTasks.value.filter(t => t.status === 'uploading')
  }

  /**
   * 清除已完成的下载任务
   */
  function clearCompletedDownloads() {
    downloadTasks.value = downloadTasks.value.filter(t => t.status === 'downloading')
  }

  return {
    // 状态
    files,
    currentPath,
    navigationHistory,
    isLoading,
    uploadTasks,
    downloadTasks,
    storageStats,
    error,
    
    // 计算属性
    canGoBack,
    hasFiles,
    totalUploadProgress,
    
    // 方法
    initStorage,
    loadFiles,
    enterFolder,
    goBack,
    selectAndUploadFiles,
    uploadDraggedFile,
    downloadFile,
    createFolder,
    deleteFile,
    renameFile,
    getStats,
    clearError,
    clearCompletedUploads,
    clearCompletedDownloads
  }
})