"use strict";
/**
 * 统一存储抽象模块
 * 支持主进程（electron-store）和渲染进程（localStorage）
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStorage = createStorage;
exports.createElectronStorageAdapter = createElectronStorageAdapter;
exports.createLocalStorageAdapter = createLocalStorageAdapter;
/**
 * 创建存储适配器
 * @param adapter 存储实现
 */
function createStorage(adapter) {
    return {
        /**
         * 获取考勤记录
         */
        getAttendanceRecords() {
            return adapter.get('attendance_records', []);
        },
        /**
         * 保存考勤记录
         */
        setAttendanceRecords(records) {
            adapter.set('attendance_records', records);
        },
        /**
         * 获取自动打卡状态
         */
        getAutoCheckState() {
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
        setAutoCheckState(state) {
            Object.entries(state).forEach(([key, value]) => {
                adapter.set(key, value);
            });
        },
        /**
         * 获取单个配置项
         */
        getConfig(key, defaultValue) {
            return adapter.get(key, defaultValue);
        },
        /**
         * 设置单个配置项
         */
        setConfig(key, value) {
            adapter.set(key, value);
        },
        /**
         * 获取布尔配置
         */
        getBoolean(key, defaultValue) {
            return adapter.get(key, defaultValue);
        },
        /**
         * 获取数字配置
         */
        getNumber(key, defaultValue) {
            return adapter.get(key, defaultValue);
        },
        /**
         * 获取字符串配置
         */
        getString(key, defaultValue) {
            return adapter.get(key, defaultValue);
        },
        /**
         * 获取数组配置
         */
        getArray(key, defaultValue) {
            return adapter.get(key, defaultValue);
        },
        /**
         * 检查键是否存在
         */
        has(key) {
            return adapter.has(key);
        },
        /**
         * 删除键
         */
        delete(key) {
            adapter.delete(key);
        },
        /**
         * 清空存储
         */
        clear() {
            adapter.clear();
        },
        // 原始适配器方法（保留兼容性）
        getRaw(key, defaultValue) {
            return adapter.get(key, defaultValue);
        },
        setRaw(key, value) {
            adapter.set(key, value);
        }
    };
}
/**
 * Electron 主进程存储适配器（使用 electron-store）
 */
function createElectronStorageAdapter(store) {
    return {
        get: (key, defaultValue) => store.get(key, defaultValue),
        set: (key, value) => store.set(key, value),
        delete: (key) => store.delete(key),
        has: (key) => store.has(key),
        clear: () => store.clear()
    };
}
/**
 * 渲染进程存储适配器（使用 localStorage）
 */
function createLocalStorageAdapter() {
    return {
        get: (key, defaultValue) => {
            const value = localStorage.getItem(key);
            if (value === null)
                return defaultValue;
            try {
                return JSON.parse(value);
            }
            catch {
                return value;
            }
        },
        set: (key, value) => {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        },
        delete: (key) => localStorage.removeItem(key),
        has: (key) => localStorage.getItem(key) !== null,
        clear: () => localStorage.clear()
    };
}
