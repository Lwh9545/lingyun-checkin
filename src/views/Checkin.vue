<template>
  <div class="checkin-page">
    <!-- 骨架屏：初始化加载期间展示 -->
    <div v-if="loading" class="skeleton-grid" aria-busy="true" aria-label="加载中">
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-line mid"></div>
      <div class="skeleton skeleton-line"></div>
      <div class="skeleton skeleton-line short"></div>
    </div>

    <template v-else>
    <!-- 单卡：日期 + 状态 + 工时 -->
    <div class="checkin-card card fade-in-up">
      <div class="checkin-date">{{ dateWithWeekday }}</div>

      <div class="punch-status">
        <div class="punch-item" :class="{ done: attendanceStore.todayRecords?.checkIn }">
          <div class="punch-icon-wrap" :class="{ done: attendanceStore.todayRecords?.checkIn }">
            <svg v-if="attendanceStore.todayRecords?.checkIn" class="punch-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <svg v-else class="punch-svg placeholder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/></svg>
          </div>
          <div class="punch-info">
            <div class="punch-title">上班打卡</div>
            <div class="punch-time" v-if="attendanceStore.todayRecords?.checkIn">
              <span class="time-text">{{ attendanceStore.todayRecords.checkIn }}</span>
              <span class="status-tag" :class="statusTagClass">{{ getStatusText(attendanceStore.todayRecords.status) }}</span>
            </div>
            <div class="punch-time" v-else>
              <span class="time-text placeholder">等待打卡</span>
            </div>
          </div>
        </div>

        <div class="punch-line">
          <div class="line-dot top" :class="{ done: attendanceStore.todayRecords?.checkIn }"></div>
          <div class="line-bar" :class="lineBarClass"></div>
          <div class="line-dot bottom" :class="{ done: attendanceStore.todayRecords?.checkOut }"></div>
        </div>

        <div class="punch-item" :class="{ done: attendanceStore.todayRecords?.checkOut }">
          <div class="punch-icon-wrap" :class="{ done: attendanceStore.todayRecords?.checkOut }">
            <svg v-if="attendanceStore.todayRecords?.checkOut" class="punch-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <svg v-else class="punch-svg placeholder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/></svg>
          </div>
          <div class="punch-info">
            <div class="punch-title">下班打卡</div>
            <div class="punch-time" v-if="attendanceStore.todayRecords?.checkOut">
              <span class="time-text">{{ attendanceStore.todayRecords.checkOut }}</span>
            </div>
            <div class="punch-time" v-else>
              <span class="time-text placeholder">{{ attendanceStore.todayRecords?.checkIn ? '等待打卡' : '--:--' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="work-duration" v-if="attendanceStore.todayWorkDuration">
        <div class="duration-left">
          <span class="duration-label">今日工时</span>
          <span class="duration-sub" v-if="attendanceStore.todayRecords?.checkOut">已完成</span>
          <span class="duration-sub ongoing" v-else>进行中</span>
        </div>
        <span class="duration-value">{{ attendanceStore.todayWorkDuration }}</span>
      </div>
    </div>

    <!-- 打卡按钮 + 工作时间提示 -->
    <div class="checkin-area">
      <div class="button-wrapper">
        <button
          class="check-button"
          :class="{
            disabled: attendanceStore.isChecking || !attendanceStore.canCheck,
            success: checkSuccess,
            'auto-success': autoCheckInSuccess,
          }"
          :disabled="attendanceStore.isChecking || !attendanceStore.canCheck"
          @click="handleCheck"
        >
          <span class="check-label">
            {{ attendanceStore.isChecking ? '打卡中...' : autoCheckInSuccess ? '自动打卡成功' : attendanceStore.checkText }}
          </span>
          <span class="check-time">{{ attendanceStore.currentTime }}</span>
        </button>
      </div>

      <div class="hint-row">
        <span class="hint-text">
          工作时间 {{ attendanceStore.workStartTime }} — {{ attendanceStore.workEndTime }}
          <span v-if="attendanceStore.enableRest" class="hint-sub">
            · 午休 {{ attendanceStore.restStart }}-{{ attendanceStore.restEnd }}
          </span>
        </span>
      </div>
      <div class="kbd-row" v-if="attendanceStore.canCheck">
        按 <kbd>Enter</kbd> 或 <kbd>Space</kbd> 快速打卡
      </div>
      <div class="kbd-row window-warn" v-if="!attendanceStore.canCheck && !attendanceStore.todayRecords?.checkOut">
        当前不在打卡时间段 · 补录请到仪表盘编辑记录
      </div>
    </div>
    </template>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed } from "vue"
import { useAttendanceStore } from "../stores/attendance"
import { getStatusText } from "../utils/attendanceUtils"
import { useKeyboard } from "../composables/useKeyboard"
import { useToast } from "../composables/useToast"
import { useRouter } from "vue-router"
import { createLogger } from "../utils/logger"

const log = createLogger('checkin-view')
const attendanceStore = useAttendanceStore()
const { loading } = attendanceStore
const toast = useToast()
const router = useRouter()
const checkSuccess = ref(false)
const autoCheckInSuccess = ref(false)

const WEEK_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
/** 纯事实行：日期 + 星期，无鸡汤 */
const dateWithWeekday = computed(() => {
  const d = new Date()
  const ymd = attendanceStore.currentDate || `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const wk = WEEK_LABELS[d.getDay()]
  return `${ymd} · ${wk}`
})

const statusTagClass = computed(() => {
  const st = attendanceStore.todayRecords?.status
  if (!st || st === "normal") return "normal"
  if (st === "late" || st === "early") return "warn"
  if (st === "absent") return "danger"
  if (st === "overtime") return "ot"
  return "warn"
})

const lineBarClass = computed(() => {
  const rec = attendanceStore.todayRecords
  if (rec?.checkIn && rec?.checkOut) return "done"
  if (rec?.checkIn && !rec?.checkOut) return "half"
  return ""
})

let clockTimer = null
let isClicking = false

// v2.1 性能：窗口隐藏/最小化时暂停每秒时钟（Page Visibility API），
// 避免后台空转触发 Vue 重渲染；恢复可见时立即校时并重启
function startClock() {
  if (clockTimer !== null) return
  attendanceStore.updateCurrentTime()
  clockTimer = setInterval(() => attendanceStore.updateCurrentTime(), 1000)
}
function stopClock() {
  if (clockTimer !== null) {
    clearInterval(clockTimer)
    clockTimer = null
  }
}
function onVisibilityChange() {
  if (document.hidden) stopClock()
  else startClock()
}

async function handleCheck(isAuto = false, fromShutdown = false) {
  if (isClicking) return
  isClicking = true
  try {
    const result = await attendanceStore.handleCheck()
    if (result.success === false) { log.warn("打卡失败:", result.message); return }
    checkSuccess.value = true
    updateTrayStatus()
    // v2.1：打卡结果状态如实当场反馈，禁止「成功绿闪」掩盖迟到/旷工/加班事实
    const typeLabel = result.type === "上班" ? "上班打卡" : "下班打卡"
    const timeLabel = result.time || new Date().toLocaleTimeString()
    const st = result.status
    if (st === "absent") toast.error(`${typeLabel}已记录：旷工（${timeLabel}，已远超上班时间）`)
    else if (st === "late") toast.warning(`${typeLabel}已记录：迟到（${timeLabel}）`)
    else if (st === "early") toast.warning(`${typeLabel}已记录：早退（${timeLabel}）`)
    else if (st === "overtime") toast.success(`${typeLabel}已记录：加班（${timeLabel}）`)
    else toast.success(`${typeLabel}成功（${timeLabel}）`)
    if ((isAuto || fromShutdown) && window.electronAPI && window.electronAPI.notification) {
      const msg = result.type === "上班"
        ? `上班打卡已完成: ${new Date().toLocaleTimeString()}`
        : `下班打卡已完成: ${new Date().toLocaleTimeString()}`
      const title = fromShutdown ? "关机自动下班打卡成功" : "自动打卡成功"
      await window.electronAPI.notification.send(title, msg)
    }
    if (isAuto) { autoCheckInSuccess.value = true; setTimeout(() => autoCheckInSuccess.value = false, 2000) }
    setTimeout(() => checkSuccess.value = false, 500)
  } finally {
    setTimeout(() => isClicking = false, 1000)
  }
}

function updateTrayStatus() {
  if (!window.electronAPI || !window.electronAPI.tray) return
  const r = attendanceStore.todayRecords
  if (!r || !r.checkIn) window.electronAPI.tray.updateStatus("none")
  else if (!r.checkOut) window.electronAPI.tray.updateStatus("checked_in")
  else window.electronAPI.tray.updateStatus("checked_out")
}

function onGlobalKey(e) {
  if (!attendanceStore.canCheck || attendanceStore.isChecking) return
  const tag = (e.target?.tagName || '').toUpperCase()
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  if (e.key === 'Enter' || e.code === 'Space' || e.key === ' ') {
    e.preventDefault()
    handleCheck()
  }
}

// 全局注册（与 useKeyboard 并存，不冲突）
useKeyboard({
  'check-in': () => { if (attendanceStore.canCheck && !attendanceStore.isChecking) handleCheck() },
  'check-out': () => { if (attendanceStore.canCheck && !attendanceStore.isChecking) handleCheck() },
  'settings': () => router.push('/settings')
})

onMounted(async () => {
  await attendanceStore.loadRecords()
  startClock()
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('keydown', onGlobalKey)
  updateTrayStatus()
  if (window.electronAPI) {
    window.electronAPI.onTriggerCheckIn(() => handleCheck())
    window.electronAPI.onTriggerCheckOut(() => handleCheck())
    window.electronAPI.onTriggerAutoCheckIn(() => {
      const r = attendanceStore.todayRecords
      if (r && r.checkIn) return
      handleCheck(true)
    })
    // Guard: 旧版 preload 保留 onShutdownCheckOut / onCheckAutoCheckIn，新版 P0-10 已统一到 onAutoCheckInDone，存在才挂
    window.electronAPI.onShutdownCheckOut?.(() => handleCheck(false, true))
    window.electronAPI.onCheckAutoCheckIn?.(() => attendanceStore.tryAutoCheckIn(false))
  }
})

onUnmounted(() => {
  stopClock()
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('keydown', onGlobalKey)
})
</script>

<style scoped>
.checkin-page {
  min-height: 100vh;
  padding: 20px 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 720px; /* 与全局容器宽统一（打卡卡自身 360px 居中不受影响） */
  margin: 0 auto;
}

/* 单卡：日期 + 上下状态 + 工时 */
.checkin-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px 24px 24px;
}

.checkin-date {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: 0.2px;
}

.punch-status { display: flex; align-items: stretch; gap: 16px; }
.punch-item { flex: 1; display: flex; align-items: flex-start; gap: 14px; min-width: 0; }

.punch-icon-wrap {
  width: 52px; height: 52px; border-radius: 50%;
  background: var(--color-border-light);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  transition: all var(--transition-slow);
}
.punch-icon-wrap.done {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  box-shadow: 0 4px 14px var(--color-primary-glow);
}
.punch-svg { width: 24px; height: 24px; color: var(--color-white); }
.punch-svg.placeholder { color: var(--color-text-tertiary); }

.punch-info { flex: 1; min-width: 0; }
.punch-title { font-size: 13px; color: var(--color-text-tertiary); margin-bottom: 4px; font-weight: 500; }
.punch-time { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.time-text { font-size: 20px; color: var(--color-text-primary); font-weight: 700; letter-spacing: -0.3px; }
.time-text.placeholder { color: var(--color-text-placeholder); font-weight: 400; font-size: 16px; }

.status-tag { font-size: 12px; padding: 3px 10px; border-radius: var(--radius-sm); font-weight: 600; }
.status-tag.normal { background: var(--color-success-bg); color: var(--color-success); }
.status-tag.warn   { background: var(--color-danger-bg);  color: var(--color-danger); }
.status-tag.danger { background: var(--color-danger-light);                 color: var(--color-danger-strong); }
.status-tag.ot     { background: var(--color-purple-bg);  color: var(--color-purple); }

/* 上下打卡连线 */
.punch-line { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; padding: 0 6px; }
.line-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--color-border); transition: all var(--transition-base); }
.line-dot.done { background: var(--color-primary); box-shadow: 0 0 8px var(--color-primary-glow); }
.line-bar { width: 3px; flex: 1; min-height: 28px; background: var(--color-border); margin: 6px 0; border-radius: 2px; transition: all var(--transition-slow); }
.line-bar.done { background: linear-gradient(180deg, var(--color-primary), var(--color-primary-dark)); }
.line-bar.half { background: linear-gradient(180deg, var(--color-primary) 40%, var(--color-border-light) 60%); }

/* 今日工时 */
.work-duration {
  display: flex; justify-content: space-between; align-items: flex-end;
  padding-top: 16px; border-top: 1px dashed var(--color-border);
}
.duration-left { display: flex; flex-direction: column; gap: 2px; }
.duration-label { font-size: 13px; color: var(--color-text-tertiary); }
.duration-sub { font-size: 12px; color: var(--color-success); font-weight: 500; }
.duration-sub.ongoing { color: var(--color-primary); }
.duration-value {
  font-size: 26px; font-weight: 800; color: var(--color-primary);
  letter-spacing: -0.4px; font-family: var(--font-mono);
}

/* 按钮区 */
.checkin-area {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 16px 20px 8px; gap: 24px;
}
.button-wrapper { width: 240px; height: 240px; display: flex; align-items: center; justify-content: center; }

.check-button {
  width: 240px; height: 240px; border-radius: 50%;
  background: linear-gradient(145deg, var(--color-primary-light), var(--color-primary), var(--color-primary-dark));
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  box-shadow: 0 16px 48px rgba(99, 102, 241, 0.32), inset 0 1px 0 rgba(255,255,255,0.2);
  transition: all var(--transition-base);
  border: none; cursor: pointer;
}
.check-button:active:not(.disabled) { transform: scale(0.94); }
.check-button.disabled { background: linear-gradient(145deg, #cbd5e1, #94a3b8, #64748b); box-shadow: 0 12px 32px rgba(100, 116, 139, 0.18); cursor: not-allowed; }
.check-button.success { animation: successPop 0.5s ease; }
.check-button.auto-success {
  animation: autoSuccessGlow 2s ease;
  background: linear-gradient(145deg, #34d399, var(--color-success), var(--color-success-strong));
  box-shadow: 0 16px 48px rgba(16, 185, 129, 0.32), inset 0 1px 0 rgba(255,255,255,0.2);
}
.check-label {
  font-size: 18px; color: var(--color-white-strong); font-weight: 600;
  text-shadow: 0 1px 4px rgba(0,0,0,0.12); letter-spacing: 0.5px;
}
.check-time {
  font-size: 40px; color: var(--color-white); font-weight: 300; letter-spacing: 2px;
  font-family: var(--font-mono); text-shadow: 0 2px 6px rgba(0,0,0,0.08);
}

.hint-row {
  padding: 10px 16px; border-radius: var(--radius-md);
  background: var(--color-border-light);
  font-size: 13px; color: var(--color-text-secondary);
  max-width: 360px; text-align: center;
}
.hint-sub { color: var(--color-text-tertiary); margin-left: 4px; }

.kbd-row {
  font-size: 12px; color: var(--color-text-tertiary);
  display: flex; align-items: center; gap: 6px;
}
.window-warn { color: var(--color-warning, #b45309); }
kbd {
  font-family: var(--font-mono); font-size: 11px;
  padding: 2px 6px; border-radius: 6px;
  background: var(--color-white); border: 1px solid var(--color-border);
  box-shadow: 0 1px 0 var(--color-border);
  color: var(--color-text-secondary);
}

@keyframes successPop { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
@keyframes autoSuccessGlow {
  0%,100% { transform: scale(1); }
  20%     { transform: scale(1.06); }
  40%     { transform: scale(1); }
  60%     { transform: scale(1.04); }
  80%     { transform: scale(1); }
}
</style>