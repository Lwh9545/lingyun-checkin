<template>
  <div class="month-view">
    <!-- 月份导航卡 -->
    <div class="month-header-card glass-card-strong fade-in-scale" style="animation-delay:0.05s">
      <div class="month-navigator">
        <button class="nav-btn" @click="navigateMonth(-1)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div class="month-display">
          <span class="year-label">{{ selectedYear }}年</span>
          <span class="month-big">{{ selectedMonthNum }}月</span>
        </div>
        <button class="nav-btn" @click="navigateMonth(1)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div class="header-actions">
        <button class="add-record-chip small" @click="$emit('add', null)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>添加</span>
        </button>
        <button class="export-chip" @click="exportMonthToExcel" :disabled="monthStats.total === 0">
          <span>{{ monthStats.total }} 条 · 导出</span>
        </button>
      </div>
    </div>

    <!-- 月度统计卡 -->
    <div class="month-stats-card glass-card-strong fade-in-scale" style="animation-delay:0.1s">
      <div class="stats-grid">
        <div class="grid-item normal">
          <span class="grid-num">{{ monthStats.normal || 0 }}</span>
          <span class="grid-label">正常</span>
        </div>
        <div class="grid-item late">
          <span class="grid-num">{{ monthStats.late || 0 }}</span>
          <span class="grid-label">迟到</span>
        </div>
        <div class="grid-item early">
          <span class="grid-num">{{ monthStats.early || 0 }}</span>
          <span class="grid-label">早退</span>
        </div>
        <div class="grid-item overtime">
          <span class="grid-num">{{ monthStats.overtime || 0 }}</span>
          <span class="grid-label">加班</span>
        </div>
      </div>

      <div class="ratio-bar" v-if="monthStats.total > 0">
        <div class="ratio-segment normal-seg" :style="{ flex: monthStats.normal || 0.1 }" :title="'正常 ' + monthStats.normal + ' 天'"></div>
        <div class="ratio-segment late-seg" :style="{ flex: monthStats.late || 0.1 }" :title="'迟到 ' + monthStats.late + ' 天'" v-if="monthStats.late > 0"></div>
        <div class="ratio-segment early-seg" :style="{ flex: monthStats.early || 0.1 }" :title="'早退 ' + monthStats.early + ' 天'" v-if="monthStats.early > 0"></div>
        <div class="ratio-segment ot-seg" :style="{ flex: monthStats.overtime || 0.1 }" :title="'加班 ' + monthStats.overtime + ' 天'" v-if="monthStats.overtime > 0"></div>
      </div>

      <div class="attendance-summary" v-if="monthStats.total > 0">
        <div class="summary-row">
          <span class="summary-label">应出勤</span>
          <span class="summary-value">{{ totalWorkDaysInMonth }} 天</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">实际出勤</span>
          <span class="summary-value highlight">{{ monthStats.total }} 天</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">出勤率</span>
          <span class="summary-value highlight" :class="{ warning: attendanceRate < 80 }">{{ attendanceRate }}%</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">准点率</span>
          <span class="summary-value highlight" :class="{ warning: monthDashboard.onTimeRate < 80 }">{{ monthDashboard.onTimeRate }}%</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">平均打卡</span>
          <span class="summary-value">{{ monthDashboard.avgCheckIn }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">日均工时</span>
          <span class="summary-value">{{ monthDashboard.avgDuration }}</span>
        </div>
      </div>

      <div class="attendance-empty" v-else>
        <span>本月暂无打卡记录</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAttendanceStore } from '../../stores/attendance'
import { buildExportRows, buildStatsRows, EXPORT_COL_WIDTHS } from '../../utils/exportUtils'

const emit = defineEmits(['add'])
const attendanceStore = useAttendanceStore()

const selectedMonthNum = ref(new Date().getMonth() + 1)
const selectedYear = ref(new Date().getFullYear())

const padZero = (n) => String(n).padStart(2, '0')

const monthStats = computed(() => {
  const targetMonth = `${selectedYear.value}-${padZero(selectedMonthNum.value)}`
  const monthRecords = attendanceStore.records.filter(r => r.date.startsWith(targetMonth))
  const result = { total: 0, normal: 0, late: 0, early: 0, overtime: 0 }
  monthRecords.forEach(r => {
    result.total++
    if (r.status === 'normal') result.normal++
    else if (r.status === 'late') result.late++
    else if (r.status === 'early') result.early++
    else if (r.status === 'overtime') result.overtime++
  })
  return result
})

const totalWorkDaysInMonth = computed(() => {
  const year = selectedYear.value
  const month = selectedMonthNum.value - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay()
    if (attendanceStore.workDays.includes(dow)) count++
  }
  return count
})

const attendanceRate = computed(() => {
  if (totalWorkDaysInMonth.value === 0) return 100
  return Math.min(Math.round((monthStats.value.total / totalWorkDaysInMonth.value) * 100), 100)
})

const monthDashboard = computed(() => {
  const targetMonth = `${selectedYear.value}-${padZero(selectedMonthNum.value)}`
  const monthRecords = attendanceStore.records.filter(r => r.date.startsWith(targetMonth))
  let checkInMinutes = 0, checkInCount = 0
  let durationMinutes = 0, durationCount = 0
  monthRecords.forEach(r => {
    if (r.checkIn) {
      const [h, m] = r.checkIn.split(':').map(Number)
      checkInMinutes += h * 60 + m
      checkInCount++
    }
    if (r.duration) {
      const match = r.duration.match(/(\d+)小时(\d+)分钟/)
      if (match) {
        durationMinutes += parseInt(match[1]) * 60 + parseInt(match[2])
        durationCount++
      }
    }
  })
  return {
    avgCheckIn: checkInCount > 0
      ? `${String(Math.floor(checkInMinutes / checkInCount)).padStart(2, '0')}:${String(Math.round((checkInMinutes / checkInCount) % 60)).padStart(2, '0')}`
      : '--',
    avgDuration: durationCount > 0
      ? `${Math.floor(durationMinutes / durationCount)}小时${Math.round((durationMinutes / durationCount) % 60)}分钟`
      : '--',
    onTimeRate: monthRecords.length > 0
      ? Math.round(((monthStats.value.normal + monthStats.value.overtime) / monthRecords.length) * 100)
      : 100
  }
})

function navigateMonth(dir) {
  let m = selectedMonthNum.value + dir
  let y = selectedYear.value
  if (m < 1) { m = 12; y-- } else if (m > 12) { m = 1; y++ }
  selectedMonthNum.value = m
  selectedYear.value = y
}

/** @type {{ value: number, name: string }[]} */
const WEEK_NAMES = [{value:0,name:'周日'},{value:1,name:'周一'},{value:2,name:'周二'},{value:3,name:'周三'},{value:4,name:'周四'},{value:5,name:'周五'},{value:6,name:'周六'}]

function getWeekday(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return WEEK_NAMES[new Date(y, m - 1, d).getDay()].name
}

async function exportMonthToExcel() {
  const targetMonth = `${selectedYear.value}-${padZero(selectedMonthNum.value)}`
  const records = attendanceStore.records.filter(r => r.date.startsWith(targetMonth))
  if (records.length === 0) return
  const XLSX = await import('xlsx')
  const data = buildExportRows(records, getWeekday)
  const worksheet = XLSX.utils.json_to_sheet(data)
  worksheet['!cols'] = EXPORT_COL_WIDTHS
  const statsSheet = XLSX.utils.json_to_sheet(buildStatsRows(records, getWeekday))
  statsSheet['!cols'] = [{ wch: 12 }, { wch: 24 }]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '打卡记录')
  XLSX.utils.book_append_sheet(workbook, statsSheet, '月度汇总')
  XLSX.writeFile(workbook, `考勤记录_${targetMonth}.xlsx`)
}
</script>

<style scoped>
.month-view { display: flex; flex-direction: column; gap: 12px; }

.glass-card-strong {
  background: var(--color-bg-card);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-card);
}

/* === 月份头部 === */
.month-header-card {
  display: flex; justify-content: space-between; align-items: center; gap: 10px;
  margin: 0 20px; padding: 14px 18px; flex-wrap: nowrap;
}

.month-navigator {
  display: flex; align-items: center; gap: 6px; flex-shrink: 0; min-width: 0;
}

.nav-btn {
  width: 28px; height: 28px; border-radius: 50%; border: none;
  background: rgba(255,255,255,0.85); color: var(--color-text-secondary);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; transition: all var(--transition-fast);
}
.nav-btn:hover:not(:disabled) { background: #fff; color: var(--color-primary); box-shadow: var(--shadow-sm); }
.nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.nav-btn svg { width: 14px; height: 14px; }

.month-display { display: flex; align-items: baseline; gap: 4px; flex-shrink: 0; white-space: nowrap; }
.year-label { font-size: 12px; color: var(--color-text-tertiary); }
.month-big { font-size: 16px; font-weight: 800; color: var(--color-text-primary); }

.header-actions { display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; }

.add-record-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; min-height: 28px; min-width: 64px;
  border-radius: 999px; border: none;
  background: var(--color-primary); color: #fff;
  font-size: 11px; font-weight: 600; white-space: nowrap; flex-shrink: 0;
  cursor: pointer; transition: all var(--transition-fast);
}
.add-record-chip:hover { background: var(--color-primary-dark); box-shadow: 0 4px 12px var(--color-primary-glow); transform: translateY(-1px); }
.add-record-chip svg { width: 14px; height: 14px; flex-shrink: 0; stroke: #fff; }

.export-chip {
  padding: 8px 16px; min-height: 32px; border-radius: 999px; border: none;
  background: var(--color-border-light); color: var(--color-text-secondary);
  font-size: 12px; font-weight: 500; white-space: nowrap; flex-shrink: 0;
  display: inline-flex; align-items: center; cursor: pointer;
  transition: all var(--transition-fast);
}
.export-chip:hover:not(:disabled) { background: var(--color-bg-card); color: var(--color-primary); box-shadow: var(--shadow-sm); }
.export-chip:disabled { opacity: 0.4; cursor: not-allowed; }

/* === 统计卡片 === */
.month-stats-card { margin: 0 20px; padding: 20px; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
.grid-item {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 14px 8px; border-radius: var(--radius-lg);
}
.grid-item.normal   { background: var(--color-success-bg); }
.grid-item.late     { background: var(--color-danger-bg); }
.grid-item.early    { background: var(--color-danger-bg); }
.grid-item.overtime { background: var(--color-purple-bg); }

.grid-num   { font-size: 28px; font-weight: 800; font-family: var(--font-mono); color: var(--color-text-primary); }
.grid-label { font-size: 12px; color: var(--color-text-secondary); font-weight: 500; }

.ratio-bar { display: flex; height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 16px; }
.ratio-segment { min-width: 2px; }
.normal-seg   { background: var(--color-success); }
.late-seg     { background: var(--color-danger); }
.early-seg    { background: #f59e0b; }
.ot-seg       { background: var(--color-purple); }

.attendance-summary { display: flex; flex-direction: column; gap: 10px; }
.summary-row { display: flex; justify-content: space-between; align-items: center; }
.summary-label { font-size: 13px; color: var(--color-text-secondary); }
.summary-value { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
.summary-value.highlight { color: var(--color-primary); }
.summary-value.warning { color: var(--color-danger); }

.attendance-empty { padding: 24px; text-align: center; font-size: 13px; color: var(--color-text-secondary); }
</style>
