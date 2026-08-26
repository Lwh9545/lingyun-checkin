/**
 * 错误处理工具函数 (TypeScript)
 */

/**
 * 从 unknown 类型的错误中安全提取错误消息
 *
 * 用于 `catch (e: unknown)` 场景，避免使用 `as Error` 类型断言。
 * 优先使用 `instanceof Error` 检查，兼容字符串错误和带 message 属性的对象。
 *
 * @param e catch 块中的 unknown 错误
 * @returns 错误消息字符串
 */
export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  if (e && typeof e === 'object' && 'message' in e) {
    const msg = e.message
    return typeof msg === 'string' ? msg : String(e)
  }
  return String(e)
}
