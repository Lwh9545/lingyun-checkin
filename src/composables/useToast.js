/**
 * useToast — 全局 Toast 通知
 * 
 * 用法：
 *   import { useToast } from '../composables/useToast'
 *   const toast = useToast()
 *   toast.success('保存成功')
 *   toast.error('操作失败')
 *   toast.warning('请注意')
 *   toast.info('提示信息')
 */

export function useToast() {
  function _call(message, type, duration) {
    const api = window.__toast
    if (api && api.show) {
      return api.show(message, type, duration)
    }
    // 降级：Toast 未挂载时回退
    if (type === 'error') alert(message)
    return -1
  }

  return {
    success: (msg, dur) => _call(msg, 'success', dur ?? 2500),
    error:   (msg, dur) => _call(msg, 'error',   dur ?? 4000),
    warning: (msg, dur) => _call(msg, 'warning', dur ?? 3500),
    info:    (msg, dur) => _call(msg, 'info',    dur ?? 3000),
    dismiss: (id) => {
      const api = window.__toast
      if (api?.dismiss) api.dismiss(id)
    }
  }
}
