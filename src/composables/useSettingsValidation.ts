/**
 * 设置校验 composable（从 Settings.vue 拆分 FW-006）
 *
 * 职责：实时校验工作时间/午休时间顺序、提交前完整校验、加班开关聚合
 * 依赖：timeToMinutes
 */

import { computed, type UnwrapNestedRefs } from 'vue'
import { timeToMinutes } from '../utils/dateUtils'
import type { AppConfig } from '../types/core'

/** 防误设：上班时间不能早于凌晨 4 点（防止 00:05 这类误配置导致凌晨自动打卡） */
export const MIN_WORK_START_MINUTES = 4 * 60

/** 校验所需的设置子集 */
type ValidationSettings = Pick<AppConfig,
  | 'workStartTime' | 'workEndTime'
  | 'enableRest' | 'restStart' | 'restEnd'
  | 'lateThreshold' | 'checkWindowBefore'
  | 'overtimeOnSaturday' | 'overtimeOnSunday' | 'overtimeOnWorkday'>

/**
 * 创建设置校验器
 * @param settings 响应式设置对象（localSettings）
 */
export function useSettingsValidation(settings: UnwrapNestedRefs<ValidationSettings>) {
  /** 实时校验：时间顺序错误 */
  const timeErrors = computed(() => {
    const errs: string[] = []
    const startMin = timeToMinutes(settings.workStartTime)
    const endMin = timeToMinutes(settings.workEndTime)
    if (startMin >= 0 && startMin < MIN_WORK_START_MINUTES) {
      errs.push('上班时间不能设置在凌晨 0-4 点')
    }
    if (startMin >= 0 && endMin >= 0 && startMin >= endMin) {
      errs.push('上班时间必须早于下班时间')
    }
    if (settings.enableRest) {
      const rs = timeToMinutes(settings.restStart)
      const re = timeToMinutes(settings.restEnd)
      if (rs >= 0 && re >= 0 && rs >= re) {
        errs.push('午休开始必须早于午休结束')
      }
      if (rs >= 0 && re >= 0 && startMin >= 0 && endMin >= 0) {
        if (rs <= startMin || re >= endMin) {
          errs.push('午休时间必须在工作时间范围内')
        }
      }
    }
    return errs
  })

  /** 是否有任何加班开关开启 */
  const anyOvertimeEnabled = computed(() =>
    settings.overtimeOnSaturday ||
    settings.overtimeOnSunday ||
    settings.overtimeOnWorkday
  )

  /**
   * 提交前完整校验（含阈值范围检查）
   * @param settings 要校验的设置对象
   * @returns 错误信息数组（空数组表示通过）
   */
  function validateSettings(s: ValidationSettings): string[] {
    const errors: string[] = []
    const startMin = timeToMinutes(s.workStartTime)
    const endMin = timeToMinutes(s.workEndTime)

    if (startMin < 0 || endMin < 0) {
      errors.push('上班时间和下班时间格式无效')
      return errors
    }
    if (startMin >= endMin) {
      errors.push('上班时间必须早于下班时间')
    }
    if (startMin < MIN_WORK_START_MINUTES) {
      errors.push('上班时间不能设置在凌晨 0-4 点，请检查时间设置')
    }
    if (s.enableRest) {
      const restStartMin = timeToMinutes(s.restStart)
      const restEndMin = timeToMinutes(s.restEnd)
      if (restStartMin >= restEndMin) {
        errors.push('午休开始时间必须早于午休结束时间')
      }
      if (restStartMin <= startMin || restEndMin >= endMin) {
        errors.push('午休时间必须在工作时间范围内')
      }
    }
    if (s.lateThreshold < 0 || s.lateThreshold > 120) {
      errors.push('迟到阈值必须在 0-120 分钟之间')
    }
    if (s.checkWindowBefore < 0 || s.checkWindowBefore > 120) {
      errors.push('打卡窗口必须在 0-120 分钟之间')
    }
    return errors
  }

  return { timeErrors, anyOvertimeEnabled, validateSettings }
}
