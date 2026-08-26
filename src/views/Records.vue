<template>
  <div class="records-page">
    <!-- Tab 导航 -->
    <div class="tab-header fade-in-up">
      <div class="tab-track">
        <div class="tab-item" :class="{ active: currentTab === 'day' }" @click="currentTab = 'day'">
          <span>日统计</span>
        </div>
        <div class="tab-item" :class="{ active: currentTab === 'month' }" @click="currentTab = 'month'">
          <span>月统计</span>
        </div>
        <div class="tab-item" :class="{ active: currentTab === 'all' }" @click="currentTab = 'all'">
          <span>全部记录</span>
        </div>
      </div>
    </div>

    <!-- 日统计 -->
    <DayView
      v-if="currentTab === 'day'"
      @add="openAddModal"
      @edit="openEditModal"
      @delete="confirmDelete"
    />

    <!-- 月统计 -->
    <MonthView
      v-if="currentTab === 'month'"
      @add="openAddModal"
    />

    <!-- 全部记录 -->
    <AllView
      v-if="currentTab === 'all'"
      @add="openAddModal"
      @edit="openEditModal"
      @delete="confirmDelete"
    />

    <!-- 编辑/添加弹窗 -->
    <div v-if="showEditModal" class="modal" @click.self="closeEditModal">
      <div class="modal-mask" @click="closeEditModal"></div>
      <div class="modal-content">
        <div class="modal-header">
          <span class="modal-title">{{ isEditMode ? '编辑记录' : '添加考勤' }}</span>
          <button class="modal-close" @click="closeEditModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <span class="form-label">日期</span>
            <input
              v-if="!isEditMode"
              type="date"
              v-model="editingRecord.date"
              class="form-input"
              :max="getTodayString()"
            />
            <span v-else class="form-value">{{ editingRecord.date }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">上班时间</span>
            <input type="time" v-model="editingRecord.checkIn" class="form-input" />
          </div>
          <div class="form-row">
            <span class="form-label">下班时间</span>
            <input type="time" v-model="editingRecord.checkOut" class="form-input" />
          </div>
          <div class="form-row">
            <span class="form-label">状态</span>
            <select v-model="editingRecord.status" class="form-input">
              <option value="normal">正常</option>
              <option value="late">迟到</option>
              <option value="early">早退</option>
              <option value="overtime">加班</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeEditModal">取消</button>
          <button class="btn-confirm" @click="saveEdit">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAttendanceStore } from '../stores/attendance'
import { calculateEffectiveDuration } from '../utils/attendanceUtils'
import { getTodayString } from '../utils/dateUtils'
import { useToast } from '../composables/useToast'
import DayView from './records/DayView.vue'
import MonthView from './records/MonthView.vue'
import AllView from './records/AllView.vue'

const attendanceStore = useAttendanceStore()
const toast = useToast()

const currentTab = ref('day')
const showEditModal = ref(false)
const isEditMode = ref(false)
const editingRecord = ref({ date: '', checkIn: '', checkOut: '', status: 'normal' })

function openEditModal(record) {
  isEditMode.value = true
  editingRecord.value = {
    date: record.date,
    checkIn: record.checkIn || '',
    checkOut: record.checkOut || '',
    status: record.status || 'normal',
    duration: record.duration || ''
  }
  showEditModal.value = true
}

function openAddModal(defaultDate) {
  isEditMode.value = false
  editingRecord.value = {
    date: defaultDate || getTodayString(),
    checkIn: attendanceStore.workStartTime || '09:00',
    checkOut: attendanceStore.workEndTime || '18:00',
    status: 'normal',
    duration: ''
  }
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  isEditMode.value = false
  editingRecord.value = { date: '', checkIn: '', checkOut: '', status: 'normal' }
}

async function saveEdit() {
  const record = { ...editingRecord.value }
  if (!record.date) { toast.warning('请选择日期'); return }
  if (!record.checkIn && !record.checkOut) { toast.warning('请至少填写上班或下班时间'); return }
  if (record.checkIn && record.checkOut) {
    record.duration = calculateEffectiveDuration(record.checkIn, record.checkOut, {
      enableRest: attendanceStore.enableRest,
      restStart: attendanceStore.restStart,
      restEnd: attendanceStore.restEnd
    })
  } else {
    record.duration = ''
  }
  await attendanceStore.addRecord(record)
  closeEditModal()
  toast.success(isEditMode.value ? '保存成功！' : '添加成功！')
}

async function confirmDelete(date) {
  if (!confirm(`确定删除 ${date} 的打卡记录吗？此操作不可撤销。`)) return
  await attendanceStore.deleteRecord(date)
  toast.success('记录已删除')
}

onMounted(async () => {
  await attendanceStore.loadRecords()
})
</script>

<style scoped>
.records-page {
  min-height: 100vh;
  padding: 16px 0 40px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 560px;
  margin: 0 auto;
}

/* === Tab === */
.tab-header {
  padding: 16px 20px 12px;
  display: flex;
  justify-content: center;
}

.tab-track {
  display: flex;
  gap: 4px;
  background: var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 3px;
}

.tab-item {
  padding: 9px 22px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
}

.tab-item.active {
  background: #fff;
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.tab-item:hover:not(.active) { color: var(--color-text-secondary); }

/* === 弹窗 === */
.modal {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: center;
}
.modal-mask {
  position: absolute; inset: 0;
  background: rgba(15, 23, 42, 0.3);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.modal-content {
  position: relative; z-index: 1;
  background: #fff; border-radius: var(--radius-2xl);
  padding: 24px 24px 20px; width: 340px; max-width: 90vw;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.2);
  animation: modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.96) translateY(10px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.modal-title { font-size: 17px; font-weight: 700; color: var(--color-text-primary); }
.modal-close {
  width: 30px; height: 30px; border-radius: 50%; border: none;
  background: var(--color-border-light); font-size: 18px; color: var(--color-text-secondary);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all var(--transition-fast);
}
.modal-close:hover { background: var(--color-border); color: var(--color-text-primary); }

.modal-body { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }
.form-row { display: flex; justify-content: space-between; align-items: center; }
.form-label { font-size: 14px; color: var(--color-text-secondary); }
.form-input, .form-value {
  font-size: 14px; padding: 8px 12px; border-radius: var(--radius-md);
  border: 1px solid var(--color-border); background: var(--color-border-light);
  color: var(--color-text-primary); outline: none; font-family: var(--font-family);
}
.form-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-bg); }
.form-value { border: none; background: transparent; }

select.form-input { cursor: pointer; }

.modal-footer { display: flex; gap: 10px; }
.btn-cancel, .btn-confirm {
  flex: 1; height: 44px; border-radius: var(--radius-lg);
  font-size: 15px; font-weight: 600; border: none; cursor: pointer;
  transition: all var(--transition-fast);
}
.btn-cancel { background: var(--color-border-light); color: var(--color-text-secondary); }
.btn-cancel:hover { background: var(--color-border); }
.btn-confirm {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: #fff; box-shadow: 0 4px 14px var(--color-primary-glow);
}
.btn-confirm:hover { box-shadow: 0 6px 20px var(--color-primary-glow); transform: translateY(-1px); }
</style>
