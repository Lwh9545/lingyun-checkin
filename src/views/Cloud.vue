<template>
  <div 
    class="cloud-page"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="handleDrop"
  >
    <!-- 拖拽上传提示 -->
    <div v-if="isDragging" class="drag-overlay">
      <div class="drag-inner">
        <div class="drag-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <h3 class="drag-title">释放文件即可上传</h3>
        <p class="drag-hint">支持任意类型文件，拖拽到这里</p>
      </div>
    </div>

    <!-- 顶部工具栏 -->
    <div class="cloud-toolbar">
      <div class="toolbar-left">
        <div class="breadcrumbs">
          <button class="breadcrumb-item" @click="goToRoot">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            全部文件
          </button>
          <template v-for="(part, index) in pathParts" :key="index">
            <svg class="breadcrumb-sep" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <button class="breadcrumb-item" @click="goToPath(index)">{{ part }}</button>
          </template>
        </div>
      </div>
      
      <div class="toolbar-right">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="搜索文件..."
            class="search-input"
          />
        </div>
        
        <button class="toolbar-btn" @click="goBack" :disabled="!canGoBack" title="返回上一级">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        
        <button class="toolbar-btn" @click="showCreateFolderDialog" title="新建文件夹">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            <line x1="12" y1="11" x2="12" y2="17"/>
            <line x1="9" y1="14" x2="15" y2="14"/>
          </svg>
        </button>
        
        <button class="toolbar-btn primary" @click="selectFiles" title="上传文件">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon file-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ files.length }}</div>
          <div class="stat-label">文件</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon folder-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ folderCount }}</div>
          <div class="stat-label">文件夹</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon size-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ formatSize(storageStats.totalSize) }}</div>
          <div class="stat-label">总大小</div>
        </div>
      </div>
    </div>

    <!-- 视图切换和排序 -->
    <div class="view-controls">
      <div class="view-controls-left">
        <div class="view-toggle">
          <button 
            :class="['toggle-btn', { active: viewMode === 'grid' }]" 
            @click="viewMode = 'grid'"
            title="网格视图"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </button>
          <button 
            :class="['toggle-btn', { active: viewMode === 'list' }]" 
            @click="viewMode = 'list'"
            title="列表视图"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <circle cx="4" cy="6" r="1" fill="currentColor"/>
              <circle cx="4" cy="12" r="1" fill="currentColor"/>
              <circle cx="4" cy="18" r="1" fill="currentColor"/>
            </svg>
          </button>
        </div>
        
        <div class="sort-dropdown">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="6" x2="20" y2="6"/>
            <line x1="4" y1="12" x2="14" y2="12"/>
            <line x1="4" y1="18" x2="8" y2="18"/>
          </svg>
          <select v-model="sortBy" class="sort-select">
            <option value="name">名称</option>
            <option value="size">大小</option>
            <option value="modified">时间</option>
            <option value="type">类型</option>
          </select>
        </div>
      </div>
      
      <span class="result-count">共 {{ filteredFiles.length }} 项</span>
    </div>

    <!-- 文件列表区域 -->
    <div class="files-area">
      <!-- 空状态 -->
      <div v-if="filteredFiles.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <h3>暂无文件</h3>
        <p>点击上方按钮上传文件</p>
        <button class="upload-btn" @click="selectFiles">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          上传文件
        </button>
      </div>

      <!-- 网格视图 -->
      <div v-else-if="viewMode === 'grid'" class="grid-view">
        <div 
          v-for="file in filteredFiles" 
          :key="file.id"
          :class="['grid-item', { selected: selectedFile?.id === file.id }]"
          @click="handleFileClick(file)"
          @dblclick="handleFileDoubleClick(file)"
          @contextmenu.prevent="showContextMenu($event, file)"
        >
          <div :class="['file-preview', getFilePreviewClass(file)]">
            <svg v-if="file.type === 'folder'" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <span class="file-name">{{ file.name }}</span>
          <span class="file-meta">{{ file.type === 'folder' ? '文件夹' : formatSize(file.size) }}</span>
        </div>
      </div>

      <!-- 列表视图 -->
      <div v-else class="list-view">
        <div class="list-header">
          <div class="col-name">名称</div>
          <div class="col-size">大小</div>
          <div class="col-time">修改时间</div>
          <div class="col-actions">操作</div>
        </div>
        <div class="list-body">
          <div 
            v-for="file in filteredFiles" 
            :key="file.id"
            :class="['list-row', { selected: selectedFile?.id === file.id }]"
            @click="handleFileClick(file)"
            @dblclick="handleFileDoubleClick(file)"
            @contextmenu.prevent="showContextMenu($event, file)"
          >
            <div class="col-name">
              <div :class="['file-icon-small', getFilePreviewClass(file)]">
                <svg v-if="file.type === 'folder'" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <span>{{ file.name }}</span>
            </div>
            <div class="col-size">{{ file.type === 'folder' ? '-' : formatSize(file.size) }}</div>
            <div class="col-time">{{ formatDate(file.modified) }}</div>
            <div class="col-actions">
              <button class="action-btn" @click.stop="showContextMenu($event, file)">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="2"/>
                  <circle cx="12" cy="12" r="2"/>
                  <circle cx="12" cy="19" r="2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="status-bar">
      <span class="status-text">共 {{ files.length }} 个文件，{{ folderCount }} 个文件夹，{{ formatSize(storageStats.totalSize) }}</span>
    </div>

    <!-- 右键菜单 -->
    <div 
      v-if="contextMenu.visible" 
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <div v-if="contextMenu.file?.type === 'folder'" class="menu-item" @click="enterFolderAction">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span>打开</span>
      </div>
      <div v-else class="menu-item" @click="downloadAction">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span>下载</span>
      </div>
      <div class="menu-item" @click="renameAction">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
        </svg>
        <span>重命名</span>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item danger" @click="deleteAction">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"/>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
        <span>删除</span>
      </div>
    </div>

    <!-- 创建文件夹对话框 -->
    <div v-if="showCreateFolder" class="modal-overlay" @click.self="showCreateFolder = false">
      <div class="modal-box">
        <div class="modal-header">
          <div class="modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h3>新建文件夹</h3>
        </div>
        <input 
          v-model="newFolderName" 
          type="text" 
          placeholder="输入文件夹名称"
          class="modal-input"
          @keyup.enter="createFolderAction"
          ref="folderInput"
        />
        <div class="modal-footer">
          <button class="modal-btn cancel" @click="showCreateFolder = false">取消</button>
          <button class="modal-btn confirm" @click="createFolderAction" :disabled="!newFolderName">创建</button>
        </div>
      </div>
    </div>

    <!-- 重命名对话框 -->
    <div v-if="showRename" class="modal-overlay" @click.self="showRename = false">
      <div class="modal-box">
        <div class="modal-header">
          <div class="modal-icon edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
            </svg>
          </div>
          <h3>重命名</h3>
        </div>
        <input 
          v-model="newFileName" 
          type="text" 
          placeholder="输入新名称"
          class="modal-input"
          @keyup.enter="renameFileAction"
          ref="renameInput"
        />
        <div class="modal-footer">
          <button class="modal-btn cancel" @click="showRename = false">取消</button>
          <button class="modal-btn confirm" @click="renameFileAction" :disabled="!newFileName">确定</button>
        </div>
      </div>
    </div>

    <!-- 上传进度 -->
    <div v-if="uploadTasks.length > 0" class="progress-panel">
      <div class="progress-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <span>上传中 ({{ uploadTasks.length }})</span>
        <button class="close-btn" @click="clearCompletedUploads">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="progress-list">
        <div v-for="task in uploadTasks" :key="task.id" class="progress-item">
          <span class="progress-name">{{ task.name }}</span>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: task.percent + '%' }"></div>
          </div>
          <span class="progress-percent">{{ task.percent }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useCloudStore } from '../stores/cloud'
import { useToast } from '../composables/useToast'
import {
  useCloudFiles,
  getFilePreviewClass,
  formatSize,
  formatDate
} from '../composables/useCloudFiles'

const toast = useToast()
const cloudStore = useCloudStore()

const {
  files,
  currentPath,
  isLoading,
  uploadTasks,
  downloadTasks,
  storageStats,
  error,
  canGoBack
} = storeToRefs(cloudStore)

const {
  isDragging, selectedFile, contextMenu,
  showCreateFolder, newFolderName, showRename, newFileName,
  folderInput, renameInput, searchQuery, viewMode, sortBy,
  pathParts, folderCount, filteredFiles,
  selectFiles, handleDrop, handleFileClick, handleFileDoubleClick,
  showContextMenu, enterFolderAction, downloadAction, downloadFileAction,
  showCreateFolderDialog, createFolderAction,
  renameAction, renameFileAction, deleteAction,
  goToRoot, goToPath
} = useCloudFiles(cloudStore, toast)

const { goBack, clearError, clearCompletedUploads, clearCompletedDownloads } = cloudStore
</script>

<style scoped>
.cloud-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  overflow: hidden;
}

/* ===== 拖拽覆盖层 ===== */
.drag-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-primary-bg);
  backdrop-filter: blur(8px);
  border: 2px dashed var(--color-primary);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  margin: 16px;
}

.drag-inner {
  text-align: center;
}

.drag-icon-wrap {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.drag-icon-wrap svg {
  width: 36px;
  height: 36px;
  color: #fff;
}

.drag-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 8px;
}

.drag-hint {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
}

/* ===== 顶部工具栏 ===== */
.cloud-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background: var(--color-bg-card);
  border-bottom: 1px solid var(--color-border);
  flex-wrap: wrap;
  gap: 12px;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
}

.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 6px;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.breadcrumb-item:hover {
  background: var(--color-border-light);
  color: var(--color-text-primary);
}

.breadcrumb-item svg {
  width: 14px;
  height: 14px;
}

.breadcrumb-sep {
  width: 12px;
  height: 12px;
  color: var(--color-text-placeholder);
  margin: 0 2px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  height: 36px;
  background: var(--color-border-light);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all 0.2s ease;
  min-width: 200px;
}

.search-box:focus-within {
  background: var(--color-bg-card);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

.search-box svg {
  width: 14px;
  height: 14px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.search-input {
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  width: 100%;
  outline: none;
}

.search-input::placeholder {
  color: var(--color-text-placeholder);
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 36px;
  height: 36px;
  padding: 0;
  background: var(--color-border-light);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.toolbar-btn svg {
  width: 16px;
  height: 16px;
}

.toolbar-btn:hover:not(:disabled) {
  background: var(--color-bg-card);
  border-color: var(--color-text-placeholder);
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-btn.primary {
  width: auto;
  padding: 0 16px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
  border-color: transparent;
  color: #fff;
}

.toolbar-btn.primary:hover {
  background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary));
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--color-primary-glow);
}

/* ===== 统计卡片 ===== */
.stats-row {
  display: flex;
  gap: 12px;
  padding: 14px 20px;
  flex-shrink: 0;
}

.stat-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-bg-card);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
}

.stat-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg {
  width: 18px;
  height: 18px;
}

.file-icon {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
  color: #fff;
}

.folder-icon {
  background: linear-gradient(135deg, var(--color-warning), var(--color-orange));
  color: #fff;
}

.size-icon {
  background: linear-gradient(135deg, var(--color-success), #059669);
  color: #fff;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.stat-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-tertiary);
}

/* ===== 视图控制 ===== */
.view-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: var(--color-bg-card);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.view-controls-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.view-toggle {
  display: flex;
  background: var(--color-border-light);
  border-radius: 6px;
  padding: 2px;
}

.toggle-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toggle-btn svg {
  width: 15px;
  height: 15px;
  color: var(--color-text-tertiary);
}

.toggle-btn.active {
  background: var(--color-bg-card);
  box-shadow: var(--shadow-sm);
}

.toggle-btn.active svg {
  color: var(--color-primary);
}

.sort-dropdown {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  height: 32px;
  background: var(--color-border-light);
  border-radius: 6px;
}

.sort-dropdown svg {
  width: 12px;
  height: 12px;
  color: var(--color-text-tertiary);
}

.sort-select {
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  outline: none;
  min-width: 60px;
}

.result-count {
  margin-left: auto;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-tertiary);
}

/* ===== 文件区域 ===== */
.files-area {
  flex: 1;
  overflow: auto;
  padding: 16px 20px;
  min-height: 0;
}

/* ===== 空状态 ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  background: var(--color-bg-card);
  border-radius: 12px;
}

.empty-icon {
  width: 64px;
  height: 64px;
  background: var(--color-border-light);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.empty-icon svg {
  width: 32px;
  height: 32px;
  color: var(--color-text-tertiary);
}

.empty-state h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 6px;
}

.empty-state p {
  font-size: 13px;
  color: var(--color-text-tertiary);
  margin: 0 0 20px;
}

.upload-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-btn svg {
  width: 16px;
  height: 16px;
}

.upload-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--color-primary-glow);
}

/* ===== 网格视图 ===== */
.grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 12px;
  background: var(--color-bg-card);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.grid-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
}

.grid-item.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.file-preview {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.file-preview svg {
  width: 24px;
  height: 24px;
}

.file-preview.folder {
  background: linear-gradient(135deg, var(--color-warning-bg), var(--color-warning-light));
}

.file-preview.folder svg {
  color: var(--color-warning);
}

.file-preview.file {
  background: linear-gradient(135deg, var(--color-primary-bg), var(--color-primary-light));
}

.file-preview.file svg {
  color: var(--color-primary);
}

.file-preview.pdf {
  background: linear-gradient(135deg, var(--color-danger-bg), var(--color-danger-light));
}

.file-preview.pdf svg {
  color: var(--color-danger);
}

.file-preview.doc {
  background: linear-gradient(135deg, var(--color-info-bg), var(--color-info-light));
}

.file-preview.doc svg {
  color: var(--color-info);
}

.file-preview.xls {
  background: linear-gradient(135deg, var(--color-success-bg), var(--color-success-light));
}

.file-preview.xls svg {
  color: var(--color-success);
}

.file-preview.image {
  background: linear-gradient(135deg, #fce7f3, #fbcfe8);
}

.file-preview.image svg {
  color: #ec4899;
}

.file-preview.video {
  background: linear-gradient(135deg, var(--color-purple-bg), #ddd6fe);
}

.file-preview.video svg {
  color: var(--color-purple);
}

.file-preview.audio {
  background: linear-gradient(135deg, var(--color-orange-bg), #fed7aa);
}

.file-preview.audio svg {
  color: var(--color-orange);
}

.file-preview.zip {
  background: linear-gradient(135deg, var(--color-border-light), var(--color-border));
}

.file-preview.zip svg {
  color: var(--color-text-secondary);
}

.file-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  margin-bottom: 4px;
}

.file-meta {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

/* ===== 列表视图 ===== */
.list-view {
  background: var(--color-bg-card);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 100%;
}

.list-header {
  display: grid;
  grid-template-columns: 1fr 100px 140px 70px;
  padding: 10px 14px;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.list-body {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.list-row {
  display: grid;
  grid-template-columns: 1fr 100px 140px 70px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-divider);
  cursor: pointer;
  transition: background 0.15s ease;
}

.list-row:hover {
  background: var(--color-bg);
}

.list-row.selected {
  background: var(--color-primary-bg);
}

.list-row .col-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-icon-small {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-icon-small svg {
  width: 16px;
  height: 16px;
}

.list-row .col-size,
.list-row .col-time {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.list-row .col-actions {
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s ease;
}

.list-row:hover .action-btn {
  opacity: 1;
}

.action-btn:hover {
  background: var(--color-border);
}

.action-btn svg {
  width: 14px;
  height: 14px;
  color: var(--color-text-secondary);
}

/* ===== 底部状态栏 ===== */
.status-bar {
  padding: 12px 24px;
  background: var(--color-bg-card);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.status-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-tertiary);
}

/* ===== 右键菜单 ===== */
.context-menu {
  position: fixed;
  background: var(--color-bg-card);
  border-radius: 10px;
  box-shadow: var(--shadow-xl);
  padding: 8px 0;
  min-width: 160px;
  z-index: 1000;
  border: 1px solid var(--color-border);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background 0.15s ease;
}

.menu-item:hover {
  background: var(--color-border-light);
}

.menu-item svg {
  width: 16px;
  height: 16px;
}

.menu-item.danger {
  color: var(--color-danger);
}

.menu-divider {
  height: 1px;
  background: var(--color-divider);
  margin: 8px 0;
}

/* ===== 对话框 ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-box {
  width: 400px;
  background: var(--color-bg-card);
  border-radius: 16px;
  padding: 24px;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.modal-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--color-warning), var(--color-orange));
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-icon.edit {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
}

.modal-icon svg {
  width: 20px;
  height: 20px;
  color: #fff;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.modal-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  outline: none;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.modal-input:focus {
  border-color: var(--color-primary);
}

.modal-input::placeholder {
  color: var(--color-text-placeholder);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.modal-btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.modal-btn.cancel {
  background: var(--color-border-light);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.modal-btn.cancel:hover {
  background: var(--color-border);
}

.modal-btn.confirm {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
  border: none;
  color: #fff;
}

.modal-btn.confirm:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--color-primary-glow);
}

.modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== 上传进度面板 ===== */
.progress-panel {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 360px;
  background: var(--color-bg-card);
  border-radius: 12px;
  box-shadow: var(--shadow-xl);
  padding: 16px;
  z-index: 500;
  border: 1px solid var(--color-border);
}

.progress-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.progress-header svg {
  width: 18px;
  height: 18px;
  color: var(--color-primary);
}

.progress-header span {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.close-btn {
  margin-left: auto;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border-light);
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.close-btn svg {
  width: 14px;
  height: 14px;
  color: var(--color-text-secondary);
}

.progress-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.progress-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-percent {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  width: 40px;
  text-align: right;
}
</style>