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
