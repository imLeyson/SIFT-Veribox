# SIFT 产品需求文档 v4.0

## 多分支设计推演与多人协同工作台（正式基线）

- **产品代号**：SIFT (Veribox MVP)
- **文档版本**：v4.0 (2026-09-27 深度对齐版)
- **更新时间**：2026-09-27 21:30
- **适用工程**：`veribox-mvp`
- **线上环境**：`https://veribox-mvp.vercel.app`
- **当前工程质量**：全链路 31 个测试套件，**172/172 自动化用例 100% 绿灯通过**

---

## 0. 版本背景与核心命题

SIFT 历经从早期“单线程线性问答”到“画布为核心（Canvas-as-Core）”的彻底重构。现已演进为**面向专业设计团队的可持续生长、支持多分支发散、跨卡片杂交合成、具备实时多人协同的视觉策略工作台**。

本版产品的根本使命不是强制用户完成一条封闭的“AI 打分或生产参数生成”流水线，而是帮助设计团队在前期（Day 0 模糊发散与策略收敛）维护一张**有来源、有分支、可追溯、可协同的视觉推演网络**：
- **AI 的职责**：拓展假设、提炼维度、自适应激发、无偏见比较、记录血统关系；
- **设计师的权利**：自主定义主语、随时就地编辑、三态决策（锁定/存疑/废弃）、自由连线杂交、发起多人跟随评审。

---

## 1. 核心设计原则（Core Principles）

1. **画布即核心（Canvas-as-Core）**：无限画布是设计思考与协同的唯一主舞台。所有推演、节点状态、连接关系直接在画布上展开，废弃割裂的右侧多窗口对话框。
2. **流程自由分支（Multi-branch Forking）**：允许存在多个 0 简报、1 视觉判断、2 策略基准与 3 主题卡片，不设单一主路径。
3. **连接产生语义（Semantic Graph）**：连线明确承载“基于、比较、融合、深化、参考、反例”等意图，连接后由用户显式触发合成，不搞暗中消耗。
4. **生成血统严格可溯（Immutable Lineage Traceability）**：每一张合成卡片都记录明确的上游来源卡片 ID、输入版本号、生成时间与创意透镜维度，杜绝无法解释的黑盒生成。
5. **主题自适应与去偏见（Adaptive & Unbiased Concepts）**：
   - 彻底废除预设的“固化三套模板词”；
   - 引入动态创意透镜（Creative Lenses），根据 Brief 语义、用户确立的约束动态匹配形态、材质、叙事、工艺等自适应维度；
   - 彻底移除“AI 主推方案”标记，严禁 AI 替设计师做主观裁决。
6. **多人协同所见即所得（Real-time Multiplayer Presence）**：
   - 支持跨端秒级状态同步、Figma 级视角跟随（Follow Mode）、卡片编辑感知光环（Awareness Ring）；
   - 具备序列游标（cursor）与版本乐观锁（revision），平滑处理网络并发冲突。
7. **策略顾问克制辅助（Non-intrusive Advisor）**：对话历史按项目严格隔离与持久化；建议以引用卡片为主，任何写操作需用户二次确认，禁止越权改写画布。

---

## 2. 核心对象与节点系统

### 2.1 画布三大对象体系

1. **流水线推演卡片**：
   - `00 简报节点 (Brief)`：不可变主语、核心约束、设计目标、支持参考图与中文 IME 平滑输入；
   - `01 视觉抉择 (Ask)`：关键视觉两极对照，记录已确认/存疑/跳过等真实偏好；
   - `02 策略基准 (Direction)`：固化设计意图、优先级、反向雷区与设计原则；
   - `03 设计主题 (Route/Theme)`：去模板化自适应概念卡，输出视觉主张、母题、差异化画面与风险；
   - `04 视点推进 (Step/Viewpoint)`：将主题转化为具体观察切面、材质/形态推敲要点；
   - `05 跨平台灵感检索 (Search)`：直达 17 个设计平台（Dezeen、Behance等），自动注入 `-mockup` 去噪公式。
2. **自由创作与辅助卡片**：
   - `空白合成卡 (Blank/Synthesis Node)`：用于多卡片连线后的聚合推演容器；
   - `设计便签 (Sticky Note)`：支持就地多色便签、协同编辑与实时输入防抖；
   - `参考图片卡 (Image Card)`：支持全局粘贴（Ctrl+V / Cmd+V）、拖拽上传、调色板颜色提取；
   - `概念画面生成卡 (ImageGen Node)`：将主题概念转化为多视角画面假设。
3. **全局辅助层**：
   - `策略顾问 (Strategy Advisor)`：项目级持久化上下文助手，带卡片引用与操作草案；
   - `提案收敛与标记 (Proposal Curation)`：支持喜欢（Favorite）、待审（Review）、反例（Counterexample）卡片标签过滤。

---

## 3. 核心交互工作流

### 3.1 自由发散与多分支链路

```text
[00 简报 A (材质维度)] ──> [01 视觉] ──> [02 策略] ──> [03 主题 A1] ──┐
                                                    └─> [03 主题 A2] ──┼─> [空白卡: 杂交合成] ──> [新主题/新策略]
[00 简报 B (场景维度)] ──> [01 视觉] ──> [02 策略] ──> [03 主题 B1] ──┘         │
                                                                                 └─> [跨平台精准灵感检索]
```

- **非线性创建**：画布支持从任意阶段添加分支、复制卡片，保留父子关系；
- **双击就地编辑（Inline Editing）**：卡片标题、描述均可直接双击编辑并同步下游；
- **三态决策引擎**：设计师随时标记卡片为“确认锁定”、“存疑待定”或“废弃雷区”，系统据此动态更新全局推理边界。

### 3.2 跨卡片杂交合成（Card Synthesis）

当设计师将 1 张或多张卡片连线至“空白卡”时，触发合成协议：
1. **单卡连线**：触发深度视点推演、变奏主题或针对性检索词；
2. **双卡连线（双主题融合/图文融合）**：自动提取两端的共性基底、碰撞冲突点，生成跨界杂交概念与融合主题；
3. **三卡及以上连线**：首先生成“方案矩阵对比与取舍建议”，再由设计师确认是否执行综合收敛；
4. **合成结果规范**：所有合成卡片在头部悬浮展示“来源卡片列表”，支持一键跳转溯源。

### 3.3 灵感检索 0 阻力直达

- 连线至“灵感检索”卡片后，**直接展示跨平台检索工作台**；
- 彻底剔除历史遗留的“选择此主题，开始视点探索”多余确认环节；
- 自动化生成基于 17 个设计平台的精准查询词与 `-mockup -template` 去噪代码，支持一键直达外部平台与复制。

---

## 4. 多人实时协同与冲突控制机制

### 4.1 混合通信架构

系统采用 **“BroadcastChannel 本地广播（~2ms） + HTTP 增量轮询与快照分发（450ms~2500ms）”** 混合架构：
- **同机多标签页**：通过浏览器原生 `BroadcastChannel` 达成零延迟交互；
- **跨机器/跨网络**：服务端无状态路由，通过 `CanvasSyncSnapshot` 暂存房间画布全局快照；
- **自适应动态心跳**：多人活跃时 450ms 高频同步，单人 2500ms 节省带宽，后台标签页降频至 7000ms；发生关键操作（移动、新建、编辑）即时触发 20ms flush。

### 4.2 协同状态感知与冲突解决

1. **序列游标（cursor）与全局修订号（revision）**：
   - 每次画布操作自增服务端全局序列 `cursor`；
   - 卡片修改提交携带 `baseRevision`。若服务端已有更新，返回 `HTTP 409 Conflict`；
   - 客户端收到 409 后自动保全本地未提交队列，合并远端最新增量，并提示“需同步/已自动合流”。
2. **连接状态机**：
   - 顶部协作栏实时显示四态微缩胶囊：`连接中`（脉冲紫）、`已连接`（常亮绿）、`需同步`（警告黄）、`离线保存`（中性灰）；
   - 离线状态下本地操作进入持久化队列，网络恢复后支持一键“重新同步”。
3. **协同视觉感知**：
   - **响应式光标**：基于 React Flow `useViewport()` 监听视口变化，平滑映射协作者光标与角色色彩；
   - **卡片感知光环（Awareness Ring）**：协作者正在聚焦、编辑或拖动的卡片外围高亮呈现其专属角色轮廓环与姓名气泡；
   - **视角跟随（Follow Mode）**：点击协作者头像即可锁定其主视角，随其平移缩放；本地轻微拖映画布即可平滑解除跟随；
   - **本地拖拽保护**：`draggingNodeIdRef` 阻止远端状态在拖拽中途突变造成视觉卡顿与弹跳。

---

## 5. 策略顾问体系与项目隔离

1. **项目级对话隔离**：
   - 策略顾问的对话历史与 `projectId` 深度绑定并持久化存储；
   - 切换项目或新建项目时，自动切换至对应项目的独立记忆栈；
   - 删除项目级联清空对话历史，杜绝数据越权与跨项目干扰。
2. **只读引用与非侵入设计**：
   - 策略顾问回答时强制关联画布中的具体卡片，提供定位锚点；
   - 涉及“创建便签”、“调整状态”等写操作时，仅生成“草案预览块”，必须经设计师点击“采纳写入”才触发生效。

---

## 6. 功能清单与完成度矩阵（Feature Matrix）

| 编号 | 模块 | 核心功能点 | 优先级 | 当前状态 | 验收测试 |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **P0-01** | 画布引擎 | 多 Brief、多分支推演，刷新位置/连线全量持久化 | P0 | **已完成** | `convergence-store.test.ts` |
| **P0-02** | 智能合成 | 空白卡跨卡片杂交，支持多主题融合与不可变血统追踪 | P0 | **已完成** | `card-synthesis.test.ts` |
| **P0-03** | 自适应主题 | 引入 Creative Lenses，彻底废除固定模板词与 AI 主推偏见 | P0 | **已完成** | `routes.test.ts`, `creative-lenses.test.ts` |
| **P0-04** | 灵感检索 | 0 阻力连线直达 17 平台检索，自动注入去噪语法 | P0 | **已完成** | `convergence-client-search.test.ts` |
| **P0-05** | 入口纯化 | 移除卡片追问、视点探索确认按钮，保持卡片轻量化 | P0 | **已完成** | UI E2E 验证 |
| **P0-06** | 实时协同 | BroadcastChannel + HTTP 自适应心跳，快照分发，光标与感知环 | P0 | **已完成** | `collab.test.ts` |
| **P0-07** | 冲突控制 | 操作序列游标 `cursor` 与 `revision` 乐观锁，HTTP 409 恢复 | P0 | **已完成** | `collab.test.ts` (6/6 通过) |
| **P0-08** | 策略顾问 | 项目级独立对话持久化，级联清理与卡片引用草案 | P0 | **已完成** | `project-manager.test.ts` |
| **P1-01** | 方案收敛 | 标记筛选（喜欢/待审/反例），画布原生提案分组整理 | P1 | **已完成** | `card-tag-spotlight.test.ts` |
| **P1-02** | 基础体验 | 中文输入法（IME）拼音输入保护，便签输入防抖 | P1 | **已完成** | `brief-input-ime.test.ts` |
| **P1-03** | 提案导出 | 去除推荐偏见导出清晰项目提案清单（Dossier Export） | P1 | **已完成** | `export-dossier.test.ts` |
| **P2-01** | 协同持久化 | 生产级 Postgres/Supabase 房间状态替代临时内存 | P2 | 规划中 | 下一阶段研发重点 |
| **P2-02** | 细粒度权限 | 邀请链接有效期、只读/编辑角色鉴权 | P2 | 规划中 | 下一阶段研发重点 |
| **P2-03** | 评审与批注 | 画布区域划定、卡片行内 Comment 与 @成员功能 | P2 | 规划中 | 下一阶段研发重点 |

---

## 7. 核心数据接口规范

### 7.1 卡片对象扩展模型

```ts
export interface CanvasCardState {
  id: string;
  projectId: string;
  type: "brief" | "ask" | "direction" | "route" | "step" | "platformPlan" | "blank" | "image" | "stickyNote" | "imageGen";
  title: string;
  content: Record<string, unknown>;
  position: { x: number; y: number };
  decisionStatus?: "confirmed" | "uncertain" | "discarded";
  curationTag?: "favorite" | "review" | "counterexample";
  sourceCardIds?: string[];
  generationContext?: {
    model: string;
    lensId?: string;
    parentRevision?: number;
    generatedAt: number;
  };
  version: number;
  updatedAt: number;
}
```

### 7.2 协同状态与房间交互协议

```ts
// POST /api/collaboration/room 请求荷载
export interface RoomSyncRequest {
  roomId: string;
  peer: CollaboratorPeer;
  ops: CollaborationOp[];
  since: number;           // 客户端当前持有的最大序列游标 (cursor)
  baseRevision?: number;   // 客户端提交快照时的基线修订版本号
  snapshot?: CanvasSyncSnapshot;
}

// POST /api/collaboration/room 响应体
export interface RoomSyncResponse {
  roomId: string;
  peers: CollaboratorPeer[];
  ops: Array<CollaborationOp & { seq: number }>;
  snapshot: CanvasSyncSnapshot | null;
  revision: number;
  cursor: number;
  serverTime: number;
}
```

---

## 8. 生产发布与质量门禁（Definition of Done）

1. **测试套件要求**：全量单元与集成测试必须 100% 通过（当前基线为 172 项测试用例全部绿灯）；
2. **构建无异常**：Next.js Production Build 零 TypeScript 报错、零 Lint 阻塞；
3. **协同无损原则**：新成员打开协同链接后必须无损恢复完整画布，多端高频并发移动或编辑不得丢失卡片或产生重复幽灵节点；
4. **决策权威性**：无 AI 偏好强推，无模板固定词硬塞，灵感检索 0 步连线直通。
