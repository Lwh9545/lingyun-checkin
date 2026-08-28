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
    <!-- 面板标题（月份由 Finance 头部统一切换） -->
    <div class="panel-header fade-in-up">
      <h1 class="panel-title">工资核对器</h1>
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
        导出 {{ month }} 月对账单
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
import { useAttendanceStore } from '../../stores/attendance'
import { isRestDay, getHolidayInfo } from '../../utils/holidays'
import { classifyDay, calculateOvertimeDetail, formatPay, formatHours, KIND_LABEL, DEFAULT_RATES } from '../../utils/salaryUtils'
import { buildSalaryRows, buildSalarySummaryRows, SALARY_COL_WIDTHS, exportWorkbook } from '../../utils/exportUtils'
import { STORAGE_KEYS } from '../../utils/constants'
import { getStorage } from '../../utils/storageUtils'
import { createLogger } from '../../utils/logger'
import { useToast } from '../../composables/useToast'
import StatCard from '../../components/StatCard.vue'

const props = defineProps({
  year: { type: Number, required: true },
  month: { type: Number, required: true }
})

const log = createLogger('salary-panel')
const toast = useToast()
const router = useRouter()

const attendanceStore = useAttendanceStore()
const { records, loading } = attendanceStore

// 月份由 Finance 头部统一提供
const selectedYear = computed(() => props.year)
const selectedMonth = computed(() => props.month)
const monthStr = computed(() => `${selectedYear.value}-${String(selectedMonth.value).padStart(2, '0')}`)

const hourlyWage = ref(null)

// 真实日历分类器：法定节假日 > 休息日 > 工作日
const classifier = (date) => classifyDay(date, {
  isHoliday: getHolidayInfo(date).isHoliday,
  isRestDay: isRestDay(date)
})

const monthRecords = computed(() => records.filter(r => r.date.startsWith(monthStr.value)))
const detail = computed(() => calculateOvertimeDetail(monthRecords.value, { hourlyWage: hourlyWage.value }, classifier))

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
  }
})
</script>

<style scoped>
.salary-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.panel-header { display: flex; align-items: center; }
.panel-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
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

/* 空态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: var(--space-2xl) var(--space-lg);
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

/* 入场动画（与全局一致） */
.fade-in-up {
  animation: fadeInUp 0.35s ease both;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
