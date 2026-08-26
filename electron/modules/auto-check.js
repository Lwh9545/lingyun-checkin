"use strict";
/**
 * 自动打卡管理模块（TypeScript + 依赖注入）
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAutoCheckManager = createAutoCheckManager;
const types_js_1 = require("../../shared/types.js");
const dateUtils_js_1 = require("../../shared/dateUtils.js");
// 为兼容性使用大写命名
const DEFAULTS = {
    WORK_START: types_js_1.DEFAULT_CONFIG.workStartTime,
    WORK_END: types_js_1.DEFAULT_CONFIG.workEndTime,
    WORK_DAYS: types_js_1.DEFAULT_CONFIG.workDays
};
/**
 * 创建自动检查管理器（工厂模式）
 */
function createAutoCheckManager(opts) {
    const { getStorageSync, setStorageSync, getMainWindow, sendNotification, log } = opts;
    let autoCheckTimer = null;
    /**
     * 启动自动检查调度器
     */
    function start() {
        if (autoCheckTimer) {
            clearTimeout(autoCheckTimer);
        }
        // 首次立即执行检查
        doAutoCheck();
        log.info('Auto-check scheduler started');
    }
    /**
     * 执行自动检查
     * 只处理自动上班打卡（用户要求：取消自动下班打卡，关机时才签退）
     */
    async function doAutoCheck() {
        try {
            const today = (0, dateUtils_js_1.getTodayString)();
            resetDailyStateIfNeeded(today);
            const { autoCheckIn, workDays, workStartTime, autoCheckInOffset } = getSettings();
            const targetCheckInTime = (0, dateUtils_js_1.calculateTargetTime)(workStartTime, autoCheckInOffset);
            if ((0, dateUtils_js_1.isWorkDay)(workDays)) {
                const records = getStorageSync('attendance_records', []);
                const todayRecord = records.find(r => r.date === today);
                if (autoCheckIn && targetCheckInTime && (0, dateUtils_js_1.isTimeToCheck)(targetCheckInTime)) {
                    await handleAutoCheckIn(todayRecord);
                }
            }
            scheduleNextAutoCheck();
        }
        catch (error) {
            log.error('Auto-check failed:', { message: error.message, stack: error.stack });
            scheduleNextAutoCheck();
        }
    }
    /**
     * 调度下一次检查（智能频率）
     * 只针对自动上班打卡
     */
    function scheduleNextAutoCheck() {
        if (autoCheckTimer) {
            clearTimeout(autoCheckTimer);
        }
        const delay = calculateNextCheckDelay();
        autoCheckTimer = setTimeout(() => doAutoCheck(), delay);
    }
    /**
     * 计算下次检查的延迟时间（毫秒）
     * 根据距离上班打卡时间动态调整频率
     */
    function calculateNextCheckDelay() {
        const { workStartTime, autoCheckIn, autoCheckInOffset } = getSettings();
        const now = new Date();
        const currentMinutes = now.getHours() * types_js_1.TIME.MINUTES_PER_HOUR + now.getMinutes();
        let minDelay = types_js_1.TIME.MS_PER_MINUTE * 10;
        if (autoCheckIn) {
            const targetCheckInTime = (0, dateUtils_js_1.calculateTargetTime)(workStartTime, autoCheckInOffset);
            if (targetCheckInTime) {
                const targetMinutes = (0, dateUtils_js_1.timeToMinutes)(targetCheckInTime);
                const diff = targetMinutes - currentMinutes;
                minDelay = getDelayByDiff(diff, minDelay);
            }
        }
        return minDelay;
    }
    /**
     * 根据距离打卡时间的差值计算延迟
     */
    function getDelayByDiff(diff, currentMin) {
        if (diff < -types_js_1.TIME.MINUTES_PER_HOUR) {
            return types_js_1.TIME.MS_PER_MINUTE * 60;
        }
        if (diff < 0) {
            return types_js_1.TIME.MS_PER_MINUTE;
        }
        if (diff <= 10) {
            return types_js_1.TIME.MS_PER_MINUTE;
        }
        if (diff <= 30) {
            return types_js_1.TIME.MS_PER_MINUTE * 5;
        }
        return currentMin;
    }
    /**
     * 停止自动检查调度器
     */
    function stop() {
        if (autoCheckTimer) {
            clearTimeout(autoCheckTimer);
            autoCheckTimer = null;
        }
    }
    /**
     * 检查日期是否需要重置每日状态
     */
    function resetDailyStateIfNeeded(today) {
        const lastCheckDate = getStorageSync('lastAutoCheckDate', '');
        if (lastCheckDate !== today) {
            setStorageSync('lastAutoCheckDate', today);
            setStorageSync('autoCheckInExecuted', false);
            setStorageSync('autoCheckOutExecuted', false);
        }
    }
    /**
     * 获取当前设置
     */
    function getSettings() {
        return {
            autoCheckIn: getStorageSync('autoCheckIn', false),
            workDays: getStorageSync('workDays', types_js_1.DEFAULT_CONFIG.workDays),
            workStartTime: getStorageSync('workStartTime', types_js_1.DEFAULT_CONFIG.workStartTime),
            workEndTime: getStorageSync('workEndTime', types_js_1.DEFAULT_CONFIG.workEndTime),
            autoCheckInOffset: getStorageSync('autoCheckInOffset', 0)
        };
    }
    /**
     * 处理自动上班打卡
     * 主进程直接写入存储，不依赖渲染进程
     */
    async function handleAutoCheckIn(todayRecord) {
        const autoCheckInExecuted = getStorageSync('autoCheckInExecuted', false);
        const hasCheckedIn = todayRecord && todayRecord.checkIn;
        if (!autoCheckInExecuted && !hasCheckedIn) {
            setStorageSync('autoCheckInExecuted', true);
            const success = await directCheckIn();
            if (success) {
                log.info('Auto check-in triggered');
                sendNotification('自动签到成功', `签到时间: ${(0, dateUtils_js_1.formatTimeShort)()}`);
            }
        }
    }
    /**
     * 直接执行上班打卡（不依赖渲染进程）
     */
    async function directCheckIn() {
        try {
            const today = (0, dateUtils_js_1.getTodayString)();
            const currentTime = (0, dateUtils_js_1.formatTimeShort)();
            const records = getStorageSync('attendance_records', []);
            const todayIndex = records.findIndex(r => r.date === today);
            if (todayIndex > -1) {
                if (records[todayIndex].checkIn) {
                    log.info('Direct check-in: already checked in');
                    return false;
                }
                records[todayIndex].checkIn = currentTime;
            }
            else {
                records.push({
                    date: today,
                    checkIn: currentTime,
                    checkOut: '',
                    status: 'normal'
                });
            }
            await setStorageSync('attendance_records', records);
            log.info(`Direct check-in: SUCCESS, saved checkIn=${currentTime}`);
            return true;
        }
        catch (error) {
            log.error('Direct check-in failed:', { message: error.message, stack: error.stack });
            return false;
        }
    }
    /**
     * 直接执行下班打卡（不依赖渲染进程）
     */
    async function directCheckOut() {
        try {
            const today = (0, dateUtils_js_1.getTodayString)();
            const currentTime = (0, dateUtils_js_1.formatTimeShort)();
            const records = getStorageSync('attendance_records', []);
            const todayIndex = records.findIndex(r => r.date === today);
            if (todayIndex === -1) {
                log.error('Direct check-out: no record found for today, creating one with default check-in');
                const defaultCheckInTime = getStorageSync('workStartTime', types_js_1.DEFAULT_CONFIG.workStartTime);
                records.push({
                    date: today,
                    checkIn: defaultCheckInTime,
                    checkOut: currentTime,
                    status: 'normal'
                });
                await setStorageSync('attendance_records', records);
                log.info(`Direct check-out: created new record, checkIn=${defaultCheckInTime}, checkOut=${currentTime}`);
                return true;
            }
            if (records[todayIndex].checkOut) {
                log.info('Direct check-out: already checked out');
                return false;
            }
            if (!records[todayIndex].checkIn) {
                const defaultCheckInTime = getStorageSync('workStartTime', types_js_1.DEFAULT_CONFIG.workStartTime);
                records[todayIndex].checkIn = defaultCheckInTime;
                log.info(`Direct check-out: set default checkIn=${defaultCheckInTime}`);
            }
            records[todayIndex].checkOut = currentTime;
            await setStorageSync('attendance_records', records);
            log.info(`Direct check-out: SUCCESS, saved checkOut=${currentTime}`);
            sendNotification('自动签退成功', `签退时间: ${currentTime}`);
            return true;
        }
        catch (error) {
            log.error('Direct check-out failed:', { message: error.message, stack: error.stack });
            return false;
        }
    }
    /**
     * 启动时检查（开机自启场景）
     * 主进程直接写入存储，不依赖渲染进程
     * 放宽时间窗口：只要到达/超过目标打卡时间，且是工作日，就尝试打卡
     */
    function checkOnStartup() {
        const today = (0, dateUtils_js_1.getTodayString)();
        const lastCheckDate = getStorageSync('lastAutoCheckDate', '');
        // 跨天重置状态
        if (lastCheckDate !== today) {
            setStorageSync('lastAutoCheckDate', today);
            setStorageSync('autoCheckInExecuted', false);
            setStorageSync('autoCheckOutExecuted', false);
        }
        const { autoCheckIn, workDays, workStartTime, workEndTime, autoCheckInOffset } = getSettings();
        const now = new Date();
        const currentMinutes = now.getHours() * types_js_1.TIME.MINUTES_PER_HOUR + now.getMinutes();
        const targetCheckInTime = (0, dateUtils_js_1.calculateTargetTime)(workStartTime, autoCheckInOffset);
        const targetMinutes = targetCheckInTime ? (0, dateUtils_js_1.timeToMinutes)(targetCheckInTime) : -1;
        const isWorkDayToday = (0, dateUtils_js_1.isWorkDay)(workDays);
        // 打印启动配置，方便排查
        log.info('Startup check config:', {
            today,
            now: (0, dateUtils_js_1.formatTimeShort)(now),
            currentMinutes,
            autoCheckIn,
            workDays,
            workStartTime,
            workEndTime,
            autoCheckInOffset,
            targetCheckInTime,
            targetMinutes,
            isWorkDayToday,
            todayDayOfWeek: now.getDay()
        });
        if (!isWorkDayToday) {
            log.info('Startup check: not a work day');
            return;
        }
        const records = getStorageSync('attendance_records', []);
        const todayRecord = records.find(r => r.date === today);
        const win = getMainWindow();
        // 上班打卡检查：放宽时间窗口
        // 当前时间 >= 目标打卡时间 就触发（防止开机稍晚错过窗口）
        // 同时限制在目标时间后 4 小时内（避免晚间重启误打卡）
        if (autoCheckIn && targetCheckInTime) {
            const diff = currentMinutes - targetMinutes;
            const FOUR_HOURS = types_js_1.TIME.MINUTES_PER_HOUR * 4;
            if (diff >= 0 && diff <= FOUR_HOURS) {
                const hasCheckedIn = todayRecord && todayRecord.checkIn;
                const autoCheckInExecuted = getStorageSync('autoCheckInExecuted', false);
                if (!autoCheckInExecuted && !hasCheckedIn) {
                    setStorageSync('autoCheckInExecuted', true);
                    log.info(`Startup check-in triggered (diff=${diff}min within 4h window)`);
                    // 异步执行，不阻塞启动
                    directCheckIn().then(success => {
                        if (success) {
                            sendNotification('开机自动签到成功', `签到时间: ${(0, dateUtils_js_1.formatTimeShort)()}`);
                            if (win && win.webContents && !win.webContents.isDestroyed()) {
                                win.webContents.send('trigger-auto-check-in-done');
                            }
                        }
                    }).catch(err => {
                        log.error('Startup check-in direct write failed:', err);
                    });
                }
                else {
                    log.info(`Startup check: skipped (executed=${autoCheckInExecuted}, hasCheckedIn=${!!hasCheckedIn})`);
                }
            }
            else {
                log.info(`Startup check: time out of auto-check-in window (diff=${diff}min, allowed 0~${FOUR_HOURS}min)`);
            }
        }
        else {
            log.info(`Startup check: autoCheckIn=${autoCheckIn}, targetCheckInTime=${targetCheckInTime}`);
        }
    }
    /**
     * 关机时自动打卡（用户要求：关电脑就自动下班打卡）
     * 移除之前"下班前1小时才签退"的限制
     * 只要是工作日且尚未签退，就直接签退
     * @returns {{ executed: boolean, success: boolean, reason: string }} 详细执行结果（方便上层判断是否需要重复执行）
     */
    async function shutdownCheckOut() {
        const now = new Date();
        const today = (0, dateUtils_js_1.getTodayString)();
        const currentTime = (0, dateUtils_js_1.formatTimeShort)(now);
        let result = { executed: false, success: false, reason: 'unknown' };
        try {
            const autoCheckOutOnShutdown = getStorageSync('autoCheckOutOnShutdown', false);
            const workDays = getStorageSync('workDays', types_js_1.DEFAULT_CONFIG.workDays);
            const workStartTime = getStorageSync('workStartTime', types_js_1.DEFAULT_CONFIG.workStartTime);
            // 打印关机签退的完整上下文，方便排查
            log.info('=== Shutdown check-out START ===');
            log.info('  shutdownCheckOut context:', {
                today, currentTime, dayOfWeek: now.getDay(),
                autoCheckOutOnShutdown, workDays, workStartTime
            });
            if (!autoCheckOutOnShutdown) {
                result.reason = 'disabled by settings (autoCheckOutOnShutdown=false)';
                log.info('Shutdown check-out: ', result.reason);
                log.info('=== Shutdown check-out END ===');
                return result;
            }
            if (!(0, dateUtils_js_1.isWorkDay)(workDays)) {
                result.reason = 'not a work day';
                log.info('Shutdown check-out: ', result.reason);
                log.info('=== Shutdown check-out END ===');
                return result;
            }
            const records = getStorageSync('attendance_records', []);
            const todayRecord = records.find(r => r.date === today);
            const hasCheckIn = todayRecord && todayRecord.checkIn;
            const hasCheckOut = todayRecord && todayRecord.checkOut;
            log.info('  today record state:', {
                hasCheckIn, checkIn: todayRecord?.checkIn || '',
                hasCheckOut, checkOut: todayRecord?.checkOut || ''
            });
            if (!todayRecord) {
                log.info('Shutdown check-out: no today record, will create one with default check-in');
            }
            else if (hasCheckOut) {
                result.reason = 'already checked out';
                log.info('Shutdown check-out: ', result.reason);
                log.info('=== Shutdown check-out END ===');
                return result;
            }
            result.executed = true;
            const success = await directCheckOut();
            result.success = success;
            result.reason = success ? 'direct check-out succeeded' : 'direct check-out returned false';
            log.info(`=== Shutdown check-out END: success=${success}, reason=${result.reason} ===`);
            return result;
        }
        catch (error) {
            result.reason = `exception: ${error.message}`;
            log.error('Shutdown check-out FAILED:', { message: error.message, stack: error.stack });
            log.info('=== Shutdown check-out END with exception ===');
            return result;
        }
    }
    return {
        start,
        stop,
        checkOnStartup,
        shutdownCheckOut
    };
}
