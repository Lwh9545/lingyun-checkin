<template>
  <div class="day-view">
    <!-- 日期导航器 -->
    <div class="day-header-card glass-card-strong fade-in-scale" style="animation-delay:0.05s">
      <div class="date-navigator">
        <button class="nav-btn" @click="navigateSelectedDay(-1)" :disabled="!hasPrevDay">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div class="current-date-display">
          <span class="date-main">{{ displaySelectedDate }}</span>
          <span class="date-today-btn" @click="jumpToToday">今天</span>
        </div>
        <button class="nav-btn" @click="navigateSelectedDay(1)" :disabled="!hasNextDay">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <button class="add-record-chip" @click="$emit('add', selectedDate)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span>添加考勤</span>
      </button>
    </div>

    <!-- 日历卡 -->
    <div class="calendar-card glass-card-strong fade-in-scale" style="animation-delay:0.1s"
         :class="{ expanded: isCalendarExpanded }">
      <div class="calendar-top-bar">
        <span class="calendar-title" @click="toggleCalendarExpand">
          <span v-if="!isCalendarExpanded">日视图</span>
          <span v-else>收起月历</span>
        </span>
        <button class="expand-toggle" @click="toggleCalendarExpand" :title="isCalendarExpanded ? '收起' : '展开月历'">
          <svg v-if="!isCalendarExpanded" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="20"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>

      <!-- 周视图 -->
      <template v-if="!isCalendarExpanded">
        <div class="week-header">
          <span v-for="day in weekLabels" :key="day.label" class="week-label" :class="{ weekend: day.weekend }">{{ day.label }}</span>
        </div>
        <div class="week-days">
          <div
            v-for="day in weekDays" :key="day.date"
            class="day-cell"
            :class="{ selected: day.isSelected, today: day.isToday, weekend: day.isWeekend, 'has-record': day.hasRecord, holiday: day.isHoliday, makeup: day.isMakeUp }"
            @click="selectDay(day.date)"
          >
            <div class="day-ring">
              <span class="day-num">{{ day.day }}</span>
            </div>
            <span class="day-tag" v-if="day.holidayName">{{ day.holidayName }}</span>
            <span class="day-tag makeup" v-else-if="day.isMakeUp">补班</span>
            <div class="day-dots" v-if="day.hasCheckIn || day.hasCheckOut">
              <span class="record-dot in" v-if="day.hasCheckIn"></span>
              <span class="record-dot out" v-if="day.hasCheckOut"></span>
            </div>
          </div>
        </div>
      </template>

      <!-- 月视图 -->
      <template v-else>
        <div class="month-nav">
          <button class="mini-nav-btn" @click="navMonthCalendar(-1)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="month-nav-title">{{ monthCalendarTitle }}</span>
          <button class="mini-nav-btn" @click="navMonthCalendar(1)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button class="mini-nav-btn today-btn" @click="jumpMonthCalendarToToday" title="回到今天">
            <span>今天</span>
          </button>
        </div>

        <div class="month-header">
          <span v-for="day in weekLabels" :key="day.label" class="month-week-label" :class="{ weekend: day.weekend }">{{ day.label }}</span>
        </div>
        <div class="month-grid">
          <div
            v-for="(day, idx) in monthDays" :key="idx"
            class="month-cell"
            :class="{
              'other-month': !day.inMonth, selected: day.isSelected, today: day.isToday,
              weekend: day.isWeekend, 'has-record': day.hasRecord, holiday: day.isHoliday, makeup: day.isMakeUp
            }"
            @click="selectDay(day.date)"
          >
            <span class="month-day-num">{{ day.day }}</span>
            <span class="month-tag" v-if="day.holidayName">{{ day.holidayName }}</span>
            <span class="month-tag makeup" v-else-if="day.isMakeUp">补</span>
            <div class="month-dots" v-if="day.hasCheckIn || day.hasCheckOut">
              <span class="record-dot in" v-if="day.hasCheckIn"></span>
              <span class="record-dot out" v-if="day.hasCheckOut"></span>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 日详情卡片 -->
    <div class="day-detail-card glass-card-strong fade-in-scale" style="animation-delay:0.15s" v-if="selectedDayRecord">
      <div class="detail-status-bar">
        <div class="status-badge" :class="selectedDayRecord.status">
          <span>{{ getStatusText(selectedDayRecord.status) }}</span>
        </div>
        <span class="detail-date">{{ selectedDayRecord.date }}</span>
      </div>

      <div class="timeline">
        <div class="timeline-row">
          <div class="timeline-marker checkin">
            <div class="marker-ring"></div>
            <div class="marker-line"></div>
          </div>
          <div class="timeline-content">
            <span class="tl-label">上班打卡</span>
            <span class="tl-value" :class="{ muted: !selectedDayRecord.checkIn }">{{ selectedDayRecord.checkIn || '未打卡' }}</span>
          </div>
        </div>

        <div class="timeline-row break" v-if="attendanceStore.enableRest">
          <div class="timeline-marker rest">
            <div class="marker-ring small"></div>
            <div class="marker-line dashed"></div>
          </div>
          <div class="timeline-content">
            <span class="tl-label">午休</span>
            <span class="tl-value sub">{{ restPeriodText }}</span>
          </div>
        </div>

        <div class="timeline-row">
          <div class="timeline-marker checkout">
            <div class="marker-ring"></div>
          </div>
          <div class="timeline-content">
            <span class="tl-label">下班打卡</span>
            <span class="tl-value" :class="{ muted: !selectedDayRecord.checkOut }">{{ selectedDayRecord.checkOut || '未打卡' }}</span>
          </div>
        </div>
      </div>

      <div class="duration-bar">
        <div class="duration-item">
          <span class="duration-label">工作时长</span>
          <span class="duration-value">{{ selectedDayRecord.duration || '--' }}</span>
        </div>
        <div class="action-buttons">
          <button class="edit-record-btn" @click="$emit('edit', selectedDayRecord)">编辑</button>
          <button class="delete-record-btn" @click="$emit('delete', selectedDayRecord.date)">删除</button>
        </div>
      </div>
    </div>

    <div class="empty-card fade-in-scale" v-else-if="selectedDate && !selectedDayRecord">
      <span class="empty-icon">📭</span>
      <span class="empty-text">{{ selectedDate }} 暂无打卡记录</span>
      <button class="add-record-btn-inline" @click="$emit('add', selectedDate)">+ 添加当天考勤</button>
    </div>
    <div class="empty-card fade-in-scale" v-else-if="!selectedDate">
      <span class="empty-icon">👆</span>
      <span class="empty-text">点击上方日期查看详情</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAttendanceStore } from '../../stores/attendance'
import { getStatusText } from '../../utils/attendanceUtils'
import { formatDate, getTodayString } from '../../utils/dateUtils'
import { WEEK_DAYS } from '../../utils/constants'
import { getHolidayInfo } from '../../utils/holidays'

const emit = defineEmits(['add', 'edit', 'delete'])
const attendanceStore = useAttendanceStore()

const selectedDate = ref(getTodayString())
const isCalendarExpanded = ref(false)
const monthCalendarYear = ref(new Date().getFullYear())
const monthCalendarMonth = ref(new Date().getMonth() + 1)

const MONDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // 一二三四五六日
const weekLabels = MONDAY_ORDER.map(v => {
  const w = WEEK_DAYS.find(x => x.value === v)
  return { label: w.short, weekend: v === 0 || v === 6 }
})
const padZero = (n) => String(n).padStart(2, '0')
const parseDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }

const displaySelectedDate = computed(() => {
  if (!selectedDate.value) return '请选择日期'
  const d = parseDate(selectedDate.value)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})

function buildDayInfo(day, dateStr, inMonth) {
  const today = getTodayString()
  const record = attendanceStore.records.find(r => r.date === dateStr)
  const dow = day.getDay()
  const isWeekend = dow === 0 || dow === 6
  const hInfo = getHolidayInfo(dateStr)
  return {
    date: dateStr, day: day.getDate(), inMonth: inMonth !== false,
    isSelected: dateStr === selectedDate.value, isToday: dateStr === today, isWeekend,
    hasRecord: !!record, hasCheckIn: !!(record?.checkIn), hasCheckOut: !!(record?.checkOut),
    holidayName: hInfo.name, isHoliday: hInfo.isHoliday, isMakeUp: hInfo.isMakeUp
  }
}

const weekDays = computed(() => {
  const result = []
  const anchor = selectedDate.value ? parseDate(selectedDate.value) : new Date()
  const dayOfWeek = anchor.getDay()
  const monday = new Date(anchor)
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  monday.setDate(anchor.getDate() + diff)
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    result.push(buildDayInfo(day, formatDate(day), true))
  }
  return result
})

const monthDays = computed(() => {
  const result = []
  const y = monthCalendarYear.value
  const m = monthCalendarMonth.value
  const firstDay = new Date(y, m - 1, 1)
  const firstDow = firstDay.getDay()
  const daysInMonth = new Date(y, m, 0).getDate()
  const startOffset = firstDow === 0 ? 6 : firstDow - 1
  for (let i = 0; i < startOffset; i++) {
    const d = new Date(y, m - 1, -startOffset + i + 1)
    result.push(buildDayInfo(d, formatDate(d), false))
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m - 1, d)
    result.push(buildDayInfo(date, formatDate(date), true))
  }
  const remaining = 42 - result.length
  for (let i = 1; i <= remaining; i++) {
    const date = new Date(y, m, i)
    result.push(buildDayInfo(date, formatDate(date), false))
  }
  return result
})

const monthCalendarTitle = computed(() => `${monthCalendarYear.value}年${monthCalendarMonth.value}月`)

const hasPrevDay = computed(() => {
  if (!selectedDate.value) return true
  const firstRecord = attendanceStore.records[0]
  if (!firstRecord) return true
  return parseDate(selectedDate.value) > parseDate(firstRecord.date)
})

const hasNextDay = computed(() => selectedDate.value ? selectedDate.value < getTodayString() : true)

const selectedDayRecord = computed(() => {
  if (!selectedDate.value) return null
  return attendanceStore.records.find(r => r.date === selectedDate.value)
})

const restPeriodText = computed(() => {
  const s = attendanceStore
  if (s.enableRest && s.restStart && s.restEnd) return `${s.restStart} - ${s.restEnd}`
  return '未设置'
})

function selectDay(date) { selectedDate.value = date }
function jumpToToday() { selectedDate.value = getTodayString() }
function navigateSelectedDay(delta) {
  const base = selectedDate.value ? parseDate(selectedDate.value) : new Date()
  base.setDate(base.getDate() + delta)
  selectedDate.value = formatDate(base)
}

function toggleCalendarExpand() {
  isCalendarExpanded.value = !isCalendarExpanded.value
  if (isCalendarExpanded.value && selectedDate.value) {
    const d = new Date(selectedDate.value.slice(0, 4), Number(selectedDate.value.slice(5, 7)) - 1, Number(selectedDate.value.slice(8, 10)))
    monthCalendarYear.value = d.getFullYear()
    monthCalendarMonth.value = d.getMonth() + 1
  }
}

function navMonthCalendar(dir) {
  let m = monthCalendarMonth.value + dir
  let y = monthCalendarYear.value
  if (m < 1) { m = 12; y-- } else if (m > 12) { m = 1; y++ }
  monthCalendarMonth.value = m
  monthCalendarYear.value = y
}

function jumpMonthCalendarToToday() {
  const now = new Date()
  monthCalendarYear.value = now.getFullYear()
  monthCalendarMonth.value = now.getMonth() + 1
  selectedDate.value = getTodayString()
}
</script>

<style scoped>
.day-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* === 玻璃卡片基础 === */
.glass-card-strong {
  background: var(--color-bg-card);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-card);
}

/* === 日统计头部 === */
.day-header-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin: 0 20px;
  padding: 14px 18px;
  flex-wrap: nowrap;
}

.date-navigator {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  min-width: 0;
}

.nav-btn {
  width: 28px; height: 28px;
  border-radius: 50%; border: none;
  background: rgba(255,255,255,0.85);
  color: var(--color-text-secondary);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
  transition: all var(--transition-fast);
}
.nav-btn:hover:not(:disabled) { background: #fff; color: var(--color-primary); box-shadow: var(--shadow-sm); }
.nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.nav-btn svg { width: 14px; height: 14px; }

.current-date-display {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  min-width: 0; flex-shrink: 0;
}
.date-main { font-size: 14px; font-weight: 700; color: var(--color-text-primary); white-space: nowrap; }
.date-today-btn { font-size: 11px; color: var(--color-primary); cursor: pointer; }
.date-today-btn:hover { text-decoration: underline; }

/* === 添加考勤按钮 === */
.add-record-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; min-height: 32px; min-width: 80px;
  border-radius: 999px; border: none;
  background: var(--color-primary); color: #fff;
  font-size: 12px; font-weight: 600; white-space: nowrap; flex-shrink: 0;
  cursor: pointer; transition: all var(--transition-fast);
}
.add-record-chip:hover { background: var(--color-primary-dark); box-shadow: 0 4px 12px var(--color-primary-glow); transform: translateY(-1px); }
.add-record-chip svg { width: 14px; height: 14px; flex-shrink: 0; stroke: #fff; }

.add-record-btn-inline {
  margin-top: 12px; padding: 10px 18px;
  border-radius: var(--radius-lg); border: 1px solid var(--color-primary);
  background: var(--color-primary-bg); color: var(--color-primary);
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: all var(--transition-fast);
}
.add-record-btn-inline:hover { background: var(--color-primary); color: var(--color-bg-card); box-shadow: var(--shadow-sm); }

/* === 日历 === */
.calendar-card {
  margin: 4px 20px 16px;
  padding: 20px;
  background: var(--color-bg-card);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-card);
  transition: all var(--transition-base);
}
.calendar-card.expanded { padding-bottom: 24px; }

.calendar-top-bar {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
}
.calendar-title {
  font-size: 13px; font-weight: 600; color: var(--color-text-secondary);
  cursor: pointer; user-select: none;
}
.calendar-title:hover { color: var(--color-primary); }

.expand-toggle {
  width: 30px; height: 30px; border-radius: 50%; border: none;
  background: rgba(255,255,255,0.85); color: var(--color-text-secondary);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all var(--transition-fast);
}
.expand-toggle:hover { background: var(--color-primary-bg); color: var(--color-primary); }
.expand-toggle svg { width: 16px; height: 16px; }

.week-header { display: flex; margin-bottom: 12px; }
.week-label { flex: 1; text-align: center; font-size: 13px; font-weight: 600; color: var(--color-text-secondary); }
.week-label.weekend { color: var(--color-text-secondary); }

.week-days { display: flex; gap: 4px; }
.day-cell {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 8px 2px 10px; border-radius: var(--radius-md);
  cursor: pointer; transition: all var(--transition-base);
}
.day-cell:hover { background: rgba(99, 102, 241, 0.08); }
.day-cell.selected { background: var(--color-primary-bg); }
.day-cell.today .day-ring { background: var(--color-primary); box-shadow: 0 2px 8px var(--color-primary-glow); color: #fff; }
.day-cell.today.selected .day-ring { background: var(--color-primary-dark); box-shadow: 0 2px 8px var(--color-primary-glow), 0 0 0 3px var(--color-primary-light); }

.day-ring {
  width: 38px; height: 38px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  transition: all var(--transition-base);
  font-weight: 600; font-size: 15px; color: var(--color-text-primary);
}
.day-cell.weekend .day-ring { color: var(--color-text-secondary); }
.day-cell.weekend.today .day-ring { color: #fff; }
.day-cell.selected .day-ring { background: var(--color-primary); color: #fff; box-shadow: 0 2px 8px var(--color-primary-glow); }
.day-cell.holiday .day-ring { color: var(--color-danger); }
.day-cell.holiday.selected .day-ring { color: #fff; background: var(--color-danger); box-shadow: 0 2px 8px rgba(239, 68, 68, 0.35); }
.day-cell.makeup .day-ring { color: var(--color-warning); }
.day-cell.makeup.selected .day-ring { color: #fff; background: var(--color-warning); box-shadow: 0 2px 8px rgba(202, 138, 4, 0.35); }

.day-tag { font-size: 10px; line-height: 1; color: var(--color-danger); font-weight: 500; }
.day-tag.makeup { color: var(--color-warning); }
.day-dots { display: flex; gap: 4px; height: 6px; }
.record-dot { width: 6px; height: 6px; border-radius: 50%; }
.record-dot.in  { background: var(--color-primary); }
.record-dot.out { background: var(--color-success); }

/* === 月视图 === */
.month-nav { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.mini-nav-btn {
  width: 28px; height: 28px; border-radius: 50%; border: none;
  background: rgba(255,255,255,0.85); color: var(--color-text-secondary);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all var(--transition-fast);
}
.mini-nav-btn:hover { background: var(--color-primary-bg); color: var(--color-primary); }
.mini-nav-btn svg { width: 14px; height: 14px; }
.mini-nav-btn.today-btn { width: auto; padding: 0 10px; border-radius: 999px; font-size: 12px; font-weight: 500; margin-left: auto; }
.month-nav-title { font-size: 14px; font-weight: 700; color: var(--color-text-primary); }

.month-header { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 6px; }
.month-week-label { text-align: center; font-size: 12px; font-weight: 500; color: var(--color-text-secondary); padding: 4px 0; }
.month-week-label.weekend { color: var(--color-text-secondary); }

.month-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
.month-cell {
  display: flex; flex-direction: column; align-items: center;
  padding: 6px 2px 6px; border-radius: var(--radius-sm);
  cursor: pointer; transition: all var(--transition-fast);
  position: relative; min-height: 52px;
}
.month-cell:hover { background: rgba(99, 102, 241, 0.08); }
.month-cell.other-month { opacity: 0.3; }
.month-cell.today .month-day-num { background: var(--color-primary); color: #fff; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }
.month-cell.selected { background: var(--color-primary-bg); }
.month-cell.weekend .month-day-num { color: var(--color-text-secondary); }
.month-cell.weekend.today .month-day-num { color: #fff; background: var(--color-primary); }
.month-cell.holiday .month-day-num { color: var(--color-danger); font-weight: 700; }
.month-cell.holiday.today .month-day-num { color: #fff; background: var(--color-danger); }
.month-cell.makeup .month-day-num { color: var(--color-warning); font-weight: 600; }

.month-day-num { font-size: 13px; font-weight: 500; color: var(--color-text-primary); line-height: 1; padding: 4px; }
.month-cell.selected:not(.today) .month-day-num { background: var(--color-primary); color: #fff; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }

.month-tag { font-size: 9px; line-height: 1; color: var(--color-danger); font-weight: 500; }
.month-tag.makeup { color: var(--color-warning); }
.month-dots { display: flex; gap: 3px; height: 4px; margin-top: 1px; }

/* === 日详情卡片 === */
.day-detail-card { margin: 0 20px; padding: 20px; }

.detail-status-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.detail-date { font-size: 13px; color: var(--color-text-secondary); }

.status-badge {
  font-size: 12px; font-weight: 600; padding: 4px 14px;
  border-radius: var(--radius-full);
}
.status-badge.normal   { background: var(--color-success-bg); color: var(--color-success); }
.status-badge.late     { background: var(--color-danger-bg);  color: var(--color-danger); }
.status-badge.early    { background: var(--color-danger-bg);  color: var(--color-danger); }
.status-badge.overtime { background: var(--color-purple-bg);  color: var(--color-purple); }

.timeline { padding-left: 8px; }
.timeline-row { display: flex; gap: 14px; align-items: stretch; }
.timeline-row.break { margin: 4px 0; }

.timeline-marker { display: flex; flex-direction: column; align-items: center; width: 14px; flex-shrink: 0; }
.marker-ring {
  width: 14px; height: 14px; border-radius: 50%;
  border: 3px solid var(--color-primary); background: #fff;
  flex-shrink: 0;
}
.marker-ring.small { width: 10px; height: 10px; border-width: 2px; border-color: var(--color-text-tertiary); }
.marker-line { width: 2px; flex: 1; min-height: 24px; background: var(--color-border); margin: 4px 0; }
.marker-line.dashed { background: repeating-linear-gradient(180deg, var(--color-border) 0, var(--color-border) 3px, transparent 3px, transparent 6px); }

.timeline-content { display: flex; flex-direction: column; gap: 4px; padding-bottom: 14px; flex: 1; }
.tl-label { font-size: 12px; color: var(--color-text-tertiary); }
.tl-value { font-size: 16px; font-weight: 600; color: var(--color-text-primary); }
.tl-value.muted { color: var(--color-text-placeholder); font-weight: 400; }
.tl-value.sub { font-size: 14px; font-weight: 500; color: var(--color-text-secondary); }

.duration-bar {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 8px; padding-top: 14px;
  border-top: 1px dashed var(--color-border);
}
.duration-item { display: flex; flex-direction: column; gap: 2px; }
.duration-label { font-size: 13px; color: var(--color-text-secondary); }
.duration-value { font-size: 24px; font-weight: 800; color: var(--color-primary); font-family: var(--font-mono); letter-spacing: -0.5px; }

.action-buttons { display: flex; gap: 8px; }
.edit-record-btn, .delete-record-btn {
  padding: 6px 16px; border-radius: var(--radius-md);
  font-size: 12px; font-weight: 500; cursor: pointer; border: none;
  transition: all var(--transition-fast);
}
.edit-record-btn { background: var(--color-primary-bg); color: var(--color-primary); }
.edit-record-btn:hover { background: var(--color-primary); color: #fff; }
.delete-record-btn { background: var(--color-danger-bg); color: var(--color-danger); }
.delete-record-btn:hover { background: var(--color-danger); color: #fff; }

/* === 空状态 === */
.empty-card {
  margin: 40px 20px; padding: 32px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  background: var(--color-bg-card); border-radius: var(--radius-2xl);
}
.empty-icon { font-size: 36px; }
.empty-text { font-size: 14px; color: var(--color-text-secondary); }
</style>
