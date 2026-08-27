/**
 * 打卡记录处理工具函数 (TypeScript)
 */
/**
 * mergeRecords 单一规范源：shared/recordMerger.js（CommonJS，主进程 require + 渲染进程 import 共用）
 * 此处仅做类型化 re-export，禁止再实现第二份逻辑（FW-001 落地）。
 */
export { mergeRecords } from '../../shared/recordMerger.js'
