/**
 * 渲染进程结构化日志（轻量版）
 *
 * 主进程用 shared/logger.js（带文件输出 + 7 天轮转）
 * 渲染进程用本模块：输出到 DevTools console，带时间戳/级别/Tag 结构化前缀
 *
 * 用法：
 *   import { createLogger } from '@/utils/logger'
 *   const log = createLogger('store')
 *   log.error('加载记录失败:', error)
 */

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 } as const
const LOG_LABELS: Record<number, string> = { 0: 'DEBUG', 1: 'INFO', 2: 'WARN', 3: 'ERROR' }

let _minLevel: number = LOG_LEVELS.INFO

/** 设置最低日志级别（运行时调高以减少噪音） */
export function setLogLevel(level: keyof typeof LOG_LEVELS): void {
  _minLevel = LOG_LEVELS[level]
}

export interface Logger {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

/** 创建模块 logger */
export function createLogger(tag: string): Logger {
  function _write(level: number, ...args: unknown[]): void {
    if (level < _minLevel) return
    const now = new Date()
    const _pad = (n: number): string => String(n).padStart(2, '0')
    const ts = `${now.getFullYear()}-${_pad(now.getMonth() + 1)}-${_pad(now.getDate())} ${_pad(now.getHours())}:${_pad(now.getMinutes())}:${_pad(now.getSeconds())}`
    const label = LOG_LABELS[level] ?? '?'
    const message = args
      .map(a => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a)))
      .join(' ')
    const consoleFn = level >= LOG_LEVELS.ERROR ? console.error : level >= LOG_LEVELS.WARN ? console.warn : console.log
    consoleFn(`[${ts}] [${label}] [${tag}] ${message}`)
  }

  return {
    debug: (...args: unknown[]) => _write(LOG_LEVELS.DEBUG, ...args),
    info: (...args: unknown[]) => _write(LOG_LEVELS.INFO, ...args),
    warn: (...args: unknown[]) => _write(LOG_LEVELS.WARN, ...args),
    error: (...args: unknown[]) => _write(LOG_LEVELS.ERROR, ...args)
  }
}
