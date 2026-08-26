<template>
  <div class="all-view">
    <!-- 头部 -->
    <div class="all-header-card glass-card-strong fade-in-scale" style="animation-delay:0.05s">
      <span class="all-title">所有打卡记录</span>
      <div class="all-header-actions">
        <button class="add-record-chip small" @click="$emit('add', null)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>添加</span>
        </button>
        <button class="export-chip" @click="exportAllToExcel" :disabled="attendanceStore.records.length === 0">
          <span>导出全部</span>
        </button>
      </div>
    </div>

    <!-- 记录列表 -->
    <div class="all-list glass-card-strong fade-in-scale" style="animation-delay:0.1s">
      <div class="record-row" v-for="record in sortedRecords" :key="record.date">
        <div class="record-date-col">
          <span class="record-date">{{ record.date }}</span>
          <span class="record-weekday">{{ getWeekday(record.date) }}</span>
        </div>
        <div class="record-times-col">
          <span class="record-time in">
            <span class="time-dot"></span>{{ record.checkIn || '--:--' }}
          </span>
          <span class="record-time out">
            <span class="time-dot out"></span>{{ record.checkOut || '--:--' }}
          </span>
        </div>
        <div class="record-status-col">
          <span class="status-tag" :class="record.status">{{ getStatusText(record.status) }}</span>
          <span class="record-duration">{{ record.duration || '--' }}</span>
        </div>
        <div class="record-actions-col">
          <button class="mini-btn edit" @click="$emit('edit', record)">编辑</button>
          <button class="mini-btn delete" @click="$emit('delete', record.date)">删除</button>
        </div>
      </div>
      <div class="all-empty" v-if="attendanceStore.records.length === 0">
        <span class="empty-icon">📋</span>
        <span class="empty-text">暂无打卡记录</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAttendanceStore } from '../../stores/attendance'
import { getStatusText } from '../../utils/attendanceUtils'
import { getTodayString } from '../../utils/dateUtils'
import { createLogger } from '../../utils/logger'

const log = createLogger('all-records-view')
const emit = defineEmits(['add', 'edit', 'delete'])
const attendanceStore = useAttendanceStore()

const sortedRecords = computed(() => {
  return [...attendanceStore.records].sort((a, b) => b.date.localeCompare(a.date))
})

/** @type {{ value: number, name: string }[]} */
const WEEK_NAMES = [{value:0,name:'周日'},{value:1,name:'周一'},{value:2,name:'周二'},{value:3,name:'周三'},{value:4,name:'周四'},{value:5,name:'周五'},{value:6,name:'周六'}]

function getWeekday(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return WEEK_NAMES[new Date(y, m - 1, d).getDay()].name
}

async function exportAllToExcel() {
  if (attendanceStore.records.length === 0) return
  try {
    const XLSX = await import('xlsx')
    const data = attendanceStore.records.map(r => ({
      '日期': r.date, '星期': getWeekday(r.date),
      '上班时间': r.checkIn || '--:--', '下班时间': r.checkOut || '--:--',
      '工作时长': r.duration || '--', '状态': getStatusText(r.status)
    }))
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '打卡记录')
    XLSX.writeFile(workbook, `考勤记录_全部_${getTodayString()}.xlsx`)
  } catch (error) {
    log.error('Excel 导出失败:', error)
    alert('导出失败: ' + (error?.message || '未知错误'))
  }
}
</script>

<style scoped>
.all-view { display: flex; flex-direction: column; gap: 12px; }

.glass-card-strong {
  background: var(--color-bg-card);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-card);
}

/* === 头部 === */
.all-header-card {
  display: flex; justify-content: space-between; align-items: center; gap: 10px;
  margin: 0 20px; padding: 14px 18px; flex-wrap: nowrap;
}

.all-title { font-size: 15px; font-weight: 600; color: var(--color-text-primary); flex-shrink: 0; white-space: nowrap; }

.all-header-actions { display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; }

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

/* === 记录列表 === */
.all-list { margin: 0 20px; padding: 8px 0; }

.record-row {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px; border-bottom: 1px solid var(--color-border-light);
  transition: background var(--transition-fast);
}
.record-row:last-child { border-bottom: none; }
.record-row:hover { background: rgba(99, 102, 241, 0.03); }

.record-date-col { display: flex; flex-direction: column; gap: 2px; min-width: 90px; flex-shrink: 0; }
.record-date    { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
.record-weekday { font-size: 11px; color: var(--color-text-secondary); }

.record-times-col { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.record-time {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 500; color: var(--color-text-primary);
  font-family: var(--font-mono);
}
.time-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--color-primary); flex-shrink: 0; }
.time-dot.out { background: var(--color-success); }

.record-status-col { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
.status-tag {
  font-size: 11px; font-weight: 600; padding: 2px 10px;
  border-radius: var(--radius-sm);
}
.status-tag.normal   { background: var(--color-success-bg); color: var(--color-success); }
.status-tag.late     { background: var(--color-danger-bg);  color: var(--color-danger); }
.status-tag.early    { background: var(--color-danger-bg);  color: var(--color-danger); }
.status-tag.overtime { background: var(--color-purple-bg);  color: var(--color-purple); }

.record-duration { font-size: 12px; color: var(--color-text-secondary); font-family: var(--font-mono); }

.record-actions-col { display: flex; gap: 6px; flex-shrink: 0; }
.mini-btn {
  padding: 4px 10px; border-radius: var(--radius-sm);
  font-size: 11px; font-weight: 500; cursor: pointer; border: none;
  transition: all var(--transition-fast);
}
.mini-btn.edit   { background: var(--color-primary-bg); color: var(--color-primary); }
.mini-btn.edit:hover   { background: var(--color-primary); color: #fff; }
.mini-btn.delete { background: var(--color-danger-bg);  color: var(--color-danger); }
.mini-btn.delete:hover { background: var(--color-danger);  color: #fff; }

/* === 空状态 === */
.all-empty {
  padding: 40px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.empty-icon { font-size: 36px; }
.empty-text { font-size: 14px; color: var(--color-text-secondary); }
</style>
