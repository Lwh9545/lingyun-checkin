'use strict';

/**
 * System notification module
 */

const { Notification } = require('electron');

/**
 * @param {Object} opts
 * @param {Function} opts.getValidIcon
 * @param {Function} opts.getMainWindow
 * @param {Function} opts.createWindow
 * @param {Object} opts.log
 */
function createNotificationManager(opts) {
  function send(title, body, options = {}) {
    try {
      if (!Notification.isSupported()) {
        opts.log.warn('System notification not supported');
        return false;
      }
      const icon = opts.getValidIcon();
      const notification = new Notification({
        title, body,
        icon: icon,
        silent: options.silent || false,
        urgency: options.urgency || 'normal',
        timeoutType: options.timeoutType || 'default'
      });
      notification.show();
      notification.on('click', () => {
        const { app } = require('electron');
        if (app.isQuitting) return;
        const win = opts.getMainWindow();
        if (win) {
          win.show();
          win.focus();
        } else {
          opts.createWindow();
        }
      });
      return true;
    } catch (error) {
      opts.log.error('Notification failed:', error);
      return false;
    }
  }

  return { send };
}

module.exports = { createNotificationManager };
