<template>
  <div class="dashboard-page">
    <!-- 标题 -->
    <div class="dash-header fade-in-up">
      <h1 class="dash-title">数据仪表盘</h1>
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

    <!-- 月份选择器弹窗 -->
    <div v-if="showMonthPicker" class="month-picker-overlay" @click.self="showMonthPicker = false">
      <div class="month-picker">
        <div class="picker-header">
          <button class="picker-btn" @click="decreaseYear">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span class="picker-year">{{ pickerYear }}年</span>
          <button class="picker-btn" @click="increaseYear">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
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

    <!-- 月度统计卡片 -->
    <div class="stats-grid">
      <StatCard label="本月出勤" :value="monthlyStats.total" unit="天" color="primary" />
      <StatCard label="正常打卡" :value="monthlyStats.normal" unit="天" color="success" />
      <StatCard label="迟到" :value="monthlyStats.late" unit="天" color="warning" :warn="monthlyStats.late > 0" />
      <StatCard label="早退" :value="monthlyStats.early" unit="天" color="danger" :warn="monthlyStats.early > 0" />
    </div>

    <!-- 月度详情 -->
    <div class="details-grid">
      <div class="rate-card">
        <div class="rate-header">
          <span class="rate-label">准点率</span>
          <span class="rate-value" :class="rateTextClass">{{ monthlyStats.onTimeRate }}%</span>
        </div>
        <div class="rate-bar">
          <div class="rate-fill" :style="{ width: monthlyStats.onTimeRate + '%', background: rateColor }"></div>
        </div>
        <div class="rate-stats">
          <span class="rate-stat"><span class="stat-num">{{ monthlyStats.normal }}</span> 正常</span>
          <span class="rate-stat"><span class="stat-num warning">{{ monthlyStats.late }}</span> 迟到</span>
          <span class="rate-stat"><span class="stat-num danger">{{ monthlyStats.early }}</span> 早退</span>
        </div>
      </div>
      <div class="workhours-card">
        <div class="workhours-item">
          <span class="workhours-value">{{ monthlyStats.avgDuration || '--' }}</span>
          <span class="workhours-label">日均工时</span>
        </div>
        <div class="workhours-divider"></div>
        <div class="workhours-item">
          <span class="workhours-value">{{ monthlyStats.totalDuration || '--' }}</span>
          <span class="workhours-label">累计工时</span>
        </div>
      </div>
    </div>

    <!-- 近7天打卡记录 -->
    <div class="chart-section">
      <div class="section-header">
        <h2 class="section-title">近 7 天打卡记录</h2>
        <div class="legend">
          <span class="legend-item"><span class="legend-dot checkin"></span>上班</span>
          <span class="legend-item"><span class="legend-dot checkout"></span>下班</span>
        </div>
      </div>
      <!-- 顶部 7 天导航 -->
      <div class="week-nav" v-if="recentWeekRecords.length > 0">
        <div
          v-for="(day, idx) in recentWeekRecords"
          :key="day.date"
          class="wn-item"
          :class="{
            'wn-active': selectedDayIndex === idx,
            'wn-weekend': day.isWeekend
          }"
          @click="selectedDayIndex = idx"
        >
          <div class="wn-circle">
            <span class="wn-dot" :class="{ on: !!day.checkIn }"></span>
            <span class="wn-dot wn-dot-out" :class="{ on: !!day.checkOut }"></span>
          </div>
          <span class="wn-num">{{ day.date.slice(-2) }}</span>
          <span class="wn-day">{{ day.dayName }}</span>
        </div>
      </div>

      <!-- 下方当天详情 -->
      <div class="day-detail" v-if="selectedDayRecord">
        <div class="dd-card">
          <!-- 上班 -->
          <div class="dd-item" :class="{ active: !!selectedDayRecord.checkIn }">
            <div class="dd-rail">
              <div class="dd-dot"></div>
              <div class="dd-line"></div>
            </div>
            <div class="dd-info">
              <div class="dd-info-top">
                <span class="dd-title">上班</span>
                <span class="dd-status">{{ selectedDayRecord.checkIn ? '正常打卡' : '待打卡' }}</span>
              </div>
            </div>
            <div class="dd-time-wrap">
              <span class="dd-time">{{ selectedDayRecord.checkIn || '--:--' }}</span>
              <span class="dd-sub">{{ selectedDayRecord.checkIn ? '正常打卡' : '待打卡' }}</span>
            </div>
          </div>
          <!-- 下班 -->
          <div class="dd-item dd-item-out" :class="{ active: !!selectedDayRecord.checkOut }">
            <div class="dd-rail">
              <div class="dd-dot"></div>
            </div>
            <div class="dd-info">
              <div class="dd-info-top">
                <span class="dd-title">下班</span>
                <span class="dd-status">{{ selectedDayRecord.checkOut ? '正常打卡' : '待打卡' }}</span>
              </div>
            </div>
            <div class="dd-time-wrap">
              <span class="dd-time">{{ selectedDayRecord.checkOut || '--:--' }}</span>
              <span class="dd-sub">{{ selectedDayRecord.checkOut ? '正常打卡' : '待打卡' }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="empty-state" v-else>
        <span>暂无打卡记录</span>
      </div>
    </div>

    <!-- 年度概览 -->
    <div class="year-section">
      <h2 class="section-title">年度概览（{{ currentYear }}）</h2>
      <div class="year-stats">
        <div class="year-stat">
          <div class="stat-icon primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <span class="year-value">{{ yearlyStats.total }}</span>
          <span class="year-label">累计打卡天数</span>
        </div>
        <div class="year-stat">
          <div class="stat-icon success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="16 10 10 16 8 14"/>
            </svg>
          </div>
          <span class="year-value">{{ yearlyStats.normal }}</span>
          <span class="year-label">正常出勤</span>
        </div>
        <div class="year-stat">
          <div class="stat-icon warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <span class="year-value">{{ yearlyStats.overtime }}</span>
          <span class="year-label">加班天数</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAttendanceStore } from '../stores/attendance'
import { storeToRefs } from 'pinia'
import StatCard from '../components/StatCard.vue'
import { computeStatsFromRecords } from '../utils/attendanceUtils'

const store = useAttendanceStore()
const { records, yearlyStats } = storeToRefs(store)

const now = new Date()
const currentYear = now.getFullYear()
const currentMonth = now.getMonth() + 1

// 月份选择状态
const selectedYear = ref(currentYear)
const selectedMonth = ref(currentMonth)
const showMonthPicker = ref(false)
const pickerYear = ref(currentYear)

// 根据选中的月份计算统计数据
const monthlyStats = computed(() => {
  const prefix = `${selectedYear.value}-${String(selectedMonth.value).padStart(2, '0')}`
  const monthRecords = records.value.filter(r => r.date.startsWith(prefix))
  return computeStatsFromRecords(monthRecords)
})

// 本周记录（周一到周日，顺序：一二三四五六日）
const recentWeekRecords = computed(() => {
  const today = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const [y, m, d] = today.split('-').map(Number)
  const todayDate = new Date(y, m - 1, d)
  // 周一=1, 周二=2... 周日=0 → 转成相对周一的偏移
  const weekday = todayDate.getDay()
  const offsetFromMonday = weekday === 0 ? 6 : weekday - 1
  const monday = new Date(todayDate)
  monday.setDate(todayDate.getDate() - offsetFromMonday)

  const days = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    const ds = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const record = records.value.find(r => r.date === ds)
    const isToday = ds === today
    days.push({
      date: ds,
      dayName: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()],
      isToday,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      checkIn: record?.checkIn || null,
      checkOut: record?.checkOut || null,
      status: record?.status || null,
      duration: record?.duration || null
    })
  }
  return days
})

// 选中日期的索引（默认今天）
const todayWeeklyIndex = computed(() => {
  const wd = now.getDay()
  return wd === 0 ? 6 : wd - 1
})
const selectedDayIndex = ref(todayWeeklyIndex.value)
const selectedDayRecord = computed(() => recentWeekRecords.value[selectedDayIndex.value] || null)

watch(recentWeekRecords, () => {
  if (!recentWeekRecords.value[selectedDayIndex.value]) {
    selectedDayIndex.value = todayWeeklyIndex.value
  }
})

const rateColor = computed(() => {
  const rate = monthlyStats.value.onTimeRate
  if (rate >= 90) return 'var(--color-success)'
  if (rate >= 70) return 'var(--color-warning)'
  return 'var(--color-danger)'
})

const rateTextClass = computed(() => {
  const rate = monthlyStats.value.onTimeRate
  if (rate >= 90) return 'success'
  if (rate >= 70) return 'warning'
  return 'danger'
})

// 月份选择方法
function selectMonth(month) {
  selectedMonth.value = month
  selectedYear.value = pickerYear.value
  showMonthPicker.value = false
}

function increaseYear() {
  if (pickerYear.value < currentYear) {
    pickerYear.value++
  }
}

function decreaseYear() {
  if (pickerYear.value > 2020) {
    pickerYear.value--
  }
}
</script>

<style scoped>
.dashboard-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.dash-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  letter-spacing: -0.3px;
}

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
}

.month-picker-btn:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-border-light);
}

.picker-icon {
  width: 16px;
  height: 16px;
  color: var(--color-text-tertiary);
}

.picker-arrow {
  width: 14px;
  height: 14px;
  color: var(--color-text-tertiary);
  transition: transform 0.2s ease;
}

.month-picker-btn:hover .picker-arrow {
  transform: rotate(180deg);
}

/* 月份选择器弹窗 */
.month-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.month-picker {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 20px;
  min-width: 280px;
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.picker-btn {
  width: 32px;
  height: 32px;
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

.picker-btn:hover {
  background: var(--color-border-light);
}

.picker-btn svg {
  width: 16px;
  height: 16px;
}

.picker-year {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

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

.month-item:hover {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.month-item.active {
  background: var(--color-primary);
  color: white;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.details-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 12px;
}

@media (max-width: 640px) {
  .details-grid {
    grid-template-columns: 1fr;
  }
}

/* 准点率卡片 */
.rate-card {
  padding: 18px;
  background: linear-gradient(135deg, var(--color-primary-bg) 0%, var(--color-bg-card) 100%);
  border: 1px solid var(--color-primary-light);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rate-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rate-label {
  font-size: 13px;
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.rate-value {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -1px;
}

.rate-value.success { 
  color: var(--color-success); 
  text-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
}
.rate-value.warning { 
  color: var(--color-warning); 
  text-shadow: 0 2px 8px rgba(245, 158, 11, 0.2);
}
.rate-value.danger { 
  color: var(--color-danger); 
  text-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
}

.rate-bar {
  height: 8px;
  background: var(--color-border-light);
  border-radius: 4px;
  overflow: hidden;
}

.rate-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.6s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.rate-stats {
  display: flex;
  justify-content: space-between;
  padding-top: 4px;
}

.rate-stat {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.stat-num {
  font-weight: 600;
  color: var(--color-text-primary);
  margin-right: 4px;
}

.stat-num.warning { color: var(--color-warning); }
.stat-num.danger { color: var(--color-danger); }

/* 详情卡片 */
.detail-card {
  padding: 16px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
  text-align: center;
}

.detail-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-text-tertiary);
}

.detail-label {
  font-size: 12px;
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.detail-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
  letter-spacing: -0.5px;
}

/* 工时统计卡片 */
.workhours-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  transition: all 0.2s ease;
}

.workhours-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-text-tertiary);
}

.workhours-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.workhours-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
  letter-spacing: -0.5px;
}

.workhours-label {
  font-size: 12px;
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.workhours-divider {
  width: 1px;
  height: 36px;
  background: var(--color-border);
}

.chart-section,
.year-section {
  padding: 20px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.legend {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-dot.checkin { background: var(--color-primary); }
.legend-dot.checkout { background: var(--color-purple); }

/* 顶部日期导航 - 胶囊形状 */
.week-nav {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-top: 12px;
  margin-bottom: 16px;
}

@media (max-width: 640px) {
  .week-nav {
    grid-template-columns: repeat(4, 1fr);
  }
}

.wn-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  background: var(--color-bg-secondary);
  border-radius: 18px;
  border: 2px solid var(--color-transparent);
  cursor: pointer;
  transition: all 0.25s ease;
}

.wn-item:hover {
  transform: translateY(-1px);
  border-color: var(--color-border);
}

.wn-item.wn-active {
  background: linear-gradient(180deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%);
  border-color: var(--color-primary);
  box-shadow: 0 3px 12px rgba(99, 102, 241, 0.12);
}

.wn-item.wn-weekend:not(.wn-active) {
  background: linear-gradient(180deg, #FFFBEB 0%, var(--color-bg-secondary) 100%);
}

.wn-circle {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: white;
  border: 1.5px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.wn-item.wn-active .wn-circle {
  background: linear-gradient(135deg, #E0E7FF 0%, #DDD6FE 100%);
  border-color: transparent;
  box-shadow: 0 1px 4px rgba(99, 102, 241, 0.12);
}

.wn-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #D1D5DB;
  transition: all 0.2s;
}

.wn-item.wn-active .wn-dot {
  background: var(--color-primary);
}

.wn-dot.on {
  background: var(--color-primary);
}

.wn-dot.wn-dot-out.on {
  background: var(--color-purple);
}

.wn-num {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.wn-item.wn-active .wn-num {
  color: var(--color-primary);
}

.wn-item.wn-weekend:not(.wn-active) .wn-num {
  color: var(--color-warning);
}

.wn-day {
  font-size: 11px;
  color: var(--color-text-tertiary);
  font-weight: 500;
}

/* 下方详情卡片 */
.day-detail {
  display: block;
}

.dd-card {
  background: var(--color-bg-card);
  border-radius: 16px;
  padding: 14px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  border: 1px solid var(--color-border);
  position: relative;
}

.dd-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0 14px;
  position: relative;
  min-height: 44px;
}

.dd-item + .dd-item {
  padding: 14px 0 4px;
}

.dd-item + .dd-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 30px;
  right: 0;
  height: 1px;
  background: var(--color-border);
}

.dd-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 18px;
  flex-shrink: 0;
  padding: 0;
}

.dd-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-primary);
  border: 3px solid var(--color-bg-card);
  box-shadow: 0 0 0 1.5px var(--color-primary);
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.dd-item:not(.active) .dd-dot {
  background: var(--color-border);
  box-shadow: 0 0 0 1.5px var(--color-border);
}

.dd-line {
  flex: 1;
  width: 3px;
  background: var(--color-primary);
  border-radius: 2px;
  margin: 2px 0;
  min-height: 16px;
}

.dd-item:not(.active) + .dd-item .dd-line,
.dd-item:not(.active):last-child .dd-line {
  background: var(--color-border);
}

.dd-item:not(.active) .dd-line {
  background: var(--color-border);
}

.dd-info {
  flex: 1;
  padding: 0;
  min-width: 0;
  position: relative;
}

.dd-info-top {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
}

.dd-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: 0.2px;
  line-height: 1.1;
}

.dd-status {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-purple);
  letter-spacing: 0.2px;
}

.dd-item:not(.active) .dd-status {
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.dd-time-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  min-width: 90px;
  padding: 0;
  position: relative;
}

.dd-time {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.8px;
  line-height: 1;
}

.dd-item:not(.active) .dd-time {
  color: var(--color-text-placeholder);
  font-weight: 600;
  letter-spacing: 0.3px;
}

.dd-sub {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-purple);
  letter-spacing: 0.2px;
}

.dd-item:not(.active) .dd-sub {
  color: var(--color-text-tertiary);
  font-weight: 500;
}

/* 空状态 */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  color: var(--color-text-placeholder);
  font-size: 12px;
}

.year-stats {
  display: flex;
  gap: 0;
  margin-top: 8px;
  background: var(--color-bg-secondary);
  border-radius: 10px;
  overflow: hidden;
}

.year-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 8px;
  flex: 1;
  position: relative;
  transition: background 0.15s;
}

.year-stat + .year-stat::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 1px;
  background: var(--color-border);
}

.year-stat:hover {
  background: rgba(99, 102, 241, 0.04);
}

.stat-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon svg {
  width: 14px;
  height: 14px;
  color: white;
}

.stat-icon.primary { background: var(--color-primary); }
.stat-icon.success { background: var(--color-success); }
.stat-icon.warning { background: var(--color-warning); }

.year-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.3px;
  line-height: 22px;
  white-space: nowrap;
}

.year-label {
  font-size: 11px;
  color: var(--color-text-tertiary);
  line-height: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
</style>
