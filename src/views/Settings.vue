<template>
  <div class="settings-page">
    <!-- 工作时间设置 -->
    <div class="settings-card time-card fade-in-up">
      <div class="card-header">
        <div class="card-header-left">
          <div class="card-header-text">
            <span class="card-title">工作时间设置</span>
          </div>
        </div>
      </div>
      
      <div class="time-settings">
        <!-- 实时校验错误提示 -->
        <div class="validation-errors" v-if="timeErrors.length > 0">
          <div class="error-item" v-for="err in timeErrors" :key="err">⚠ {{ err }}</div>
        </div>

        <div class="time-row time-row-2col">
          <div class="time-field">
            <label class="time-label">上班时间</label>
            <input type="time" v-model="localSettings.workStartTime" class="time-input" :class="{ 'input-error': timeErrors.length > 0 }" />
          </div>
          <div class="time-field">
            <label class="time-label">下班时间</label>
            <input type="time" v-model="localSettings.workEndTime" class="time-input" :class="{ 'input-error': timeErrors.length > 0 }" />
          </div>
        </div>

        <div class="time-group">
          <div class="time-group-title">工作日</div>
          <div class="weekday-selector">
            <div
              v-for="day in weekDays"
              :key="day.value"
              class="weekday-item"
              :class="{ active: localSettings.workDays.includes(day.value) }"
              @click="toggleWeekDay(day.value)"
            >
              {{ day.label }}
            </div>
          </div>
        </div>

        <div class="time-group">
          <div class="time-group-title">午休时间</div>
          <div class="time-row time-row-compact">
            <label class="time-label">启用午休</label>
            <button type="button" class="switch" :class="{ active: localSettings.enableRest }" role="switch" :aria-checked="localSettings.enableRest" @click="localSettings.enableRest = !localSettings.enableRest" @keydown.enter.prevent="localSettings.enableRest = !localSettings.enableRest"></button>
          </div>
          <div class="time-row time-row-2col" :class="{ disabled: !localSettings.enableRest }">
            <div class="time-field">
              <label class="time-label">午休开始</label>
              <input type="time" v-model="localSettings.restStart" class="time-input" :disabled="!localSettings.enableRest" />
            </div>
            <div class="time-field">
              <label class="time-label">午休结束</label>
              <input type="time" v-model="localSettings.restEnd" class="time-input" :disabled="!localSettings.enableRest" />
            </div>
          </div>
        </div>

        <div class="time-group">
          <div class="time-group-title">打卡设置</div>
          <div class="time-row time-row-2col">
            <div class="time-field">
              <div class="time-label-wrapper">
                <label class="time-label">打卡窗口</label>
                <span class="param-hint">上班前可打卡</span>
              </div>
              <div class="number-input-inline">
                <input type="number" v-model.number="localSettings.checkWindowBefore" class="number-input" min="0" max="120" @blur="clampNumber('checkWindowBefore', 0, 120)" />
                <span class="unit-label">分钟</span>
              </div>
            </div>
            <div class="time-field">
              <div class="time-label-wrapper">
                <label class="time-label">迟到阈值</label>
                <span class="param-hint">超时算迟到</span>
              </div>
              <div class="number-input-inline">
                <input type="number" v-model.number="localSettings.lateThreshold" class="number-input" min="0" max="120" @blur="clampNumber('lateThreshold', 0, 120)" />
                <span class="unit-label">分钟</span>
              </div>
            </div>
          </div>
        </div>

        <div class="time-group">
          <div class="time-group-title">加班设置</div>
          <div class="time-row time-row-compact">
            <label class="time-label">工作日加班</label>
            <button type="button" class="switch" :class="{ active: localSettings.overtimeOnWorkday }" role="switch" :aria-checked="localSettings.overtimeOnWorkday" @click="localSettings.overtimeOnWorkday = !localSettings.overtimeOnWorkday" @keydown.enter.prevent="localSettings.overtimeOnWorkday = !localSettings.overtimeOnWorkday"></button>
          </div>
          <div class="time-row time-row-compact">
            <label class="time-label">周六加班</label>
            <button type="button" class="switch" :class="{ active: localSettings.overtimeOnSaturday }" role="switch" :aria-checked="localSettings.overtimeOnSaturday" @click="localSettings.overtimeOnSaturday = !localSettings.overtimeOnSaturday" @keydown.enter.prevent="localSettings.overtimeOnSaturday = !localSettings.overtimeOnSaturday"></button>
          </div>
          <div class="time-row time-row-compact">
            <label class="time-label">周日加班</label>
            <button type="button" class="switch" :class="{ active: localSettings.overtimeOnSunday }" role="switch" :aria-checked="localSettings.overtimeOnSunday" @click="localSettings.overtimeOnSunday = !localSettings.overtimeOnSunday" @keydown.enter.prevent="localSettings.overtimeOnSunday = !localSettings.overtimeOnSunday"></button>
          </div>
          <div class="time-row">
            <div class="time-label-wrapper">
              <label class="time-label">加班判定阈值</label>
              <span class="param-hint">下班后超过此分钟数开始计算加班</span>
            </div>
            <div class="number-input-inline" style="flex:none">
              <input type="number" v-model.number="localSettings.overtimeAfterEndThreshold" class="number-input" min="0" max="180" :disabled="!anyOvertimeEnabled" @blur="clampNumber('overtimeAfterEndThreshold', 0, 180)" />
              <span class="unit-label">分钟</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 自动打卡设置 -->
    <div class="settings-card auto-card fade-in-up">
      <div class="card-header">
        <div class="card-header-left">
          <div class="card-header-text">
            <span class="card-title">自动打卡</span>
          </div>
        </div>
      </div>
      
      <div class="auto-settings">
        <div class="auto-group">
          <div class="auto-group-title">开关设置</div>
          <div class="setting-item">
            <div class="setting-label-wrapper">
              <span class="setting-label">自动上班打卡</span>
              <span class="setting-hint">到达上班时间自动完成签到（含开机自启后触发）</span>
            </div>
            <button type="button" class="switch" :class="{ active: localSettings.autoCheckIn }" role="switch" :aria-checked="localSettings.autoCheckIn" @click="localSettings.autoCheckIn = !localSettings.autoCheckIn" @keydown.enter.prevent="localSettings.autoCheckIn = !localSettings.autoCheckIn"></button>
          </div>
          <div class="setting-item">
            <div class="setting-label-wrapper">
              <span class="setting-label">关机自动签退</span>
              <span class="setting-hint">关闭电脑/退出程序时自动完成下班打卡，避免漏卡</span>
            </div>
            <button type="button" class="switch" :class="{ active: localSettings.autoCheckOutOnShutdown }" role="switch" :aria-checked="localSettings.autoCheckOutOnShutdown" @click="toggleShutdownAutoCheck" @keydown.enter.prevent="toggleShutdownAutoCheck"></button>
          </div>
        </div>

        <div class="auto-group">
          <div class="auto-group-title">偏移参数</div>
          <div class="setting-item">
            <div class="setting-label-wrapper">
              <span class="setting-label">上班打卡偏移（分钟）</span>
              <span class="setting-hint">正数=延后打卡，负数=提前打卡</span>
            </div>
            <input type="number" v-model.number="localSettings.autoCheckInOffset" class="number-input small" :disabled="!localSettings.autoCheckIn" @blur="clampNumber('autoCheckInOffset', -120, 120)" />
          </div>
        </div>
      </div>
    </div>

    <!-- 系统设置 -->
    <div class="settings-card system-card fade-in-up">
      <div class="card-header">
        <div class="card-header-left">
          <div class="card-header-text">
            <span class="card-title">系统设置</span>
          </div>
        </div>
      </div>
      
      <div class="system-settings">
        <div class="setting-item">
          <div class="setting-label-wrapper">
            <span class="setting-label">开机自启动</span>
            <span class="setting-hint">系统启动时自动运行本程序</span>
          </div>
          <button type="button" class="switch" :class="{ active: localSettings.autoStartup }" role="switch" :aria-checked="localSettings.autoStartup" @click="localSettings.autoStartup = !localSettings.autoStartup" @keydown.enter.prevent="localSettings.autoStartup = !localSettings.autoStartup"></button>
        </div>
      </div>
    </div>

    <!-- 数据管理 -->
    <div class="settings-card data-card fade-in-up">
      <div class="card-header">
        <div class="card-header-left">
          <div class="card-header-text">
            <span class="card-title">数据管理</span>
          </div>
        </div>
      </div>
      <div class="data-settings">
        <div class="setting-item">
          <div class="setting-label-wrapper">
            <span class="setting-label">检查更新</span>
            <span class="setting-hint" v-if="updateInfo?.available">新版本 v{{ updateInfo.version }}</span>
            <span class="setting-hint" v-else-if="updateInfo?.dev">开发模式</span>
            <span class="setting-hint" v-else>当前已是最新版本</span>
          </div>
          <button class="btn-secondary check-btn" @click="checkForUpdates" :disabled="checkingUpdate">
            {{ checkingUpdate ? '检查中...' : '检查' }}
          </button>
        </div>
        <div class="setting-item" v-if="updateInfo?.available">
          <div class="setting-label-wrapper">
            <span class="setting-label">下载更新</span>
            <span class="setting-hint">点击下载并在下次启动时安装</span>
          </div>
          <button class="btn-secondary download-btn" @click="downloadUpdate">
            下载 v{{ updateInfo.version }}
          </button>
        </div>
        <div class="setting-item">
          <div class="setting-label-wrapper">
            <span class="setting-label">数据加密</span>
            <span class="setting-hint">{{ getEncryptionHint() }}</span>
          </div>
          <span class="status-badge" :class="getEncryptionBadgeClass()">
            {{ getEncryptionLabel() }}
          </span>
        </div>
      </div>
      <div class="data-stats">
        <div class="stat-chip">
          <span class="stat-chip-value">{{ dataStats.totalRecords }}</span>
          <span class="stat-chip-label">考勤记录</span>
        </div>
        <div class="stat-chip-divider"></div>
        <div class="stat-chip">
          <span class="stat-chip-value">{{ dataStats.backupCount }}</span>
          <span class="stat-chip-label">备份数量</span>
        </div>
      </div>
      <div class="data-actions">
        <button class="btn-secondary" @click="exportData" :disabled="isExporting">导出</button>
        <button class="btn-secondary" @click="importData" :disabled="isImporting">导入</button>
        <button class="btn-secondary" @click="openBackupFolder">备份目录</button>
        <button class="btn-secondary danger" @click="clearAllRecords">清空</button>
      </div>
      <div class="history-section" v-if="backupList.length > 0">
        <div class="history-header" @click="historyCollapsed = !historyCollapsed">
          <span class="backup-title">历史备份 ({{ backupList.length }})</span>
          <span class="collapse-icon">{{ historyCollapsed ? '▸' : '▾' }}</span>
        </div>
        <div class="backup-list" v-show="!historyCollapsed">
          <div class="backup-item" v-for="b in backupList" :key="b.name">
            <div class="backup-info">
              <span class="backup-name">{{ b.name }}</span>
              <span class="backup-time">{{ formatTime(b.modified) }}</span>
            </div>
            <div class="backup-btns">
              <button class="btn-small" @click="restoreBackup(b.name)">恢复</button>
              <button class="btn-small danger" @click="deleteBackup(b.name)">删除</button>
            </div>
          </div>
        </div>
      </div>
      <div class="no-backups" v-else>
        <span>暂无备份记录</span>
      </div>
    </div>

    <!-- 底部操作 -->
    <div class="settings-actions fade-in-up">
      <button class="btn-cancel" @click="resetSettings" :disabled="isSaving">恢复默认</button>
      <button class="btn-confirm" @click="saveSettings" :disabled="isSaving">
        {{ isSaving ? '保存中...' : '保存设置' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from "vue"
import { useAttendanceStore } from "../stores/attendance"
import { useToast } from "../composables/useToast"
import { useSettingsValidation } from "../composables/useSettingsValidation"
import { useDataManagement } from "../composables/useDataManagement"
import { DEFAULT_CONFIG } from "../utils/constants"

const store = useAttendanceStore()
const toast = useToast()

// ── 设置项 schema ──
const weekDays = [
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
  { value: 0, label: '日' }
]

const SETTING_KEYS = [
  'workStartTime', 'workEndTime', 'workDays',
  'autoStartup', 'autoCheckIn',
  'autoCheckInOffset', 'autoCheckOutOnShutdown',
  'enableRest', 'restStart', 'restEnd',
  'checkWindowBefore', 'lateThreshold',
  'overtimeOnNonWorkday',
  'overtimeOnSaturday', 'overtimeOnSunday', 'overtimeOnWorkday',
  'overtimeAfterEndThreshold'
]

const localSettings = reactive({
  workStartTime: DEFAULT_CONFIG.WORK_START_TIME,
  workEndTime: DEFAULT_CONFIG.WORK_END_TIME,
  workDays: [...DEFAULT_CONFIG.WORK_DAYS],
  autoStartup: DEFAULT_CONFIG.AUTO_STARTUP,
  autoCheckIn: DEFAULT_CONFIG.AUTO_CHECK_IN,
  autoCheckInOffset: DEFAULT_CONFIG.AUTO_CHECK_IN_OFFSET,
  autoCheckOutOnShutdown: DEFAULT_CONFIG.AUTO_CHECK_OUT_ON_SHUTDOWN,
  enableRest: DEFAULT_CONFIG.ENABLE_REST,
  restStart: DEFAULT_CONFIG.REST_START,
  restEnd: DEFAULT_CONFIG.REST_END,
  checkWindowBefore: DEFAULT_CONFIG.CHECK_WINDOW_BEFORE,
  lateThreshold: DEFAULT_CONFIG.LATE_THRESHOLD,
  overtimeOnNonWorkday: DEFAULT_CONFIG.OVERTIME_ON_NON_WORKDAY,
  overtimeOnSaturday: DEFAULT_CONFIG.OVERTIME_ON_SATURDAY,
  overtimeOnSunday: DEFAULT_CONFIG.OVERTIME_ON_SUNDAY,
  overtimeOnWorkday: DEFAULT_CONFIG.OVERTIME_ON_WORKDAY,
  overtimeAfterEndThreshold: DEFAULT_CONFIG.OVERTIME_AFTER_END_THRESHOLD
})

// ── 校验器（composable）──
const { timeErrors, anyOvertimeEnabled, validateSettings } = useSettingsValidation(localSettings)

// ── 数据管理（composable）──
const {
  appVersion, dataStats, backupList, isExporting, isImporting,
  checkingUpdate, updateInfo, encryptionStatus,
  loadDataStats, checkForUpdates, downloadUpdate, loadEncryptionStatus,
  getEncryptionHint, getEncryptionLabel, getEncryptionBadgeClass,
  exportData, importData, restoreBackup, deleteBackup, clearAllRecords,
  openBackupFolder, formatTime
} = useDataManagement(() => store.loadRecords(), toast)

// ── 本地 UI 状态 ──
const isSaving = ref(false)
const historyCollapsed = ref(true)

/** 从 store 配置加载到 localSettings */
function loadSettingsFromStore() {
  const config = store.getConfig()
  for (const key of SETTING_KEYS) {
    if (config[key] !== undefined) {
      localSettings[key] = config[key]
    }
  }
}

function toggleWeekDay(dayValue) {
  const index = localSettings.workDays.indexOf(dayValue)
  if (index > -1) {
    localSettings.workDays.splice(index, 1)
  } else {
    localSettings.workDays.push(dayValue)
  }
}

/** 限制数字输入范围 */
function clampNumber(field, min, max) {
  const v = localSettings[field]
  if (v == null || isNaN(v)) {
    localSettings[field] = min
    return
  }
  if (v < min) localSettings[field] = min
  if (v > max) localSettings[field] = max
}

/** 关机自动打卡开关：开启时二次确认 */
function toggleShutdownAutoCheck() {
  if (localSettings.autoCheckOutOnShutdown) {
    localSettings.autoCheckOutOnShutdown = false
    return
  }
  const confirmed = window.confirm(
    '开启"关机自动打卡"后，关闭软件时将自动签退。\n' +
    '若程序异常崩溃或误关闭，也会生成下班打卡记录。\n\n' +
    '是否确认开启？'
  )
  if (confirmed) {
    localSettings.autoCheckOutOnShutdown = true
  }
}

async function saveSettings() {
  const errors = validateSettings(localSettings)
  if (errors.length > 0) {
    toast.error(errors[0])
    return
  }

  isSaving.value = true
  try {
    const config = { ...localSettings }
    await store.updateWorkSettings(config)
    loadSettingsFromStore()
    toast.success('设置保存成功！')
  } catch (error) {
    toast.error('保存设置失败：' + (error?.message || '未知错误'))
  } finally {
    isSaving.value = false
  }
}

async function resetSettings() {
  if (!confirm("确定要重置为默认设置吗？")) return
  await store.resetToDefaults()
  Object.assign(localSettings, store.getConfig())
  toast.success('已重置为默认设置！')
}

onMounted(async () => {
  await store.loadRecords()
  loadSettingsFromStore()
  await loadDataStats()
  await loadEncryptionStatus()
  try {
    if (window.electronAPI?.dataManager?.getAppVersion) {
      appVersion.value = await window.electronAPI.dataManager.getAppVersion()
    }
  } catch (_) { /* 非 Electron 环境忽略 */ }
})
</script>

<style scoped>
.settings-page {
  max-width: 560px;
  margin: 0 auto;
  padding: 16px 0 40px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* === 卡片 === */
.settings-card {
  margin: 0 20px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-card);
  border: 1px solid rgba(255, 255, 255, 0.6);
  overflow: hidden;
}

.time-card {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(255, 255, 255, 0.9));
}

.auto-card {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(255, 255, 255, 0.9));
}

.card-header {
  padding: 14px 24px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-icon {
  font-size: 20px;
}

.card-header-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 22px;
}

.card-subtitle {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-weight: 400;
  line-height: 16px;
  opacity: 0.85;
}

/* === 时间设置 === */
.time-settings {
  padding: 4px 24px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.time-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 32px;
}

.time-row-compact {
  min-height: 28px;
}

.time-row-2col {
  gap: 12px;
}

.time-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.time-row-2col .time-field:nth-child(1) {
  flex: 1;
}

.time-row-2col .time-field:nth-child(2) {
  flex: 1;
}

.time-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border-light);
}

.time-group:first-child {
  padding-top: 0;
  border-top: none;
}

.time-group-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  line-height: 18px;
}

.time-label {
  font-size: 12px;
  color: var(--color-text-primary);
  font-weight: 500;
  line-height: 18px;
}

.time-row-compact .time-label {
  flex: 1;
}

.time-label-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.param-hint {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-weight: 400;
  line-height: 14px;
  opacity: 0.75;
}

.unit-label {
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-left: 6px;
}

.number-input-inline {
  display: flex;
  align-items: center;
  gap: 4px;
}

.number-input-inline .number-input {
  width: 70px;
}

.validation-errors {
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.08);
  border-radius: var(--radius-md);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.error-item {
  font-size: 12px;
  color: var(--color-danger);
  font-weight: 500;
  line-height: 18px;
}

.input-error {
  border-color: var(--color-danger) !important;
}

.time-input:disabled,
.number-input:disabled {
  background: var(--color-bg);
  color: var(--color-text-secondary);
  cursor: not-allowed;
  opacity: 0.6;
}

.time-input {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--color-text-primary);
  background: #fff;
  outline: none;
  transition: border-color 0.2s;
  flex-shrink: 0;
  height: 36px;
}

.time-input:focus {
  border-color: var(--color-primary);
}

.number-input {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--color-text-primary);
  background: #fff;
  outline: none;
  width: 100px;
  text-align: right;
  transition: border-color 0.2s;
  flex-shrink: 0;
  height: 36px;
}

.number-input:focus {
  border-color: var(--color-primary);
}

.number-input.small {
  width: 80px;
}

/* === 工作日选择 === */
.weekday-selector {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.weekday-item {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.weekday-item.active {
  background: var(--color-primary);
  color: #fff;
  box-shadow: 0 1px 4px var(--color-primary-glow);
}

.weekday-item:hover {
  transform: scale(1.05);
}

.weekday-item:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* === 自动打卡设置 === */
.auto-settings {
  padding: 8px 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.auto-group {
  display: flex;
  flex-direction: column;
}

.auto-group + .auto-group {
  border-top: 1px solid var(--color-border-light);
  padding-top: 12px;
}

.auto-group-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 20px;
  margin: 4px 16px 8px;
}

/* === 设置项 === */
.setting-item {
  display: flex;
  align-items: flex-start;
  padding: 14px 16px;
  border-top: 1px solid var(--color-border-light);
  gap: 16px;
}

.setting-item > .switch {
  margin-top: -6px;
}

.setting-item > .number-input,
.setting-item > .btn-secondary,
.setting-item > .status-badge {
  margin-top: -8px;
}

.setting-label-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.setting-label {
  font-size: 14px;
  color: var(--color-text-primary);
  font-weight: 500;
  line-height: 20px;
}

.setting-hint {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 400;
  line-height: 18px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  height: 36px;
  padding: 0 12px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.status-badge--encrypted {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.status-badge--available {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.status-badge--unavailable {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}

/* === Switch === */
.switch {
  width: 52px;
  height: 32px;
  border-radius: 999px;
  background: #d1d5db;
  position: relative;
  transition: background-color var(--transition-base);
  cursor: pointer;
  flex-shrink: 0;
  border: none;
  padding: 0;
  min-width: 52px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
}

.switch:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.switch.active {
  background: var(--color-primary);
}

.switch::before {
  content: "";
  position: absolute;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #fff;
  top: 50%;
  left: 3px;
  transform: translateY(-50%);
  transition: left var(--transition-spring), box-shadow var(--transition-base);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  z-index: 1;
}

.switch.active::before {
  left: calc(100% - 26px - 3px);
}

/* === 系统设置 === */
.system-settings {
  padding: 8px 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* === 数据管理 === */
.data-card {
  background: linear-gradient(135deg, var(--color-success-bg), rgba(255, 255, 255, 0.9));
}

.data-stats {
  padding: 4px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.5);
  margin: 0 24px;
  border-radius: var(--radius-md);
  height: 40px;
}

.stat-chip {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-chip-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 22px;
}

.stat-chip-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 400;
}

.stat-chip-divider {
  width: 1px;
  height: 18px;
  background: var(--color-border);
}

.data-settings {
  padding: 8px 24px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.data-actions {
  padding: 8px 24px 12px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.data-actions .btn-secondary {
  width: 100%;
  height: 34px;
  font-size: 12px;
}

.btn-secondary {
  height: 36px;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 16px;
}

.btn-secondary:hover:not(:disabled) { background: var(--color-border-light); box-shadow: var(--shadow-sm); }
.btn-secondary:disabled { opacity: 0.45; cursor: not-allowed; }

.btn-secondary.danger {
  color: var(--color-danger);
  border-color: rgba(220, 38, 38, 0.3);
  background: rgba(254, 226, 226, 0.4);
}
.btn-secondary.danger:hover:not(:disabled) { background: rgba(254, 226, 226, 0.9); }

.check-btn {
  flex: none;
  height: 36px;
  padding: 0 16px;
  font-size: 13px;
  min-width: auto;
  width: auto;
}

.history-section {
  padding: 0 24px 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  margin-top: 4px;
  padding-top: 10px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 2px 6px;
  cursor: pointer;
  user-select: none;
}

.collapse-icon {
  font-size: 12px;
  color: var(--color-text-secondary);
  transition: transform var(--transition-fast);
}

.backup-list { padding: 0; }
.backup-title { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }

.backup-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.5);
  border-left: 3px solid var(--color-primary);
  border-radius: 4px;
  margin-bottom: 4px;
}

.backup-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.backup-name { font-size: 12px; color: var(--color-text-primary); font-family: var(--font-mono); }
.backup-time { font-size: 11px; color: var(--color-text-secondary); }

.backup-btns {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.btn-small {
  padding: 4px 10px;
  background: var(--color-success);
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.btn-small:hover { opacity: 0.88; }
.btn-small.danger { background: var(--color-danger); }
.btn-small.danger:hover { opacity: 0.88; }

.no-backups {
  padding: 24px;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 13px;
}

/* === 底部按钮 === */
.settings-actions {
  display: flex;
  padding: 0 24px;
  gap: 16px;
  margin-top: 4px;
  margin-bottom: 20px;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  height: 52px;
  border-radius: var(--radius-lg);
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-cancel {
  background: var(--color-border-light);
  color: var(--color-text-secondary);
}
.btn-cancel:hover { background: var(--color-border); }

.btn-confirm {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: #fff;
  box-shadow: 0 4px 14px var(--color-primary-glow);
}
.btn-confirm:hover {
  box-shadow: 0 6px 20px var(--color-primary-glow);
  transform: translateY(-1px);
}
.btn-confirm:active { transform: translateY(0); }

.btn-secondary.download-btn {
  flex: none;
  height: 36px;
  font-size: 13px;
  padding: 0 16px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: #fff;
  border: none;
  box-shadow: 0 2px 8px var(--color-primary-glow);
}

.btn-secondary.download-btn:hover:not(:disabled) {
  box-shadow: 0 4px 12px var(--color-primary-glow);
  transform: translateY(-1px);
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
}

/* === 响应式适配 === */
@media (max-width: 480px) {
  .settings-page {
    padding: 12px 0 24px;
    gap: 12px;
  }

  .settings-card {
    margin: 0 12px;
  }

  .card-header {
    padding: 14px 16px 12px;
  }

  .card-title {
    font-size: 15px;
    line-height: 20px;
  }

  .card-subtitle {
    font-size: 11px;
    line-height: 16px;
  }

  .time-group-title {
    font-size: 12px;
    line-height: 16px;
  }

  .time-settings,
  .auto-settings,
  .data-stats,
  .data-settings,
  .data-actions {
    padding-left: 16px;
    padding-right: 16px;
  }

  .setting-item {
    padding: 12px 12px;
    gap: 12px;
  }

  .switch {
    width: 44px;
    height: 28px;
    min-width: 44px;
  }

  .switch::before {
    width: 22px;
    height: 22px;
    top: 50%;
    left: 3px;
  }

  .switch.active::before {
    left: calc(100% - 22px - 3px);
  }

  .status-badge {
    height: 32px;
    padding: 0 10px;
    font-size: 11px;
  }

  .btn-secondary,
  .check-btn,
  .btn-secondary.download-btn {
    height: 32px;
    font-size: 12px;
    padding: 0 12px;
  }

  .data-actions {
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  .setting-item > .switch,
  .setting-item > .number-input,
  .setting-item > .btn-secondary,
  .setting-item > .status-badge {
    margin-top: -6px;
  }
}

@media (max-width: 360px) {
  .settings-card {
    margin: 0 8px;
  }

  .card-header {
    padding: 12px 12px 10px;
  }

  .time-settings,
  .auto-settings,
  .data-stats,
  .data-settings,
  .data-actions {
    padding-left: 12px;
    padding-right: 12px;
  }

  .setting-item {
    padding: 10px 8px;
    gap: 10px;
  }

  .switch {
    width: 40px;
    height: 24px;
    min-width: 40px;
  }

  .switch::before {
    width: 18px;
    height: 18px;
    top: 50%;
    left: 3px;
  }

  .switch.active::before {
    left: calc(100% - 18px - 3px);
  }

  .data-actions {
    grid-template-columns: 1fr 1fr;
  }

  .setting-item > .switch {
    margin-top: -2px;
  }

  .setting-item > .number-input,
  .setting-item > .btn-secondary,
  .setting-item > .status-badge {
    margin-top: -6px;
  }
}
</style>