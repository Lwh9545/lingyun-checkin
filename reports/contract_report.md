# 契约逆向工程报告 — tryAutoCheckIn

> 产物来源：legacy-refactor-master 步骤 1（step1_contract_reverse.md）
> 目标：`src/stores/attendance.js#tryAutoCheckIn(silent = false)`
> 度量：圈复杂度 **V(G) = 13**（tools/cc_metric.py，全项目最高）
> 分析模式：纯静态结构分析，**不含重构建议**

---

## 1. 数据流地图

```
┌─────────────────────────────────────────────────────────────┐
│ 调用方                                                        │
│  ① Checkin.vue 定时器/UI 触发（silent=false）                  │
│  ② 其他模块按需调用（silent=true 静默模式）                     │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Store 层：attendance.js#tryAutoCheckIn(silent) → boolean     │
│  入参：silent（是否静默，默认 false）                          │
│  出参：true=自动打卡成功 / false=跳过或失败                     │
│  内部依赖链：                                                 │
│    a) configStore.autoCheckIn / workDays / getConfig()       │
│    b) dateUtils.getTodayString()                              │
│    c) storageUtils.getStorage(LAST_CHECK_IN_DATE)             │
│    d) store.todayRecords（内存 computed，来自 records）         │
│    e) attendanceUtils.isInCheckWindow('上班', config)         │
│    f) store.handleCheck() → { success, type, status, time }   │
│    g) storageUtils.setStorage(LAST_CHECK_IN_DATE)             │
│    h) window.electronAPI.notification.send()  ⚠️ 渲染桥       │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 副作用出口                                                   │
│  ① localStorage：LAST_CHECK_IN_DATE（今日已执行标记）          │
│  ② 打卡记录写入：handleCheck() 内部完成（get→merge→save）      │
│  ③ 系统通知：electronAPI.notification.send（仅 !silent）      │
└─────────────────────────────────────────────────────────────┘
```

**数据流小结**：读配置 → 读存储标记 → 读今日记录 → 判定窗口 → 执行打卡 → 写标记 → 通知。主副作用为「打卡记录 + 每日执行标记」。

## 2. 存储边界与竞态特征

| 检查项 | 现状 | 说明 |
|---|---|---|
| 每日执行标记 | `LAST_CHECK_IN_DATE`，先读后写 | 防重复执行的**主要闸门** |
| 内存状态 | `todayRecords` 是内存 computed | 与存储可能不一致（未 load 时） |
| 打卡写入 | `handleCheck()` 内部 get→merge→save | 有 mergeRecords 防覆盖 |
| 通知 | 渲染桥调用，`silent` 控制 | 异常时静默失败 |

### 竞态风险点（事实陈述）
1. `LAST_CHECK_IN_DATE` 的**先读后写**非原子：两个定时器并发触发时可能重复打卡（窗口期内）。但 `autoCheckInExecuted` 式标记只存在主进程（electron/modules/auto-check.js），渲染侧仅此一处。
2. `todayRecords` 内存态若滞后于存储，`todayRecords.value?.checkIn` 判空可能误判（重复打卡）。但 handleCheck 内部重新 `getAttendanceRecords` + merge，落库前有二次防护。

## 3. 业务不变式（硬约束）

| # | 不变式 | 由哪段逻辑固化 | 类型 |
|---|---|---|---|
| I1 | `autoCheckIn=false` → 必须返回 false，零副作用 | 第 1 个守卫 | 配置闸门 |
| I2 | 非工作日 → 返回 false | `isWorkDay(workDays)` 守卫 | 业务规则 |
| I3 | 今日已执行过（LAST_CHECK_IN_DATE===today）→ 返回 false | 存储标记守卫 | 防重 |
| I4 | 今日已有 checkIn → 返回 false | `todayRecords?.checkIn` 守卫 | 防重 |
| I5 | 不在打卡窗口 → 返回 false | `isInCheckWindow('上班')` 守卫 | 业务规则 |
| I6 | 守卫全过 → 调 `handleCheck()`，**成功才**写标记+通知 | `result?.success` 分支 | 一致性 |
| I7 | `silent=true` → 不发通知 | `!silent && electronAPI...` | 静默契约 |
| I8 | 通知仅当 `window.electronAPI?.notification` 存在 | 存在性检查 | 容错 |
| I9 | 任何异常 → catch 吞掉，返回 false，**不向上抛** | try/catch | 容错 |
| I10 | 返回 true 时，LAST_CHECK_IN_DATE 必已写入 today | 成功分支顺序 | 可恢复性 |

## 4. 复杂度分布（重构安全边界）

- 守卫链（I1–I5）：5 个 if —— **纯判定，可整体提取而不改语义**
- 成功分支（I6–I8）：1 个 if + 2 个 `&&` + 1 个 `?.` —— **可提取通知逻辑**
- 容错层（I9）：1 个 catch —— 保持不动

> 本报告仅作静态结构分析，**不包含任何重构建议**。下一步进入步骤 2：将 I1–I10 固化为特征测试断言。
