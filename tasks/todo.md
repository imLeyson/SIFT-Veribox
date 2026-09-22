# SIFT 多问题设计收敛与探索搜索任务

- [x] 升级批量问题、答案、历史记录协议
- [x] 增加当前设计假设与轻量验证动作
- [x] 加入 Human Checkpoint 三种用户动作
- [x] 更新 Live/Mock Agent 行为与服务端防重复校验
- [x] 更新画布问题卡与状态卡
- [x] 更新 LocalStorage/API/client 测试
- [x] 完成测试、Lint、构建和浏览器流程验证
- [x] Brief 一键收敛：fast_start → 待确认方向 → 检查点
- [x] 追问中一键收敛：本地停问并保留未决项
- [x] 测试、Lint、构建和浏览器验证两条路径

## 03–08 探索路线与外部搜索

- [x] Task 1: 路线与平台计划契约模式、Zod 校验与平台注册表
- [x] Task 2: Mock/Live Agent 路线生成、起点防重、步骤约束与推荐上限
- [x] Task 3: Mock/Live Agent 平台计划生成、动态排序与中英关键词
- [x] Task 4: 服务端接口 `POST /api/routes` 与 `POST /api/platform-plan`
- [x] Task 5: Zustand v3 会话升级、路线选择、步骤切换与回退清理
- [x] Task 6: 画布卡片组件（RouteNode、StepNode、PlatformPlanNode）与 InfiniteCanvas 集成
- [x] Task 7: 外部搜索动作（一键新窗口打开、剪贴板复制反馈、跳过、替换备选来源）
- [x] Task 8: 全套自动化测试（契约、API、Store、客户端交互与端到端模拟测试）
- [x] Task 9: `npm test`、`npm run lint`、`npm run build` 全部通过

## 09-22 老师反馈落地：画布探索与确定项分支收敛引擎 (长任务)

### 阶段 0：统一现有流程与数据契约
- [x] Task 0.1: 设计 `CanvasItem`、`Branch`、`ItemStatus` (确定/不确定/舍弃) 与 `SchemeGroup` 数据契约 (Zod & TS)
- [x] Task 0.2: 升级 Zustand Store 至 v4，增加分支管理、确定项状态与持久化迁移逻辑
- [x] Task 0.3: 对齐 Human Checkpoint 确认后的“画布探索模式”入口跳转与现有能力复用
- [x] Task 0.4: 编写阶段 0 数据结构与 Store 单元测试

### 阶段 1：单人分支探索闭环 (核心 P0)
- [x] Task 1.1: 编写文字卡片节点 (`TextCardNode`)，集成“确定/不确定/舍弃”三态切换
- [x] Task 1.2: 编写图片卡片节点 (`ImageCardNode`)，支持参考图提取与视觉属性约束
- [x] Task 1.3: 实现“提取并继续探索”交互，画布生成新分支与父子拓扑连线
- [x] Task 1.4: 新增服务端接口 `POST /api/branch-explore`，支持带着继承确定项约束生成新假设
- [x] Task 1.5: 编写 Mock/Live Branch Agent 逻辑与严格隔离测试
- [x] Task 1.6: 阶段 1 全流程自动化与浏览器闭环测试（刷新恢复验证）

### 阶段 2：方案组与视觉资产沉淀
- [x] Task 2.1: 实现方案组 (`SchemeGroupNode`) 容器，支持多确定项打包、命名与折叠展开
- [x] Task 2.2: 支持将方案组作为下一轮探索分支的输入约束
- [x] Task 2.3: 升级 Dossier 提案简报，支持导出多分支与方案组对比

### 阶段 3：高约束与低约束双模式
- [x] Task 3.1: 探索入口支持“明确方向”与“探索可能”双模式
- [x] Task 3.2: 动态调节 Agent 探索发散度与收敛严格度

