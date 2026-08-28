<template>
  <div class="app">
    <!-- 侧边导航栏 -->
    <aside class="sidebar">
      <div class="sidebar-logo">
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="var(--color-primary)"/>
          <path d="M9 18l4 3 10-11" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/checkin" class="nav-item" active-class="active" title="打卡">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span class="nav-label">打卡</span>
        </router-link>
        <router-link to="/dashboard" class="nav-item" active-class="active" title="仪表盘">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
          <span class="nav-label">仪表盘</span>
        </router-link>
        <router-link to="/records" class="nav-item" active-class="active" title="记录">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          <span class="nav-label">记录</span>
        </router-link>
        <router-link to="/salary" class="nav-item" active-class="active" title="工资">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
          <span class="nav-label">工资</span>
        </router-link>
        <router-link to="/reimbursement" class="nav-item" active-class="active" title="报销">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l3-2 3 2 3-2 3 2 4-4V2z"/><path d="M8 10h8M8 14h5"/></svg>
          <span class="nav-label">报销</span>
        </router-link>
        <router-link to="/cloud" class="nav-item" active-class="active" title="网盘">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span class="nav-label">网盘</span>
        </router-link>
        <router-link to="/settings" class="nav-item" active-class="active" title="设置">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span class="nav-label">设置</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <span class="version-tag">v2.0</span>
      </div>
    </aside>

    <!-- 主内容区 -->
    <div class="main-wrapper">
      <div v-if="globalError" class="error-bar">
        <span class="error-bar-text">{{ globalError.message }}</span>
        <button class="error-bar-dismiss" @click="globalError = null" aria-label="关闭错误提示">×</button>
      </div>
      <main class="main">
        <router-view v-slot="{ Component }">
          <transition name="page-fade" mode="out-in">
            <component :is="Component" :key="globalError?.timestamp" />
          </transition>
        </router-view>
      </main>
    </div>
    <Toast />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch, onErrorCaptured } from "vue"
import { useAttendanceStore } from "./stores/attendance"
import Toast from "./components/Toast.vue"
import { watchSystemTheme } from "./utils/themeUtils"
import { loadCachedHolidays, refreshHolidayData } from "./utils/holidays"
import { createLogger } from "./utils/logger"

let themeUnbind = null

const log = createLogger('app-root')
const attendanceStore = useAttendanceStore()
const autoCheckTimer = ref(null)
const globalError = ref(null)

const AUTO_CHECK_INTERVAL = 60000  // 60 秒

// 错误边界：捕获子组件异常，防止白屏
onErrorCaptured((err, instance, info) => {
  // 提取完整错误信息（err 可能是非 Error 对象）
  const errMessage = err instanceof Error
    ? err.message
    : (typeof err === 'string' ? err : (err?.message || err?.toString?.() || '未知错误'))
  log.error('[error-boundary]', { err, message: errMessage, info, stack: err?.stack, ctor: err?.constructor?.name })
  globalError.value = {
    message: errMessage,
    info: info || '',
    timestamp: Date.now()
  }
  return false // 阻止向上传播
})

async function checkAndAutoCheck() {
  if (!attendanceStore.autoCheckIn) return
  await attendanceStore.tryAutoCheckIn()
}

function startAutoCheckTimer() {
  if (autoCheckTimer.value) clearInterval(autoCheckTimer.value)
  if (!attendanceStore.autoCheckIn) return
  autoCheckTimer.value = setInterval(checkAndAutoCheck, AUTO_CHECK_INTERVAL)
}

function stopAutoCheckTimer() {
  if (autoCheckTimer.value) {
    clearInterval(autoCheckTimer.value)
    autoCheckTimer.value = null
  }
}

// 响应式监听 autoCheckIn 的变化，动态启停定时器
watch(
  () => attendanceStore.autoCheckIn,
  (newVal) => {
    if (newVal) {
      startAutoCheckTimer()
    } else {
      stopAutoCheckTimer()
    }
  },
  { immediate: false }
)

onMounted(async () => {
  // 主题跟随系统：项目已有 [data-theme="dark"] 变量体系，此处接入系统监听
  themeUnbind = watchSystemTheme(
    window.matchMedia('(prefers-color-scheme: dark)'),
    t => { document.documentElement.dataset.theme = t }
  )

  await attendanceStore.loadRecords()
  attendanceStore.updateCurrentTime()

  // 加载缓存的节假日，然后后台刷新
  loadCachedHolidays()
  refreshHolidayData()

  // 首次挂载时延迟启动定时器，避免加载时误触发
  if (attendanceStore.autoCheckIn) {
    setTimeout(startAutoCheckTimer, AUTO_CHECK_INTERVAL)
  }
})

onUnmounted(() => {
  if (themeUnbind) { themeUnbind(); themeUnbind = null }
  stopAutoCheckTimer()
})
</script>

<style scoped>
.app {
  display: flex;
  height: 100vh;
  background: var(--color-bg);
}

/* ==================== 侧边栏 ==================== */
.sidebar {
  width: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--color-bg-card);
  border-right: 1px solid var(--color-border);
  flex-shrink: 0;
  padding: 16px 0;
  gap: 8px;
}

.sidebar-logo {
  width: 32px;
  height: 32px;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.sidebar-logo svg {
  width: 32px;
  height: 32px;
  display: block;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex: 1;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 56px;
  padding: 8px 0;
  border-radius: 12px;
  text-decoration: none;
  color: var(--color-text-tertiary);
  transition: all 0.2s ease;
  position: relative;
}

.nav-item svg {
  width: 22px;
  height: 22px;
}

.nav-label {
  font-size: 10px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.2px;
}

.nav-item:hover {
  color: var(--color-text-secondary);
  background: var(--color-border-light);
}

.nav-item.active {
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--color-primary);
}

.sidebar-footer {
  margin-top: auto;
  padding-top: 8px;
}
.version-tag {
  font-size: 10px;
  color: var(--color-text-placeholder);
  font-weight: 500;
  font-family: var(--font-mono);
}

/* ==================== 主内容区 ==================== */
.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.error-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #fef2f2;
  border-bottom: 1px solid #fecaca;
  color: #991b1b;
  font-size: 13px;
  flex-shrink: 0;
}
.error-bar-text { flex: 1; line-height: 1; }
.error-bar-dismiss {
  background: none;
  border: none;
  font-size: 18px;
  color: #991b1b;
  cursor: pointer;
  padding: 0 4px;
  min-width: var(--touch-min);
  min-height: var(--touch-min);
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.main {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

/* ==================== 页面过渡 ==================== */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.15s ease;
}
.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}
</style>
