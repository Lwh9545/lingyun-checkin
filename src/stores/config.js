/**
 * 配置管理 Store(从 attendance store 拆分)
 *
 * 职责:管理所有考勤配置项的加载/保存/重置/批量更新
 * 依赖:storageUtils(存储)、constants(默认值)
 *
 * 设计:_CFG 表驱动,新增配置项只需在数组加一条
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getStorage, setStorage } from '../utils/storageUtils'
import { DEFAULT_CONFIG, STORAGE_KEYS } from '../utils/constants.js'
import { createLogger } from '../utils/logger'

const log = createLogger('config-store')

export const useConfigStore = defineStore('config', () => {
  // ==================== 配置 ref ====================
  const workStartTime = ref(DEFAULT_CONFIG.WORK_START_TIME)
  const workEndTime = ref(DEFAULT_CONFIG.WORK_END_TIME)
  const workDays = ref([...DEFAULT_CONFIG.WORK_DAYS])
  const autoStartup = ref(DEFAULT_CONFIG.AUTO_STARTUP)
  const autoCheckIn = ref(DEFAULT_CONFIG.AUTO_CHECK_IN)
  const autoCheckInOffset = ref(DEFAULT_CONFIG.AUTO_CHECK_IN_OFFSET)
  const autoCheckOutOnShutdown = ref(DEFAULT_CONFIG.AUTO_CHECK_OUT_ON_SHUTDOWN)
  const enableRest = ref(DEFAULT_CONFIG.ENABLE_REST)
  const restStart = ref(DEFAULT_CONFIG.REST_START)
  const restEnd = ref(DEFAULT_CONFIG.REST_END)
  const overtimeOnNonWorkday = ref(DEFAULT_CONFIG.OVERTIME_ON_NON_WORKDAY)
  const overtimeOnSaturday = ref(DEFAULT_CONFIG.OVERTIME_ON_SATURDAY)
  const overtimeOnSunday = ref(DEFAULT_CONFIG.OVERTIME_ON_SUNDAY)
  const overtimeOnWorkday = ref(DEFAULT_CONFIG.OVERTIME_ON_WORKDAY)
  const overtimeAfterEndThreshold = ref(DEFAULT_CONFIG.OVERTIME_AFTER_END_THRESHOLD)
  const checkWindowBefore = ref(DEFAULT_CONFIG.CHECK_WINDOW_BEFORE)
  const lateThreshold = ref(DEFAULT_CONFIG.LATE_THRESHOLD)

  // ── 配置映射表(一处定义,多处复用) ──
  const _CFG = [
    { key: 'workStartTime',             ref: workStartTime,             sk: STORAGE_KEYS.WORK_START_TIME,              def: DEFAULT_CONFIG.WORK_START_TIME },
    { key: 'workEndTime',               ref: workEndTime,               sk: STORAGE_KEYS.WORK_END_TIME,                def: DEFAULT_CONFIG.WORK_END_TIME },
    { key: 'workDays',                  ref: workDays,                  sk: STORAGE_KEYS.WORK_DAYS,                    def: DEFAULT_CONFIG.WORK_DAYS, clone: true },
    { key: 'autoStartup',               ref: autoStartup,               sk: STORAGE_KEYS.AUTO_STARTUP,                 def: DEFAULT_CONFIG.AUTO_STARTUP },
    { key: 'autoCheckIn',               ref: autoCheckIn,               sk: STORAGE_KEYS.AUTO_CHECK_IN,                def: DEFAULT_CONFIG.AUTO_CHECK_IN },
    { key: 'autoCheckInOffset',         ref: autoCheckInOffset,         sk: STORAGE_KEYS.AUTO_CHECK_IN_OFFSET,         def: DEFAULT_CONFIG.AUTO_CHECK_IN_OFFSET },
    { key: 'autoCheckOutOnShutdown',    ref: autoCheckOutOnShutdown,    sk: STORAGE_KEYS.AUTO_CHECK_OUT_ON_SHUTDOWN,   def: DEFAULT_CONFIG.AUTO_CHECK_OUT_ON_SHUTDOWN },
    { key: 'enableRest',                ref: enableRest,                sk: STORAGE_KEYS.ENABLE_REST,                  def: DEFAULT_CONFIG.ENABLE_REST },
    { key: 'restStart',                 ref: restStart,                 sk: STORAGE_KEYS.REST_START,                   def: DEFAULT_CONFIG.REST_START },
    { key: 'restEnd',                   ref: restEnd,                   sk: STORAGE_KEYS.REST_END,                     def: DEFAULT_CONFIG.REST_END },
    { key: 'overtimeOnNonWorkday',      ref: overtimeOnNonWorkday,      sk: STORAGE_KEYS.OVERTIME_ON_NON_WORKDAY,      def: DEFAULT_CONFIG.OVERTIME_ON_NON_WORKDAY },
    { key: 'overtimeOnSaturday',        ref: overtimeOnSaturday,        sk: STORAGE_KEYS.OVERTIME_ON_SATURDAY,         def: DEFAULT_CONFIG.OVERTIME_ON_SATURDAY },
    { key: 'overtimeOnSunday',          ref: overtimeOnSunday,          sk: STORAGE_KEYS.OVERTIME_ON_SUNDAY,           def: DEFAULT_CONFIG.OVERTIME_ON_SUNDAY },
    { key: 'overtimeOnWorkday',         ref: overtimeOnWorkday,         sk: STORAGE_KEYS.OVERTIME_ON_WORKDAY,          def: DEFAULT_CONFIG.OVERTIME_ON_WORKDAY },
    { key: 'overtimeAfterEndThreshold', ref: overtimeAfterEndThreshold, sk: STORAGE_KEYS.OVERTIME_AFTER_END_THRESHOLD, def: DEFAULT_CONFIG.OVERTIME_AFTER_END_THRESHOLD },
    { key: 'checkWindowBefore',         ref: checkWindowBefore,         sk: STORAGE_KEYS.CHECK_WINDOW_BEFORE,          def: DEFAULT_CONFIG.CHECK_WINDOW_BEFORE },
    { key: 'lateThreshold',             ref: lateThreshold,             sk: STORAGE_KEYS.LATE_THRESHOLD,               def: DEFAULT_CONFIG.LATE_THRESHOLD },
  ]

  /** 从 _CFG 获取默认值的深拷贝 */
  function _cloneDefault(c) {
    return c.clone ? structuredClone(c.def) : c.def
  }

  // ==================== 配置方法 ====================

  /** 构建运行时配置对象(传给 checkAttendanceStatus 等) */
  function getConfig() {
    const config = {}
    for (const c of _CFG) config[c.key] = c.ref.value
    return config
  }

  /** 将所有配置项加载到 store refs */
  async function _loadConfigToStore() {
    for (const c of _CFG) {
      c.ref.value = await getStorage(c.sk, _cloneDefault(c))
    }
  }

  /** 将所有配置项写回存储 */
  async function _persistConfig(configOverride) {
    for (const c of _CFG) {
      const val = configOverride?.[c.key] !== undefined ? configOverride[c.key] : c.ref.value
      await setStorage(c.sk, c.clone ? [...val] : val)
    }
  }

  /** 重置所有 ref 为默认值(不写存储) */
  function _applyDefaultsToRefs() {
    for (const c of _CFG) c.ref.value = _cloneDefault(c)
  }

  /** 重置为默认值并写存储 */
  async function resetToDefaults() {
    _applyDefaultsToRefs()
    await _persistConfig()
  }

  /** 批量更新配置项 */
  async function updateWorkSettings(settings) {
    if (!settings || typeof settings !== 'object') return

    let autoStartupResult = null

    for (const c of _CFG) {
      if (settings[c.key] !== undefined) {
        const value = c.clone ? [...settings[c.key]] : settings[c.key]
        c.ref.value = value
        await setStorage(c.sk, value)

        // 自动启动需要额外通知 Electron
        if (c.key === 'autoStartup' && window.electronAPI) {
          autoStartupResult = await window.electronAPI.autoStartup.set(value)
          if (autoStartupResult && !autoStartupResult.success) {
            log.warn('[config store] Auto-startup set failed:', autoStartupResult.error)
          }
        }
      }
    }

    return { autoStartupResult }
  }

  // ==================== 导出 ====================
  return {
    // 配置 ref
    workStartTime, workEndTime, workDays,
    autoStartup, autoCheckIn, autoCheckInOffset, autoCheckOutOnShutdown,
    enableRest, restStart, restEnd,
    overtimeOnNonWorkday, overtimeOnSaturday, overtimeOnSunday, overtimeOnWorkday,
    overtimeAfterEndThreshold, checkWindowBefore, lateThreshold,
    // 方法
    getConfig, resetToDefaults, updateWorkSettings,
    _loadConfigToStore, _persistConfig, _applyDefaultsToRefs
  }
})
