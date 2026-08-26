'use strict';

const path = require('path');
const fs = require('fs');
const { nativeImage } = require('electron');

/**
 * @param {Electron.App} app
 */
function createIconUtils(app) {
  function getIconPath() {
    // __dirname is electron/modules/, so go up 2 levels to reach project root
    if (app.isPackaged) {
      return path.join(__dirname, '../../public', 'app.ico');
    }
    return path.join(__dirname, '../../public/app.ico');
  }

  function getValidIcon() {
    const iconPath = getIconPath();
    if (fs.existsSync(iconPath)) {
      return nativeImage.createFromPath(iconPath);
    }
    return null;
  }

  return { getIconPath, getValidIcon };
}

module.exports = { createIconUtils };
