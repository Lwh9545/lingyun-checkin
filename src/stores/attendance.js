/**
 * 考勤状态管理 Store
 * 职责：管理打卡记录、执行打卡操作、自动打卡、统计、时间
 * 配置管理已拆分到 useConfigStore
 * 依赖：recordUtils（记录操作）、storageUtils（存储）、dateUtils（时间）、attendanceUtils（业务逻辑）
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getAttendanceRecords, saveAttendanceRecords, overwriteAttendanceRecords, getStorage, setStorage } from '../utils/storageUtils'
import { formatTimeShort, getTodayString, calculateTargetTime } from '../utils/dateUtils'
import { checkAttendanceStatus, getStatusValue, getStatusText, getEffectiveStartTime, getEffectiveEndTime, isInCheckWindow, calculateEffectiveDuration, isWorkDay, computeStatsFromRecords } from '../utils/attendanceUtils'
import { mergeRecords } from '../utils/recordUtils'
import { STORAGE_KEYS } from '../utils/constants.js'
import { useConfigStore } from './config.js'

// ==================== Store 定义 ====================
export const useAttendanceStore = defineStore('attendance', () => {
  // 配置从 useConfigStore 获取(单一数据源,避免重复定义)
  const configStore = useConfigStore()
  const {
    workStartTime, workEndTime, workDays,
    autoStartup, autoCheckIn, autoCheckInOffset, autoCheckOutOnShutdown,
    enableRest, restStart, restEnd,
    overtimeOnNonWorkday, overtimeOnSaturday, overtimeOnSunday, overtimeOnWorkday,
    overtimeAfterEndThreshold, checkWindowBefore, lateThreshold,
    getConfig, resetToDefaults, updateWorkSettings,
    _loadConfigToStore, _persistConfig
  } = configStore

  // ==================== 状态 ====================
  const records = ref([])
  const currentTime = ref('00:00:00')
  const currentDate = ref('')
  const loading = ref(false)
  const isChecking = ref(false)

  // ==================== 计算属性 ====================
  const todayRecords = computed(() => {
    const today = getTodayString()
    return records.value.find(r => r.date === today)
  })

  const isCheckedIn = computed(() => {
    return todayRecords.value?.checkIn && !todayRecords.value?.checkOut
  })

  const checkText = computed(() => {
    if (!todayRecords.value?.checkIn) return '上班打卡'
    if (!todayRecords.value?.checkOut) return '下班打卡'
    return '已完成打卡'
  })

  const canCheck = computed(() => {
    if (!todayRecords.value?.checkIn) return true
    if (!todayRecords.value?.checkOut) return true
    return false
  })

  const displayStartTime = computed(() => workStartTime.value)
  const displayEndTime = computed(() => workEndTime.value)

  // ==================== 统计数据 ====================
  /** 月度统计数据 */
  const monthlyStats = computed(() => {
    const now = new Date()
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const monthRecords = records.value.filter(r => r.date.startsWith(prefix))
    return computeStatsFromRecords(monthRecords)
  })

  /** 年度统计数据 */
  const yearlyStats = computed(() => {
    const prefix = `${new Date().getFullYear()}-`
    const yearRecords = records.value.filter(r => r.date.startsWith(prefix))
    return computeStatsFromRecords(yearRecords)
  })

  /** 最近 7 天记录 */
  const recentWeekRecords = computed(() => {
    const today = getTodayString()
    const [y, m, d] = today.split('-').map(Number)
    const todayDate = new Date(y, m - 1, d)
    const days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(todayDate)
      date.setDate(date.getDate() - i)
      const ds = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const record = records.value.find(r => r.date === ds)
      days.push({
        date: ds,
        dayName: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()],
        isToday: i === 0,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        checkIn: record?.checkIn || null,
        checkOut: record?.checkOut || null,
        status: record?.status || null,
        duration: record?.duration || null
      })
    }
    return days
  })

  const todayWorkDuration = computed(() => {
    if (todayRecords.value?.checkIn && todayRecords.value?.checkOut) {
      return calculateEffectiveDuration(
        todayRecords.value.checkIn,
        todayRecords.value.checkOut,
        getConfig()
      )
    }
    return ''
  })

  // ==================== 核心：加载配置和记录 ====================
  async function loadRecords() {
    loading.value = true
    try {
      const raw = await getAttendanceRecords()
      records.value = mergeRecords(raw)
      await _loadConfigToStore()
    } catch (error) {
      console.error('[store] 加载记录失败:', error)
    } finally {
      loading.value = false
    }
  }

  // ==================== 核心：执行打卡 ====================
  async function handleCheck() {
    if (isChecking.value) {
      return { success: false, message: '正在打卡中，请稍候再试' }
    }
    isChecking.value = true
    try {
      const now = new Date()
      const timeString = formatTimeShort(now)
      const dateString = getTodayString()

      const freshRecords = await getAttendanceRecords()
      const mergedRecords = mergeRecords(freshRecords)

      const todayMerged = mergedRecords.find(r => r.date === dateString)
      const type = todayMerged?.checkIn ? '下班' : '上班'

      const status = checkAttendanceStatus(type, timeString, getConfig())

      const updatedRecords = [...mergedRecords]
      const todayIndex = updatedRecords.findIndex(r => r.date === dateString)

      if (todayIndex >= 0) {
        if (type === '上班') {
          updatedRecords[todayIndex] = {
            ...updatedRecords[todayIndex],
            checkIn: timeString,
            status: getStatusValue(status),
            timestamp: now.getTime()
          }
        } else {
          updatedRecords[todayIndex] = {
            ...updatedRecords[todayIndex],
            checkOut: timeString,
            duration: calculateEffectiveDuration(
              updatedRecords[todayIndex].checkIn,
              timeString,
              getConfig()
            ),
            timestamp: now.getTime()
          }
        }
      } else {
        updatedRecords.push({
          date: dateString,
          status: getStatusValue(status),
          checkIn: type === '上班' ? timeString : '',
          checkOut: type === '下班' ? timeString : '',
          duration: '',
          timestamp: now.getTime()
        })
      }

      const finalRecords = mergeRecords(updatedRecords)
      records.value = finalRecords
      await saveAttendanceRecords(finalRecords)

      return { success: true, type, status, time: timeString }
    } finally {
      isChecking.value = false
    }
  }

  // ==================== 记录管理：新增或更新单条记录 ====================
  async function addRecord(recordData) {
    if (!recordData || !recordData.date) return false
    const freshRecords = mergeRecords(await getAttendanceRecords())
    const exists = freshRecords.some(r => r.date === recordData.date)
    let updatedRecords

    if (exists) {
      updatedRecords = freshRecords.map(r => {
        if (r.date !== recordData.date) return r
        const newRecord = { ...r, ...recordData, timestamp: Date.now() }
        if (newRecord.checkIn && newRecord.checkOut) {
          newRecord.duration = calculateEffectiveDuration(
            newRecord.checkIn, newRecord.checkOut, getConfig()
          )
        }
        return newRecord
      })
    } else {
      const newRecord = { ...recordData, timestamp: Date.now() }
      if (!newRecord.status) newRecord.status = 'normal'
      if (newRecord.checkIn && newRecord.checkOut) {
        newRecord.duration = calculateEffectiveDuration(
          newRecord.checkIn, newRecord.checkOut, getConfig()
        )
      }
      updatedRecords = [...freshRecords, newRecord]
    }

    const finalRecords = mergeRecords(updatedRecords)
    records.value = finalRecords
    await overwriteAttendanceRecords(finalRecords)
    return true
  }

  // ==================== 记录管理：更新单条记录 ====================
  async function updateRecord(date, recordData) {
    return await addRecord({ ...recordData, date })
  }

  // ==================== 记录管理：删除单条记录 ====================
  async function deleteRecord(date) {
    const freshRecords = mergeRecords(await getAttendanceRecords())
    const finalRecords = freshRecords.filter(r => r.date !== date)
    records.value = finalRecords
    await overwriteAttendanceRecords(finalRecords)
  }

  // ==================== 自动打卡逻辑 ====================
  async function tryAutoCheckIn(silent = false) {
    try {
      if (!autoCheckIn.value) return false
      if (!isWorkDay(workDays.value)) return false

      const today = getTodayString()
      const lastCheckInDate = await getStorage(STORAGE_KEYS.LAST_CHECK_IN_DATE, '')

      if (lastCheckInDate === today) return false
      if (todayRecords.value?.checkIn) return false
      if (!isInCheckWindow('上班', getConfig())) return false

      const result = await handleCheck()
      if (result?.success) {
        await setStorage(STORAGE_KEYS.LAST_CHECK_IN_DATE, today)

        if (!silent && window.electronAPI && window.electronAPI.notification) {
          await window.electronAPI.notification.send(
            '✅ 自动打卡成功',
            `上班打卡已完成: ${new Date().toLocaleTimeString()}\n状态: ${getStatusText(result.status)}`
          )
        }
        return true
      }
      return false
    } catch (error) {
      console.error('[store] 自动上班打卡失败:', error)
      return false
    }
  }

  // ==================== 时间更新 ====================
  function updateCurrentTime() {
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    currentTime.value = `${hours}:${minutes}:${seconds}`

    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    currentDate.value = `${year}年${month}月${day}日`
  }

  function getCurrentTime() {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }

  // ==================== 导出 ====================
  return {
    // 状态
    records,
    currentTime,
    currentDate,
    workStartTime,
    workEndTime,
    workDays,
    loading,
    isChecking,
    autoStartup,
    autoCheckIn,
    autoCheckInOffset,
    autoCheckOutOnShutdown,
    enableRest,
    restStart,
    restEnd,
    overtimeOnNonWorkday,
    overtimeOnSaturday,
    overtimeOnSunday,
    overtimeOnWorkday,
    overtimeAfterEndThreshold,
    checkWindowBefore,
    lateThreshold,
    // 计算属性
    todayRecords,
    isCheckedIn,
    checkText,
    canCheck,
    displayStartTime,
    displayEndTime,
    todayWorkDuration,
    monthlyStats,
    yearlyStats,
    recentWeekRecords,
    // 方法
    loadRecords,
    handleCheck,
    addRecord,
    updateRecord,
    deleteRecord,
    updateWorkSettings,
    updateCurrentTime,
    tryAutoCheckIn,
    resetToDefaults,
    calculateTargetTime,
    getCurrentTime,
    getConfig
  }
})
