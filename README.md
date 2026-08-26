# 灵韵考勤打卡 - 桌面版

一个简单易用的桌面考勤打卡应用，基于 Electron + Vue 3 开发。

## 功能特性

- ✅ 上班/下班打卡
- 📊 打卡记录查看
- 📈 月度统计
- 📥 Excel 导出
- ⚙️ 工作时间设置
- 📅 工作日自定义
- 💾 本地数据存储

## 安装依赖

```bash
npm install
```

## 开发模式

```bash
npm run electron:dev
```

## 构建应用

### 开发构建
```bash
npm run build
```

### 打包为 EXE
```bash
npm run electron:build
```

## 项目结构

```
desktop-app/
├── electron/          # Electron 主进程
│   ├── main.js       # 主进程入口
│   └── preload.js    # 预加载脚本
├── public/           # 静态资源
├── src/
│   ├── stores/       # Pinia 状态管理
│   ├── utils/        # 工具函数
│   ├── views/        # 页面组件
│   ├── App.vue       # 根组件
│   ├── main.js       # 应用入口
│   └── router/       # 路由配置
├── index.html        # HTML 模板
├── vite.config.js    # Vite 配置
└── package.json      # 项目配置
```

## 数据存储

应用数据存储在用户目录下：
- Windows: `%APPDATA%/灵韵考勤/storage.json`
- macOS: `~/Library/Application Support/灵韵考勤/storage.json`
- Linux: `~/.config/灵韵考勤/storage.json`

## 技术栈

- **Electron**: 桌面应用框架
- **Vue 3**: 前端框架
- **Pinia**: 状态管理
- **Vue Router**: 路由管理
- **Vite**: 构建工具
- **XLSX**: Excel 导出

## License

MIT
