<template>
  <div class="checkin-page">
    <!-- 问候区 -->
    <div class="greeting-card glass-card-strong fade-in-up">
      <div class="greeting-left">
        <div class="greeting-text">{{ greeting }}</div>
        <div class="greeting-date">{{ attendanceStore.currentDate }}</div>
      </div>
      <button class="settings-icon-btn" @click="showSettings = !showSettings" :class="{ active: showSettings }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
        </svg>
      </button>

      <!-- 快速设置面板（精简版，完整设置在 Settings 页） -->
      <Transition name="slide-down">
        <div class="settings-popup" v-if="showSettings">
          <div class="popup-header">
            <span class="popup-title">快速设置</span>
            <button class="popup-close" @click="showSettings = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="popup-content">
            <!-- 自动打卡 -->
            <div class="popup-group">
              <label class="group-label">自动打卡</label>
              <div class="auto-items">
                <div class="auto-item">
                  <span>上班</span>
                  <div class="mini-toggle" @click="toggleAutoCheckIn" :class="{ on: attendanceStore.autoCheckIn }"></div>
                </div>
                <div class="auto-item">
                  <span>自动启动</span>
                  <div class="mini-toggle" @click="toggleAutoStartup" :class="{ on: attendanceStore.autoStartup }"></div>
                </div>
                <div class="auto-item">
                  <span>关机下班</span>
                  <div class="mini-toggle" @click="toggleAutoCheckOutOnShutdown" :class="{ on: attendanceStore.autoCheckOutOnShutdown }"></div>
                </div>
              </div>
            </div>

            <button class="popup-link" @click="goToFullSettings">
              完整设置 →
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 打卡状态卡 -->
    <div class="status-card glass-card-strong fade-in-scale" style="animation-delay: 0.1s">
      <div class="punch-status">
        <div class="punch-item" :class="{ done: attendanceStore.todayRecords?.checkIn }">
          <div class="punch-icon-wrap" :class="{ done: attendanceStore.todayRecords?.checkIn }">
            <svg v-if="attendanceStore.todayRecords?.checkIn" class="punch-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span v-else class="punch-emoji">☀️</span>
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
            <span v-else class="punch-emoji">🌙</span>
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

    <!-- 打卡按钮区 -->
    <div class="checkin-area fade-in-scale" style="animation-delay: 0.2s">
      <div class="button-wrapper">
        <div class="pulse-ring" v-if="attendanceStore.canCheck"></div>
        <div class="pulse-ring delay" v-if="attendanceStore.canCheck"></div>

        <button
          class="check-button"
          :class="{
            disabled: attendanceStore.isChecking,
            success: checkSuccess,
            'auto-success': autoCheckInSuccess,
          }"
          :disabled="attendanceStore.isChecking"
          @click="handleCheck"
        >
          <span class="check-label">
            {{ attendanceStore.isChecking ? '打卡中...' : autoCheckInSuccess ? '自动打卡成功 ✓' : attendanceStore.checkText }}
          </span>
          <span class="check-time">{{ attendanceStore.currentTime }}</span>
        </button>
      </div>

      <div class="hints-area">
        <div class="hint-row">
          <span class="hint-icon">⏰</span>
          <span class="hint-text">
            {{ attendanceStore.workStartTime }} — {{ attendanceStore.workEndTime }}
            <span v-if="attendanceStore.enableRest" class="hint-sub">
              · 午休 {{ attendanceStore.restStart }}-{{ attendanceStore.restEnd }}
            </span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed } from "vue"
import { useAttendanceStore } from "../stores/attendance"
import { getStatusText } from "../utils/attendanceUtils"
import { timeToMinutes, getTodayString } from "../utils/dateUtils"
import { useKeyboard } from "../composables/useKeyboard"
import { useToast } from "../composables/useToast"
import { useRouter } from "vue-router"
import { createLogger } from "../utils/logger"

const log = createLogger('checkin-view')
const attendanceStore = useAttendanceStore()
const toast = useToast()
const router = useRouter()
const checkSuccess = ref(false)
const autoCheckInSuccess = ref(false)
const showSettings = ref(false)

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return "夜深了，注意休息 🌙"
  if (hour < 9) return "早上好，新的一天开始了 ☀️"
  if (hour < 12) return "上午好，工作顺利 👋"
  if (hour < 14) return "中午好，记得休息 🍜"
  if (hour < 18) return "下午好，继续加油 💪"
  if (hour < 22) return "晚上好，辛苦了 🌟"
  return "夜深了，注意休息 🌙"
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

/** 快速切换自动打卡设置并立即保存 */
function _toggleAndSave(key) {
  attendanceStore[key] = !attendanceStore[key]
  attendanceStore.updateWorkSettings({ [key]: attendanceStore[key] })
}

function toggleAutoCheckIn() { _toggleAndSave('autoCheckIn') }
function toggleAutoStartup() { _toggleAndSave('autoStartup') }
function toggleAutoCheckOutOnShutdown() { _toggleAndSave('autoCheckOutOnShutdown') }

function goToFullSettings() {
  showSettings.value = false
  router.push('/settings')
}

let clockTimer = null
let isClicking = false

async function handleCheck(isAuto = false, fromShutdown = false) {
  if (isClicking) return
  isClicking = true
  try {
    const result = await attendanceStore.handleCheck()
    if (result.success === false) { log.warn("打卡失败:", result.message); return }
    checkSuccess.value = true
    updateTrayStatus()
    if ((isAuto || fromShutdown) && window.electronAPI && window.electronAPI.notification) {
      const msg = result.type === "上班"
        ? `上班打卡已完成: ${new Date().toLocaleTimeString()}`
        : `下班打卡已完成: ${new Date().toLocaleTimeString()}`
      const title = fromShutdown ? "🔔 关机自动下班打卡成功" : "自动打卡成功"
      await window.electronAPI.notification.send(title, msg)
    }
    if (isAuto) { autoCheckInSuccess.value = true; setTimeout(() => { autoCheckInSuccess.value = false }, 2000) }
    setTimeout(() => { checkSuccess.value = false }, 500)
  } finally {
    setTimeout(() => { isClicking = false }, 1000)
  }
}

function updateTrayStatus() {
  if (!window.electronAPI || !window.electronAPI.tray) return
  const r = attendanceStore.todayRecords
  if (!r || !r.checkIn) window.electronAPI.tray.updateStatus("none")
  else if (!r.checkOut) window.electronAPI.tray.updateStatus("checked_in")
  else window.electronAPI.tray.updateStatus("checked_out")
}



// ── 键盘快捷键 ──
useKeyboard({
  'check-in': () => {
    if (attendanceStore.canCheck && !attendanceStore.isChecking) {
      handleCheck()
      toast.info('快捷键打卡：上班')
    }
  },
  'check-out': () => {
    if (attendanceStore.canCheck && !attendanceStore.isChecking) {
      handleCheck()
      toast.info('快捷键打卡：下班')
    }
  },
  'settings': () => router.push('/settings')
})

onMounted(async () => {
  await attendanceStore.loadRecords()
  attendanceStore.updateCurrentTime()
  clockTimer = setInterval(() => { attendanceStore.updateCurrentTime() }, 1000)
  updateTrayStatus()
  if (window.electronAPI) {
    window.electronAPI.onTriggerCheckIn(() => handleCheck())
    window.electronAPI.onTriggerCheckOut(() => handleCheck())
    window.electronAPI.onTriggerAutoCheckIn(() => {
      const r = attendanceStore.todayRecords
      if (r && r.checkIn) return
      handleCheck(true)
    })
    window.electronAPI.onShutdownCheckOut(() => handleCheck(false, true))
    window.electronAPI.onCheckAutoCheckIn(() => { attendanceStore.tryAutoCheckIn(false) })
  }
})

onUnmounted(() => { if (clockTimer) clearInterval(clockTimer) })
</script>

<style scoped>
.checkin-page {
  min-height: 100vh;
  padding: 20px 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 560px;
  margin: 0 auto;
}

/* === 玻璃卡片基础样式 === */
.glass-card-strong {
  background: #ffffff;
  border-radius: var(--radius-2xl);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.06);
}

/* === 问候卡 === */
.greeting-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px 8px;
  position: relative;
  z-index: 100;
}

.greeting-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.greeting-text {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.2px;
}

.greeting-date {
  font-size: 14px;
  color: var(--color-text-tertiary);
  font-weight: 400;
}

/* === 状态卡 === */
.status-card {
  padding: 28px 24px;
}

.punch-status {
  display: flex;
  align-items: stretch;
  gap: 16px;
}

.punch-item {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
}

.punch-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-border-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition-slow);
}

.punch-icon-wrap.done {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  box-shadow: 0 4px 14px var(--color-primary-glow);
}

.punch-svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.punch-emoji {
  font-size: 24px;
}

.punch-info {
  flex: 1;
  min-width: 0;
}

.punch-title {
  font-size: 14px;
  color: var(--color-text-tertiary);
  margin-bottom: 6px;
  font-weight: 500;
}

.punch-time { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.time-text {
  font-size: 20px;
  color: var(--color-text-primary);
  font-weight: 700;
  letter-spacing: -0.3px;
}

.time-text.placeholder {
  color: var(--color-text-placeholder);
  font-weight: 400;
  font-size: 16px;
}

.status-tag {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: var(--radius-sm);
  font-weight: 600;
}

.status-tag.normal { background: var(--color-success-bg); color: var(--color-success); }
.status-tag.warn   { background: var(--color-danger-bg);  color: var(--color-danger); }
.status-tag.danger { background: #fee2e2;                 color: #b91c1c; }
.status-tag.ot     { background: var(--color-purple-bg);  color: var(--color-purple); }

/* 连线 */
.punch-line {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  padding: 0 6px;
}

.line-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-border);
  transition: all var(--transition-base);
}
.line-dot.done {
  background: var(--color-primary);
  box-shadow: 0 0 8px var(--color-primary-glow);
}

.line-bar {
  width: 3px;
  flex: 1;
  min-height: 32px;
  background: var(--color-border);
  margin: 6px 0;
  border-radius: 2px;
  transition: all var(--transition-slow);
}
.line-bar.done { background: linear-gradient(180deg, var(--color-primary), var(--color-primary-dark)); }
.line-bar.half { background: linear-gradient(180deg, var(--color-primary) 40%, var(--color-border-light) 60%); }

/* 工时 */
.work-duration {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px dashed var(--color-border);
}

.duration-left { display: flex; flex-direction: column; gap: 2px; }
.duration-label { font-size: 14px; color: var(--color-text-tertiary); }

.duration-sub {
  font-size: 12px;
  color: var(--color-success);
  font-weight: 500;
}
.duration-sub.ongoing { color: var(--color-primary); animation: breathe 2s ease-in-out infinite; }

.duration-value {
  font-size: 28px;
  font-weight: 800;
  color: var(--color-primary);
  letter-spacing: -0.5px;
  font-family: var(--font-mono);
}

/* === 打卡按钮 === */
.checkin-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 20px;
  gap: 36px;
}

.button-wrapper {
  position: relative;
  width: 260px;
  height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 脉冲环 */
.pulse-ring {
  position: absolute;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  border: 3px solid var(--color-primary-glow);
  animation: pulseRing 2.2s ease-out infinite;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.pulse-ring.delay { animation-delay: 1.1s; }

@keyframes pulseRing {
  0%   { width: 220px; height: 220px; opacity: 0.7; }
  100% { width: 340px; height: 340px; opacity: 0; }
}

/* 按钮主体 */
.check-button {
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: linear-gradient(145deg, var(--color-primary-light), var(--color-primary), var(--color-primary-dark));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  box-shadow:
    0 20px 60px rgba(99, 102, 241, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all var(--transition-base);
  position: relative;
  z-index: 1;
  border: none;
  cursor: pointer;
}

.check-button::after {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background: linear-gradient(145deg, rgba(255,255,255,0.3), transparent, rgba(255,255,255,0.1));
  pointer-events: none;
}

.check-button:active:not(.disabled) {
  transform: scale(0.94);
  box-shadow: 0 12px 32px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.check-button.disabled {
  background: linear-gradient(145deg, #cbd5e1, #94a3b8, #64748b);
  box-shadow: 0 16px 40px rgba(100, 116, 139, 0.2);
  cursor: not-allowed;
}

.check-button.success { animation: successPop 0.5s ease; }
@keyframes successPop {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.04); }
}

.check-button.auto-success {
  animation: autoSuccessGlow 2s ease;
  background: linear-gradient(145deg, #34d399, var(--color-success), #059669);
  box-shadow: 0 20px 60px rgba(16, 185, 129, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2);
}
@keyframes autoSuccessGlow {
  0%, 100% { transform: scale(1); }
  20%      { transform: scale(1.06); }
  40%      { transform: scale(1); }
  60%      { transform: scale(1.04); }
  80%      { transform: scale(1); }
}

.check-label {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 600;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  letter-spacing: 1px;
}

.check-time {
  font-size: 44px;
  color: #fff;
  font-weight: 300;
  letter-spacing: 3px;
  font-family: var(--font-mono);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* === 提示区 === */
.hints-area {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 360px;
}

.hint-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  color: var(--color-text-secondary);
  backdrop-filter: blur(8px);
}

.hint-row.warn  { background: rgba(254, 243, 199, 0.6); color: #92400e; }
.hint-row.split { background: rgba(238, 242, 255, 0.6); color: var(--color-primary-dark); }

.hint-icon { font-size: 15px; flex-shrink: 0; }
.hint-text  { line-height: 1.4; }
.hint-sub   { color: var(--color-text-tertiary); }

/* === 问候区设置图标 === */
.settings-icon-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-left: 8px;
}

.settings-icon-btn:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.settings-icon-btn.active {
  background: linear-gradient(135deg, var(--color-primary), #818cf8);
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.settings-icon-btn.active svg {
  color: white;
}

.settings-icon-btn svg {
  width: 18px;
  height: 18px;
  color: var(--color-primary);
  transition: all 0.3s ease;
}

/* 快速设置弹出面板（精简版） */
.settings-popup {
  position: absolute;
  right: 16px;
  top: calc(100% + 8px);
  width: 260px;
  background: var(--color-bg-card);
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  z-index: 1000;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-border-light);
}

.popup-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.popup-close {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border-light);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.popup-close:hover {
  background: var(--color-border);
}

.popup-close svg {
  width: 15px;
  height: 15px;
  color: var(--color-text-secondary);
}

.popup-content {
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.popup-group { display: flex; flex-direction: column; gap: 8px; }
.popup-group .group-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.auto-items { display: flex; flex-direction: column; gap: 6px; }
.auto-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--color-border-light);
  border-radius: 8px;
}
.auto-item span { font-size: 13px; font-weight: 500; color: var(--color-text-primary); }

.mini-toggle {
  width: 38px;
  height: 22px;
  background: #e5e7eb;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
}
.mini-toggle.on { background: linear-gradient(135deg, var(--color-primary), #818cf8); }
.mini-toggle::before {
  content: "";
  position: absolute;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  top: 3px;
  left: 3px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.mini-toggle.on::before { left: 19px; }

.popup-link {
  width: 100%;
  padding: 10px;
  background: var(--color-border-light);
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}
.popup-link:hover {
  background: var(--color-primary-bg);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>