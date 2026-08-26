'use strict';

/**
 * 定时提醒通知模块
 * 在上班/下班前 N 分钟发送系统通知提醒
 */

/**
 * @param {Object} opts
 * @param {Function} opts.getStorageSync
 * @param {Function} opts.setStorageSync
 * @param {Function} opts.sendNotification - sendSystemNotification(title, body)
 * @param {Object} opts.log
 * @param {Object} opts.DEFAULTS
 * @param {Object} opts.dateUtils
 */
function createReminderManager(opts) {
  const { getStorageSync, setStorageSync, sendNotification, log, DEFAULTS } = opts;
  const { getTodayString, timeToMinutes, isWorkDay } = opts.dateUtils;

  let reminderTimer = null;

  /** 写入存储（同步方式，兼容已有接口） */
  function _write(key, value) {
    if (typeof setStorageSync === 'function') {
      setStorageSync(key, value);
    } else if (typeof getStorageSync === 'function' && getStorageSync.__setter) {
      getStorageSync.__setter(key, value);
    }
  }

  function scheduleNextReminder() {
    if (reminderTimer) clearTimeout(reminderTimer);
    const delay = calculateNextReminderDelay();
    reminderTimer = setTimeout(async () => {
      try {
        const today = getTodayString();
        const lastRemindDate = getStorageSync('lastRemindDate', '');
        const remindedCheckIn = getStorageSync('remindedCheckIn', false);
        const remindedCheckOut = getStorageSync('remindedCheckOut', false);

        // 新的一天，重置提醒状态
        if (lastRemindDate !== today) {
          _write('lastRemindDate', today);
          _write('remindedCheckIn', false);
          _write('remindedCheckOut', false);
        }

        const remindEnabled = getStorageSync('remindEnabled', true);
        if (!remindEnabled) { scheduleNextReminder(); return; }

        const remindBeforeMinutes = getStorageSync('remindBeforeMinutes', 5);
        const workDays = getStorageSync('workDays', DEFAULTS.WORK_DAYS);
        const workStartTime = getStorageSync('workStartTime', DEFAULTS.WORK_START);
        const workEndTime = getStorageSync('workEndTime', DEFAULTS.WORK_END);

        if (!isWorkDay(workDays)) { scheduleNextReminder(); return; }

        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const startMin = timeToMinutes(workStartTime);
        const endMin = timeToMinutes(workEndTime);
        const remindBefore = remindBeforeMinutes;

        const records = getStorageSync('attendance_records', []);
        const todayRecord = records.find(r => r.date === today);

        // 上班提醒：上班时间前 N 分钟
        if (!remindedCheckIn && !todayRecord?.checkIn) {
          const remindStart = startMin - remindBefore;
          if (nowMin >= remindStart && nowMin < startMin) {
            _write('remindedCheckIn', true);
            log.info('Send check-in reminder');
            sendNotification(
              '⏰ 上班打卡提醒',
              `距离上班还有 ${startMin - nowMin} 分钟，请准备打卡`
            );
          }
        }

        // 下班提醒：下班时间前 N 分钟
        if (!remindedCheckOut && todayRecord?.checkIn && !todayRecord?.checkOut) {
          const remindEnd = endMin - remindBefore;
          if (nowMin >= remindEnd && nowMin < endMin) {
            _write('remindedCheckOut', true);
            log.info('Send check-out reminder');
            sendNotification(
              '⏰ 下班打卡提醒',
              `距离下班还有 ${endMin - nowMin} 分钟，请准时打卡`
            );
          }
        }
      } catch (error) {
        log.error('Reminder check failed:', { message: error.message, stack: error.stack });
      } finally {
        scheduleNextReminder();
      }
    }, delay);
  }

  function calculateNextReminderDelay() {
    const remindEnabled = getStorageSync('remindEnabled', true);
    if (!remindEnabled) return 60 * 60 * 1000;

    const remindBeforeMinutes = getStorageSync('remindBeforeMinutes', 5);
    const workDays = getStorageSync('workDays', DEFAULTS.WORK_DAYS);
    if (!isWorkDay(workDays)) return 60 * 60 * 1000;

    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const startMin = timeToMinutes(getStorageSync('workStartTime', DEFAULTS.WORK_START));
    const endMin = timeToMinutes(getStorageSync('workEndTime', DEFAULTS.WORK_END));

    const remindStart = startMin - remindBeforeMinutes;
    const remindEnd = endMin - remindBeforeMinutes;

    let minDelay = 10 * 60 * 1000;

    const diffStart = remindStart - nowMin;
    if (diffStart >= -remindBeforeMinutes && diffStart < 0) {
      minDelay = Math.min(minDelay, 60 * 1000);
    } else if (diffStart > 0 && diffStart <= 60) {
      minDelay = Math.min(minDelay, diffStart * 60 * 1000);
    } else if (diffStart > 60 && diffStart <= 180) {
      minDelay = Math.min(minDelay, 5 * 60 * 1000);
    }

    const diffEnd = remindEnd - nowMin;
    if (diffEnd >= -remindBeforeMinutes && diffEnd < 0) {
      minDelay = Math.min(minDelay, 60 * 1000);
    } else if (diffEnd > 0 && diffEnd <= 60) {
      minDelay = Math.min(minDelay, diffEnd * 60 * 1000);
    } else if (diffEnd > 60 && diffEnd <= 180) {
      minDelay = Math.min(minDelay, 5 * 60 * 1000);
    }

    return minDelay;
  }

  function start() {
    if (reminderTimer) clearTimeout(reminderTimer);
    scheduleNextReminder();
    log.info('Reminder scheduler started');
  }

  function stop() {
    if (reminderTimer) {
      clearTimeout(reminderTimer);
      reminderTimer = null;
      log.info('Reminder scheduler stopped');
    }
  }

  return { start, stop };
}

module.exports = { createReminderManager };
