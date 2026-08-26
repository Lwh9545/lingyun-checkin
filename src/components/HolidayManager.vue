<template>
  <div class="holiday-manager">
    <div class="holiday-card glass-card-strong">
      <div class="holiday-header">
        <div class="holiday-header-left">
          <span class="holiday-title">节假日日历</span>
          <span class="holiday-subtitle" v-if="holidayStatus.totalHolidays > 0">
            {{ holidayStatus.totalHolidays }} 天假期, {{ holidayStatus.totalAdjustments }} 天调休
          </span>
        </div>
        <div class="holiday-status" :class="holidayStatus.state">
          <span class="status-dot"></span>
          <span>{{ statusText }}</span>
        </div>
      </div>

      <!-- 数据来源指示 -->
      <div class="holiday-source">
        <span class="source-label">数据来源</span>
        <span class="source-value" v-if="holidayStatus.lastFetchTime">timor.tech（已更新）</span>
        <span class="source-value fallback" v-else>内置预置数据</span>
      </div>

      <!-- 按分组显示假期 -->
      <div class="holiday-groups" v-if="holidayGroups.length > 0">
        <div v-for="group in holidayGroups" :key="group.name" class="holiday-group">
          <div class="group-name">{{ group.name }}</div>
          <div class="group-dates">
            <span v-for="d in group.dates" :key="d" :class="['group-date', { makeup: group.makeupDays.includes(d) }]">
              {{ d.slice(5) }}
            </span>
          </div>
        </div>
      </div>
      <div class="holiday-empty" v-else>
        <span>暂无假期数据</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { getHolidayStatus, loadCachedHolidays, refreshHolidayData } from '../utils/holidays'

const holidayStatus = ref(getHolidayStatus())

const statusText = computed(() => {
  const map = { idle: '待更新', loading: '更新中...', success: '已更新', error: '更新失败' }
  return map[holidayStatus.value.state] || '未知'
})

// 按节日名称分组
const holidayGroups = computed(() => {
  const holidays = (() => {
    try {
      const c = localStorage.getItem('holidays_cache')
      if (c) return JSON.parse(c).holidays || {}
    } catch { /* ignore */ }
    return {}
  })()

  if (Object.keys(holidays).length === 0) return []

  const groupMap = {}
  for (const [date, name] of Object.entries(holidays)) {
    if (!groupMap[name]) groupMap[name] = []
    groupMap[name].push(date)
  }

  // 获取调休日期
  const adjustments = (() => {
    try {
      const c = localStorage.getItem('holidays_cache')
      return c ? JSON.parse(c).adjustments || {} : {}
    } catch { return {} }
  })()

  // 找出每个节日的调休
  return Object.entries(groupMap)
    .sort(([, a], [, b]) => a[0].localeCompare(b[0]))
    .map(([name, dates]) => {
      const makeupDates = Object.keys(adjustments).filter(d => {
        const month = parseInt(d.slice(5, 7))
        const holidayMonth = parseInt(dates[0]?.slice(5, 7) || '0')
        return Math.abs(month - holidayMonth) <= 1
      })
      return {
        name,
        dates: dates.sort(),
        makeupDays: makeupDates.sort()
      }
    })
})

onMounted(async () => {
  loadCachedHolidays()
  holidayStatus.value = getHolidayStatus()
  await refreshHolidayData()
  holidayStatus.value = getHolidayStatus()
})
</script>

<style scoped>
.holiday-manager {
  max-width: 560px;
  margin: 0 auto;
  padding: 0 20px;
}
.holiday-card {
  padding: 20px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
.holiday-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}
.holiday-header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.holiday-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}
.holiday-subtitle {
  font-size: 12px;
  color: var(--color-text-tertiary);
}
.holiday-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 20px;
  font-weight: 500;
}
.holiday-status.idle { background: var(--color-border-light); color: var(--color-text-tertiary); }
.holiday-status.loading { background: var(--color-info-bg); color: var(--color-info); }
.holiday-status.success { background: var(--color-success-bg); color: var(--color-success); }
.holiday-status.error { background: var(--color-danger-bg); color: var(--color-danger); }
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.holiday-source {
  display: flex;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 16px;
  padding: 8px;
  background: var(--color-border-light);
  border-radius: 8px;
}
.source-label { color: var(--color-text-tertiary); }
.source-value { color: var(--color-text-secondary); font-weight: 500; }
.source-value.fallback { color: var(--color-warning); }

.holiday-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.holiday-group {
  padding: 10px 12px;
  background: var(--color-border-light);
  border-radius: 8px;
}
.group-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 6px;
}
.group-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.group-date {
  font-size: 12px;
  padding: 3px 8px;
  background: var(--color-success-bg);
  color: var(--color-success);
  border-radius: 4px;
  font-family: var(--font-mono);
}
.group-date.makeup {
  background: var(--color-warning-bg);
  color: var(--color-warning);
  text-decoration: line-through;
}
.holiday-empty {
  text-align: center;
  padding: 24px 0;
  color: var(--color-text-tertiary);
  font-size: 13px;
}
</style>
