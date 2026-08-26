/**
 * shared/recordMerger.js 的 TypeScript 类型声明
 *
 * 该模块是 mergeRecords 的单一规范源（FW-001 落地）：
 * - Electron 主进程通过 require() 引用
 * - 渲染进程通过 src/utils/recordUtils.ts re-export 引用
 * - 任何对 mergeRecords 的修改都以此处为唯一来源
 */
import type { AttendanceRecord } from '../src/types/core'

export declare function mergeRecords(
  records: AttendanceRecord[] | null | undefined
): AttendanceRecord[]
