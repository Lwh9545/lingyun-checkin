/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'shared')
    }
  },
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // exceljs 为按需动态 import（导出功能才加载），其独立 chunk 体积大属预期，抬警告线消除噪音
    chunkSizeWarningLimit: 1024
  },
  server: {
    // 仅用于 `vite dev` 前端预览服务器，不影响 Electron（Electron 加载 dist/index.html，
    // 其 CSP 由 index.html 的 <meta> 标签控制，已严格化移除 unsafe-eval）。
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws://localhost:* https://timor.tech https://*.timor.tech"
    }
  },
  test: {
    // E2E 归 playwright（npm run test:e2e），单测不收集 e2e/ 目录
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: ['src/**/*.{js,ts}', 'electron/**/*.js', 'shared/**/*.js'],
      exclude: [
        'src/types/**',
        'src/main.ts',
        'src/main.js',
        'src/views/**',
        'src/components/**',
        'src/router/**',
        'src/stores/cloud.js',
        'src/composables/**',
        'src/utils/errorUtils.ts',
        'src/utils/recordUtils.ts',
        'src/utils/storageUtils.ts',
        'electron/main.js',
        'electron/modules/auto-startup.js',
        'electron/modules/cloud-ipc.js',
        'electron/modules/file-manager.js',
        'electron/modules/ipc-handlers.js',
        'electron/modules/lifecycle.js',
        'electron/modules/notify.js',
        'electron/modules/tray.js',
        'electron/modules/updater.js',
        'electron/modules/window.js',
        'electron/modules/icon-utils.js',
        'electron/modules/notification.js',
        'shared/constants.js'
      ],
      thresholds: {
        lines: 35,
        functions: 25,
        branches: 25,
        statements: 35
      }
    }
  }
})
