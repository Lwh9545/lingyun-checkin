/**
 * 统一存储抽象模块
 * 支持主进程（electron-store）和渲染进程（localStorage）
 */

import { AttendanceRecord, AutoCheckState } from './types';

/**
 * 存储适配器接口
 */
export interface StorageAdapter {
  get<T>(key: string, defaultValue: T): T;
  set<T>(key: string, value: T): void;
  delete(key: string): void;
  has(key: string): boolean;
  clear(): void;
}

/**
 * 创建存储适配器
 * @param adapter 存储实现
 */
export function createStorage(adapter: StorageAdapter) {
  return {
    /**
     * 获取考勤记录
     */
    getAttendanceRecords(): AttendanceRecord[] {
      return adapter.get<AttendanceRecord[]>('attendance_records', []);
    },

    /**
     * 保存考勤记录
     */
    setAttendanceRecords(records: AttendanceRecord[]): void {
      adapter.set('attendance_records', records);
    },

    /**
     * 获取自动打卡状态
     */
    getAutoCheckState(): AutoCheckState {
      return {
        lastAutoCheckDate: adapter.get('lastAutoCheckDate', ''),
        autoCheckInExecuted: adapter.get('autoCheckInExecuted', false),
        autoCheckOutExecuted: adapter.get('autoCheckOutExecuted', false),
        lastCheckInDate: adapter.get('lastCheckInDate', ''),
        lastCheckOutDate: adapter.get('lastCheckOutDate', '')
      };
    },

    /**
     * 设置自动打卡状态
     */
    setAutoCheckState(state: Partial<AutoCheckState>): void {
      Object.entries(state).forEach(([key, value]) => {
        adapter.set(key, value);
      });
    },

    /**
     * 获取单个配置项
     */
    getConfig<T>(key: string, defaultValue: T): T {
      return adapter.get(key, defaultValue);
    },

    /**
     * 设置单个配置项
     */
    setConfig<T>(key: string, value: T): void {
      adapter.set(key, value);
    },

    /**
     * 获取布尔配置
     */
    getBoolean(key: string, defaultValue: boolean): boolean {
      return adapter.get(key, defaultValue);
    },

    /**
     * 获取数字配置
     */
    getNumber(key: string, defaultValue: number): number {
      return adapter.get(key, defaultValue);
    },

    /**
     * 获取字符串配置
     */
    getString(key: string, defaultValue: string): string {
      return adapter.get(key, defaultValue);
    },

    /**
     * 获取数组配置
     */
    getArray<T>(key: string, defaultValue: T[]): T[] {
      return adapter.get(key, defaultValue);
    },

    /**
     * 检查键是否存在
     */
    has(key: string): boolean {
      return adapter.has(key);
    },

    /**
     * 删除键
     */
    delete(key: string): void {
      adapter.delete(key);
    },

    /**
     * 清空存储
     */
    clear(): void {
      adapter.clear();
    },

    // 原始适配器方法（保留兼容性）
    getRaw<T>(key: string, defaultValue?: T): T | undefined {
      return adapter.get(key, defaultValue);
    },

    setRaw<T>(key: string, value: T): void {
      adapter.set(key, value);
    }
  };
}

/**
 * Electron 主进程存储适配器（使用 electron-store）
 */
export function createElectronStorageAdapter(store: any): StorageAdapter {
  return {
    get: (key: string, defaultValue?: any) => store.get(key, defaultValue),
    set: (key: string, value: any) => store.set(key, value),
    delete: (key: string) => store.delete(key),
    has: (key: string) => store.has(key),
    clear: () => store.clear()
  };
}

/**
 * 渲染进程存储适配器（使用 localStorage）
 */
export function createLocalStorageAdapter(): StorageAdapter {
  return {
    get: (key: string, defaultValue?: any) => {
      const value = localStorage.getItem(key);
      if (value === null) return defaultValue;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    },
    set: (key: string, value: any) => {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    },
    delete: (key: string) => localStorage.removeItem(key),
    has: (key: string) => localStorage.getItem(key) !== null,
    clear: () => localStorage.clear()
  };
}
