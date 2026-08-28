<template>
  <div class="salary-page">
    <!-- 骨架屏 -->
    <div v-if="loading" class="skeleton-grid" aria-busy="true" aria-label="加载中">
      <div class="skeleton skeleton-line short"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-line mid"></div>
      <div class="skeleton skeleton-line"></div>
      <div class="skeleton skeleton-line short"></div>
    </div>

    <template v-else>
    <!-- 标题 + 月份切换（与 Dashboard 同款日历选择器） -->
    <div class="dash-header fade-in-up">
      <h1 class="dash-title">工资核对器</h1>
      <button class="month-picker-btn" @click="showMonthPicker = !showMonthPicker">
        <svg class="picker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>{{ selectedYear }}年{{ selectedMonth }}月</span>
        <svg class="picker-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
    </div>

    <!-- 月份选择器弹窗（与 Dashboard 同款） -->
    <div v-if="showMonthPicker" class="month-picker-overlay" @click.self="showMonthPicker = false">
      <div class="month-picker">
        <div class="picker-header">
          <button class="picker-btn" @click="decreaseYear">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="picker-year">{{ pickerYear }}年</span>
          <button class="picker-btn" @click="increaseYear">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <div class="picker-months">
          <button
            v-for="month in 12"
            :key="month"
            class="month-item"
            :class="{ active: pickerYear === selectedYear && month === selectedMonth }"
            @click="selectMonth(month)"
          >
            {{ month }}月
          </button>
        </div>
      </div>
    </div>

    <!-- 未设时薪提示：跳转 Settings 设置 -->
    <div v-if="hourlyWage == null" class="wage-hint-bar fade-in-up">
      <span class="wage-hint-text">未设置时薪，加班费核算不生效</span>
      <button class="link-btn" @click="router.push('/settings')">去设置</button>
    </div>

    <!-- 三分类统计 + 加班费合计 -->
    <div class="stats-grid">
      <StatCard label="工作日加班" :value="formatHours(detail.workdayMinutes)" color="primary" />
      <StatCard label="休息日加班" :value="formatHours(detail.restdayMinutes)" color="success" />
      <StatCard label="节假日加班" :value="formatHours(detail.holidayMinutes)" color="warning" />
      <StatCard label="本月加班费" :value="formatPay(detail.totalPay)" color="danger" />
    </div>

    <!-- 导出操作 -->
    <div class="export-row">
      <button
        class="btn-export-primary"
        :disabled="!detail.items.length"
        @click="exportSalarySheet"
      >
        导出 {{ selectedMonth }} 月对账单
      </button>
    </div>

    <!-- 逐日对账明细 -->
    <div class="detail-card fade-in-up">
      <div class="detail-header">
        <span class="detail-title">对账明细</span>
        <span class="detail-count">{{ detail.items.length }} 天</span>
      </div>
      <table v-if="detail.items.length" class="detail-table">
        <thead>
          <tr>
            <th>日期</th>
            <th>类型</th>
            <th class="num">计薪时长</th>
            <th class="num">倍率</th>
            <th class="num">小计</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="it in detail.items" :key="it.date">
            <td>{{ it.date.slice(5).replace('-', '/') }}</td>
            <td><span class="kind-tag" :class="`kind-${it.kind}`">{{ KIND_LABEL[it.kind] }}</span></td>
            <td class="num">{{ formatHours(it.minutes) }}</td>
            <td class="num">{{ DEFAULT_RATES[it.kind] }}x</td>
            <td class="num pay-cell">{{ formatPay(it.pay) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state">
        <span>本月暂无计薪加班记录</span>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAttendanceStore } from '../stores/attendance'
import { isRestDay, getHolidayInfo } from '../utils/holidays'
import { classifyDay, calculateOvertimeDetail, formatPay, formatHours, KIND_LABEL, DEFAULT_RATES } from '../utils/salaryUtils'
import { buildSalaryRows, buildSalarySummaryRows, SALARY_COL_WIDTHS, exportWorkbook } from '../utils/exportUtils'
import { STORAGE_KEYS } from '../utils/constants'
import { getStorage, setStorage } from '../utils/storageUtils'
import { getTodayString } from '../utils/dateUtils'
import { createLogger } from '../utils/logger'
import { useToast } from '../composables/useToast'
import { useEscapeClose } from '../composables/useEscapeClose'
import StatCard from '../components/StatCard.vue'

const log = createLogger('salary-view')
const toast = useToast()
const router = useRouter()

const attendanceStore = useAttendanceStore()
const { records, loading } = attendanceStore

const now = new Date()
const currentYear = now.getFullYear()

const today = getTodayString()
const selectedYear = ref(Number(today.slice(0, 4)))
const selectedMonth = ref(Number(today.slice(5, 7)))
const showMonthPicker = ref(false)
useEscapeClose(showMonthPicker, () => { showMonthPicker.value = false })
const pickerYear = ref(Number(today.slice(0, 4)))

const hourlyWage = ref(null)
const wageInput = ref('')

// 真实日历分类器：法定节假日 > 休息日 > 工作日
const classifier = (date) => classifyDay(date, {
  isHoliday: getHolidayInfo(date).isHoliday,
  isRestDay: isRestDay(date)
})

const monthStr = computed(() => `${selectedYear.value}-${String(selectedMonth.value).padStart(2, '0')}`)
const monthRecords = computed(() => records.filter(r => r.date.startsWith(monthStr.value)))
const detail = computed(() => calculateOvertimeDetail(monthRecords.value, { hourlyWage: hourlyWage.value }, classifier))

// ── 月份选择器（与 Dashboard 同步语义，年限制 2020~当前年） ──
function selectMonth(month) {
  selectedMonth.value = month
  selectedYear.value = pickerYear.value
  showMonthPicker.value = false
}
function increaseYear() {
  if (pickerYear.value < currentYear) pickerYear.value++
}
function decreaseYear() {
  if (pickerYear.value > currentYear - 1) pickerYear.value--
}

/**
 * 保存时薪配置
 * toast 反馈：非法清空提示；正值保存成功提示
 */
function saveWage() {
  const raw = wageInput.value?.toString().trim() ?? ''
  if (raw === '') {
    hourlyWage.value = null
    wageInput.value = ''
    setStorage(STORAGE_KEYS.SALARY_HOURLY_WAGE, null)
    toast.info('时薪已清空')
    return
  }
  const n = Number(raw)
  if (!(Number.isFinite(n) && n > 0)) {
    wageInput.value = ''
    toast.warning('请输入有效的时薪（正数）')
    return
  }
  hourlyWage.value = n
  setStorage(STORAGE_KEYS.SALARY_HOURLY_WAGE, n)
  toast.success(`时薪已设置为 ¥${n}/小时`)
}

/** 导出 Excel 对账单（明细 + 汇总双 sheet，与考勤记录导出同模板） */
async function exportSalarySheet() {
  if (!detail.value.items.length) return
  const filename = `工资对账单_${monthStr.value}.xlsx`
  try {
    await exportWorkbook([
      { name: '对账明细', rows: buildSalaryRows(detail.value), colWidths: SALARY_COL_WIDTHS },
      { name: '汇总', rows: buildSalarySummaryRows(detail.value, hourlyWage.value), colWidths: [{ wch: 12 }, { wch: 24 }] }
    ], filename)
    toast.success(`对账单已导出：${filename}`)
  } catch (e) {
    log.error('[salary] 导出对账单失败:', e)
    toast.error('导出对账单失败：' + (e?.message || '未知错误'))
  }
}

onMounted(async () => {
  const saved = await getStorage(STORAGE_KEYS.SALARY_HOURLY_WAGE, null)
  if (typeof saved === 'number' && saved > 0) {
    hourlyWage.value = saved
    wageInput.value = String(saved)
  }
})
</script>

<style scoped>
.salary-page {
  padding: var(--space-lg);
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dash-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

/* ── 月份选择器（与 Dashboard 同款，保持一致视觉锚点） ── */
.month-picker-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 600;
}
.month-picker-btn:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-border-light);
}
.picker-icon { width: 16px; height: 16px; color: var(--color-text-tertiary); }
.picker-arrow { width: 14px; height: 14px; color: var(--color-text-tertiary); transition: transform 0.2s ease; }
.month-picker-btn:hover .picker-arrow { transform: rotate(180deg); }

.month-picker-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: var(--color-bg-mask);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.month-picker {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 20px;
  min-width: 280px;
  animation: slideUp 0.2s ease;
}
@keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}
.picker-btn {
  min-width: var(--touch-min);
  min-height: var(--touch-min);
  width: var(--touch-min);
  height: var(--touch-min);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
}
.picker-btn:hover { background: var(--color-border-light); }
.picker-btn svg { width: 16px; height: 16px; }
.picker-year { font-size: 16px; font-weight: 600; color: var(--color-text-primary); }

.picker-months {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.month-item {
  padding: 10px;
  border: none;
  background: var(--color-bg-secondary);
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}
.month-item:hover { background: var(--color-primary-bg); color: var(--color-primary); }
.month-item.active { background: var(--color-primary); color: var(--color-white); }

/* 时薪配置行 */
.wage-bar {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-md) var(--space-lg);
  box-shadow: var(--shadow-card);
}
.wage-label { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
.wage-input-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  background: var(--color-bg-secondary);
  transition: border-color 0.15s;
}
.wage-input-wrap:focus-within { border-color: var(--color-primary); }
.wage-symbol { font-size: 14px; font-weight: 600; color: var(--color-text-secondary); }
.wage-input {
  width: 72px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--color-text-primary);
}
.wage-input::-webkit-outer-spin-button,
.wage-input::-webkit-inner-spin-button { -webkit-appearance: none; }
.wage-unit { font-size: 12px; color: var(--color-text-tertiary); }
.wage-hint { font-size: 12px; color: var(--color-text-tertiary); margin-left: auto; }

/* 应得加班费 */
.pay-hero {
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
  background: linear-gradient(135deg, var(--color-primary), var(--color-purple));
  border-radius: var(--radius-lg);
  padding: var(--space-lg) var(--space-xl);
  color: var(--color-white);
  box-shadow: var(--shadow-glow);
}
.pay-hero-label { font-size: 14px; opacity: 0.9; }
.pay-hero-value { font-size: 34px; font-weight: 700; font-variant-numeric: tabular-nums; }
.pay-hero-hint { font-size: 12px; opacity: 0.75; margin-left: auto; }

/* 三分类统计 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
}

/* 对账明细 */
.detail-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-card);
}
.detail-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-md); }
.detail-actions { display: flex; align-items: center; gap: var(--space-sm); }
.export-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  padding: 5px 12px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.export-btn:hover:not(:disabled) { background: var(--color-primary); color: var(--color-white); }
.export-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.export-btn svg { width: 13px; height: 13px; }

.detail-title { font-size: 15px; font-weight: 600; color: var(--color-text-primary); }
.detail-count { font-size: 12px; color: var(--color-text-tertiary); }

.detail-table { width: 100%; border-collapse: collapse; }
.detail-table th {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-tertiary);
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-divider);
}
.detail-table td {
  font-size: 13px;
  color: var(--color-text-primary);
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-divider);
}
.detail-table tbody tr:last-child td { border-bottom: none; }
.detail-table .num { text-align: right; font-variant-numeric: tabular-nums; }
.pay-cell { font-weight: 600; }

.kind-tag { display: inline-block; font-size: 12px; padding: 2px 8px; border-radius: var(--radius-full); }
.kind-workday { background: var(--color-primary-bg); color: var(--color-primary); }
.kind-restday { background: var(--color-info-bg); color: var(--color-info); }
.kind-holiday { background: var(--color-warning-bg); color: var(--color-warning); }

/* 美化空态：图标 + 标题 + 副说明三段 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: var(--space-2xl) var(--space-lg);
}
.empty-icon {
  width: 48px;
  height: 48px;
  color: var(--color-text-placeholder);
  margin-bottom: 8px;
}
.empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
}
.empty-sub {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

/* 导出按钮操作行 */
.export-row {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 0 8px;
}
.btn-export-primary {
  height: 42px;
  padding: 0 24px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: var(--color-white);
  font-size: 14px;
  font-weight: 600;
  border-radius: var(--radius-lg);
  box-shadow: var(--color-primary-glow);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.btn-export-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px var(--color-primary-glow);
}
.btn-export-primary:active:not(:disabled) {
  transform: translateY(0);
}
.btn-export-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

/* 时薪未设置跳转提示条 */
.wage-hint-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
}
.wage-hint-text {
  font-size: 13px;
  color: var(--color-text-secondary);
}
.link-btn {
  padding: 4px 12px;
  background: transparent;
  color: var(--color-primary);
  font-weight: 600;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
}
.link-btn:hover {
  background: var(--color-primary);
  color: var(--color-white);
}

/* 入场动画（与全局一致） */
.fade-in-up {
  animation: fadeInUp 0.35s ease both;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
