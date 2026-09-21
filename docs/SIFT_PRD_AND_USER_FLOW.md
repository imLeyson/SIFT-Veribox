# SIFT：设计方向收敛与视觉探索 Agent
## 产品需求文档 (PRD v2.0) 与完整用户流程规范

**文档版本**：v2.0 (全闭环生产版)  
**产品代号**：SIFT (Design Convergence & Inspiration Exploration Agent)  
**文档状态**：正式发布 / 研发与设计基准  
**对应工程**：`veribox-mvp` (Next.js 15 App Router + React Flow + Zustand + DeepSeek Flash / Mock)  
**文档归属**：AI 在设计工作流中的重构实践  

---

## 目录
1. [执行摘要与问题洞察](#1-执行摘要与问题洞察)
2. [产品定位与人机分工原则](#2-产品定位与人机分工原则)
3. [目标用户与典型场景](#3-目标用户与典型场景)
4. [系统全景架构与技术方案](#4-系统全景架构与技术方案)
5. [完整端到端用户流程 (User Flow)](#5-完整端到端用户流程-user-flow)
   - 5.1 [全景业务流程图](#51-全景业务流程图)
   - 5.2 [四方人机协同泳道图](#52-四方人机协同泳道图)
   - 5.3 [核心状态机流转与决策机制](#53-核心状态机流转与决策机制)
   - 5.4 [阶段性操作流与异常分支拆解](#54-阶段性操作流与异常分支拆解)
6. [功能模块详细需求规范](#6-功能模块详细需求规范)
   - 6.1 [模块一：Brief 输入与双轨启动](#61-模块一brief-输入与双轨启动)
   - 6.2 [模块二：单题动态问答与不确定性探测](#62-模块二单题动态问答与不确定性探测)
   - 6.3 [模块三：方向状态卡与人工检查点 (Human Checkpoint)](#63-模块三方向状态卡与人工检查点-human-checkpoint)
   - 6.4 [模块四：3 套差异化探索路线生成与抉择](#64-模块四3-套差异化探索路线生成与抉择)
   - 6.5 [模块五：时序步骤推进与验收清单](#65-模块五时序步骤推进与验收清单)
   - 6.6 [模块六：多平台搜索编排与去噪关键词资产](#66-模块六多平台搜索编排与去噪关键词资产)
   - 6.7 [模块七：设计提案简报导出 (Dossier)](#67-模块七设计提案简报导出-dossier)
7. [数据模型与接口契约](#7-数据模型与接口契约)
8. [非功能性需求与系统质量边界](#8-非功能性需求与系统质量边界)
9. [产品演进路线图 (Roadmap)](#9-产品演进路线图-roadmap)

---

## 1. 执行摘要与问题洞察

### 1.1 背景来源
本产品规划与架构设计直接源自对一线设计工作流的深度研讨（《AI在设计工作中的应用探讨》）。设计团队与指导专家一致指出：
> **“在设计前期，找图本身并不占优势——互联网上不用花钱就能搜到海量素材。真正的痛点在于：如何重新编排设计师的动作，理清搜索次序，把模糊的需求收敛为清晰的设计判断。”**

### 1.2 传统设计前期流程痛点拆解
通过对传统设计调研流程的真实动作追踪，发现以下四大断层：
1. **任务理解与边界模糊**：拿到 Brief 后，设计师大脑中有初步设想，但不知道项目的最大不确定性是什么，常常混淆目标与技术约束。
2. **搜索时序混乱（动作无序）**：在 Pinterest、Behance、小红书等平台检索时，不知道“先搜什么、后搜什么”（先搜品类、风格、调性、竞品还是工艺？），缺乏结构化时序。
3. **平台与词汇生态屏障（信息噪音）**：
   - 中英文平台生态脱节：本土灵感看中文社媒，先锋视觉依赖海外平台，反复中英机翻导致专业词汇失真；
   - 样机贴图噪音：普通搜索词搜出大量无参考价值的商业样机（Mockup）和模版贴图，淹没真实工艺细节。
4. **决策不收敛与灵感散落**：无目的翻图导致信息过载，收藏夹堆积数以百计零散图片，却难以向团队和客户汇报明确的设计路线与推进依据。

---

## 2. 产品定位与人机分工原则

### 2.1 产品定位
**SIFT 是专为设计师打造的前期方向收敛与视觉探索编排 Agent (Design Convergence & Exploration Agent)。**
它不是自动生图工具，也不是替代设计师决策的“黑盒脑洞器”，而是**设计师的结构化思维脚手架**。

### 2.2 核心价值主张
> **“Agent 负责发散可能、梳理次序与降低认知负载；设计师负责关键判断、主观审美与最终抉择。”**

### 2.3 设计哲学与演进准则
- **准则一：先做小跑通，再嫁接做大**。MVP 优先实现闭环的文字理解、方向收敛与跨平台搜索编排，后续逐步嫁接图像反推、槽位造句与团队协同。
- **准则二：人在哪抉择，AI 在哪赋能**。必须设立绝对的人工检查点（Human Checkpoint），未经设计师批准，系统绝不擅自越级推导。
- **准则三：假设与事实严格隔离**。模型所作的推论必须打上待确认假设标记（`basis: "assumption"`），用户确认的决策标记为事实（`basis: "user"`），绝不隐瞒模型意图。
- **准则四：拒绝死循环与编造偏好**。用户表示“暂不确定”时，系统最多换一种对照方式再问一次；若仍无法决断，直接标记暂缓（`deferred`），严禁强迫用户或捏造答案。

---

## 3. 目标用户与典型场景

### 3.1 目标用户画像
1. **主设 / 资深设计师 (Design Lead / Senior Designer)**：需要快速拆解复杂、矛盾的商业需求，为团队制定清晰的调研路径和探索提案。
2. **独立设计师 / 自由职业者**：独立对接甲方，面对模糊或频繁变动的需方诉求，需要低成本、快速验证方向并生成结构化 Brief 汇报。
3. **设计专业师生 / 前沿探索者**：探索 AI 与传统设计方法论（如双钻模型、现代瑞士平面设计）的深度结合。

### 3.2 典型使用场景

| 场景分类 | 典型用户输入示例 | 核心痛点与需求 | SIFT 响应策略 |
| :--- | :--- | :--- | :--- |
| **场景 A：约束冲突型任务** | “我们要做一款极简冷泡茶包装，预算极其有限，但投资人要求必须有极高奢华感与艺术收藏价值。” | 预算与高端工艺存在直接冲突，不知道如何取舍。 | 优先定位约束冲突，抛出关键对比问题，引导设计师确定优先坚持项与妥协项。 |
| **场景 B：模糊探索型任务** | “想做一个面向 Z 世代的社区咖啡馆品牌视觉，调性要酷一点，没有更多信息。” | 需求极度宽泛，缺少风格锚点与细分受众。 | 启动动态追问或一键快速收敛，生成 3 套截然不同切入点的探索路线（如工业冷感 vs 潮玩社群 vs 治愈温润）。 |
| **场景 C：时序搜索与出海调研** | “已确定要做瑞士极简版式的科技企业年报，需要去 Behance 和海外设计站找成套排版案例。” | 普通搜索全是千篇一律的样机模板，缺少专业设计词汇与时序。 | 针对步骤动态生成双语关键词资产，自动注入 `-mockup` 高级去噪语法，一键直达专业检索。 |

---

## 4. 系统全景架构与技术方案

```mermaid
flowchart TD
    subgraph UI_Layer ["表现层：无限流动画布 (Infinite Canvas / React Flow)"]
        direction TB
        Node00["00 Brief 节点\n(Prompt 输入 & 预设案例)"]
        Node01["01 动态问答卡\n(单题/选项/不确定探测)"]
        Node02["02 方向状态卡\n(Design State 意图/优先/避免/准则)"]
        Node03["03-04 探索路线卡 x3\n(差异化切入点/推荐标识)"]
        Node05["05 步骤推进轴\n(时序推进/验收清单勾选/手记)"]
        Node07["06-08 平台搜索方案卡\n(中英对照/去样机语法/一键直达)"]
        ModalDossier["09 提案简报模态弹窗\n(Markdown 导出/复制)"]
    end

    subgraph State_Layer ["状态管理与离线持久化 (Zustand)"]
        Store["convergence-store (sift-convergence-v1)"]
        HistoryManager["版本历史追踪与回滚 (Revisions)"]
        ConcurrencyLock["迟到响应拦截 (SessionId + BaseRevision)"]
    end

    subgraph Orchestrator_Layer ["服务编排与 API 服务层 (Next.js 15 App Router)"]
        direction TB
        APIBrief["POST /api/brief\n(会话初始化 / fast_start 一键收敛)"]
        APIClarify["POST /api/clarify\n(答案提交 / 补充修正重估)"]
        APIRoutes["POST /api/routes\n(3条探索路线差异化生成)"]
        APIPlan["POST /api/platform-plan\n(步骤平台方案与关键词编排)"]
    end

    subgraph Engine_Layer ["双轨推理与平台注册引擎"]
        direction TB
        LLMLive["DeepSeek Flash (Live Mode)\nJSON 结构化推理 + 容错修复"]
        LLMMock["内置确定性 Mock 引擎\n(零 API Key 离线可复现演示)"]
        PlatformRegistry["6大设计平台注册表\n(Pinterest / Behance / 小红书 / IG / Dribbble / Google)"]
    end

    Node00 --> Store
    Node01 --> Store
    Node02 --> Store
    Node03 --> Store
    Node05 --> Store
    Node07 --> Store
    Store --> ModalDossier

    Store <--> Orchestrator_Layer
    APIBrief --> LLMLive & LLMMock
    APIClarify --> LLMLive & LLMMock
    APIRoutes --> LLMLive & LLMMock
    APIPlan --> LLMLive & LLMMock
    APIPlan --> PlatformRegistry
```

---

## 5. 完整端到端用户流程 (User Flow)

### 5.1 全景业务流程图

```mermaid
flowchart TD
    Start([用户进入 SIFT 空间]) --> Step0[00 输入或选择原始 Brief]
    
    Step0 --> ChoiceStart{启动方式选择}
    ChoiceStart -- "点击「开始收敛」" --> QLoop[进入单题动态问答环节]
    ChoiceStart -- "点击「一键收敛」" --> FastConv[模型单次推导 + 假设隔离标注]
    
    subgraph Convergence_Loop ["阶段一：方向收敛循环"]
        QLoop --> RenderQ[展示关键问题: 最多40字, 2-3个高对比选项]
        RenderQ --> UserAns{用户操作}
        UserAns -- 选择选项 / 自定义文本 --> SubmitAns[POST /api/clarify 提交]
        UserAns -- 选择「暂不确定」 --> RetryCheck{首次不确定?}
        RetryCheck -- 是 --> SwapScenario[换一个对照场景重新询问]
        RetryCheck -- 否 --> DeferTopic[标记该主题为 deferred, 不编造偏好]
        UserAns -- 点击「以此方向继续」 --> FastInterrupt[本地截断, 保留未决项]
        
        SubmitAns --> EvalState[更新 Design State 状态卡]
        SwapScenario --> RenderQ
        DeferTopic --> CheckUncertainty{还有关键不确定项?}
        EvalState --> CheckUncertainty
        CheckUncertainty -- 有 --> RenderQ
        CheckUncertainty -- 无 / 达到阈值 --> Checkpoint
        FastInterrupt --> Checkpoint
        FastConv --> Checkpoint
    end

    subgraph Human_Gate ["人工检查点 (Human Checkpoint)"]
        Checkpoint[进入人工检查点: 冻结当前状态卡]
        Checkpoint --> ReviewState[审核 6 核心要素: 意图/优先/避免/准则/假设/未决]
        ReviewState --> HumanDecision{设计师决策}
        HumanDecision -- 发现偏差, 提交修正意见 --> ReviseState[提交补充描述, 重新评估]
        ReviseState --> QLoop
        HumanDecision -- 认可当前方向, 点击「确认方向」 --> LockDirection[状态冻结: status = confirmed]
    end

    subgraph Exploration_Routes ["阶段二：路线抉择与时序推进"]
        LockDirection --> Gen3Routes[触发 POST /api/routes\n生成 3 条不同方法论的探索路线]
        Gen3Routes --> ShowRoutes[横向平铺展示 3 套路线卡片\n标注推荐路线及理由]
        ShowRoutes --> PickRoute[设计师选中 1 条探索路线]
        PickRoute --> UnselectedDim[未选路线降权收起, 选定路线高亮展开]
        UnselectedDim --> ActivateStep[默认激活 Step 1 步骤轴]
    end

    subgraph Step_Search_Loop ["阶段三：步骤推进与跨平台搜索"]
        ActivateStep --> GenPlan[触发 POST /api/platform-plan\n生成当前步骤专属的平台搜索方案]
        GenPlan --> ShowPlan[展示 3 大主平台 + 备选来源\n呈现中英关键词、意图标签、去样机语法]
        ShowPlan --> SearchActions{设计师搜索行为}
        SearchActions -- "点击「一键搜索」" --> OpenSingle[新标签页拉起预填语法搜索页]
        SearchActions -- "点击「打开全部3个主力平台」" --> OpenTriple[并行拉起 3 大平台完成多维调研]
        SearchActions -- "点击复制关键词" --> CopyClip[复制至剪贴板, 粘贴至本地设计工具]
        SearchActions -- "平台不适用" --> ReplaceSource[从备选库中一键替换]
        SearchActions -- "完成阶段探索" --> CheckStep[勾选验收清单准则 / 记录探索手记]
        
        CheckStep --> HasNextStep{还有后续步骤?}
        HasNextStep -- 切换至下一步 --> StepNext[点击 Step 2 / Step 3]
        StepNext --> GenPlan
        HasNextStep -- 步骤全部执行完毕 --> ReadyDossier[调研完成]
    end

    subgraph Export_Phase ["阶段四：提案简报成果导出"]
        ReadyDossier --> ClickExport[点击导航栏「导出提案简报」]
        ClickExport --> ShowModal[弹出完整 Dossier 模态窗口]
        ShowModal --> FinalExport{导出形式}
        FinalExport -- 点击复制全部 --> CopyAll[一键复制 Markdown 格式至剪贴板]
        FinalExport -- 点击保存文件 --> SaveMD[下载 .md 方案文件至本地]
        CopyAll --> Done([交付团队 / 汇报客户 / 指导深化设计])
        SaveMD --> Done
    end
```

---

### 5.2 四方人机协同泳道图

```mermaid
sequenceDiagram
    autonumber
    actor U as 设计师 (Designer)
    participant C as 前端画布 (Infinite Canvas)
    participant O as 编排层 (Next.js API)
    participant L as 推理与平台引擎 (LLM / Registry)

    Note over U, L: 阶段 01: 任务输入与收敛启动
    U->>C: 输入原始 Brief (或选择行业示例)
    alt 标准收敛路径
        U->>C: 点击「开始收敛」
        C->>O: POST /api/brief { event: "start", rawBrief }
        O->>L: 提取约束，识别最大不确定性
        L-->>O: 返回初始 DesignState + 单个关键问题
        O-->>C: 200 OK (渲染 AskNode 与 StateNode)
    else 一键收敛路径 (Fast Start)
        U->>C: 点击「一键收敛」
        C->>O: POST /api/brief { event: "fast_start", rawBrief }
        O->>L: 一次性推导完整方向 (未明项标为 assumption)
        L-->>O: 返回完整 DesignState + next: checkpoint
        O-->>C: 200 OK (直接进入 Human Checkpoint)
    end

    Note over U, L: 阶段 02: 动态问答与不确定性探查 (标准流)
    loop 仅针对关键问题探测
        C->>U: 呈现单题 (≤40字) + 2-3个高对比选项 / 自定义输入
        alt 设计师做出选择
            U->>C: 选定选项 或 录入自定义文本
            C->>O: POST /api/clarify { event: "answer", answer }
            O->>L: 结合历史，增量更新 DesignState
            L-->>O: 返回更新后 State + 下一问题或 Checkpoint
            O-->>C: 200 OK (局部平滑更新画布)
        else 设计师选择暂不确定
            U->>C: 点击「暂不确定」
            Note over C, O: 首次：换对照场景再问一次；二次：标记 deferred 结束该项
        else 设计师中途主动收敛
            U->>C: 点击「以此方向继续」
            C->>C: 本地截断，保留未决项，不消耗模型调用
        end
    end

    Note over U, L: 阶段 03: 人工检查点与方向确认 (Human-in-the-Loop)
    C->>U: 进入人工检查点，高亮呈现方向状态卡 (意图/避免/准则等)
    alt 提出修改补充
        U->>C: 输入修正意见并提交
        C->>O: POST /api/clarify { event: "correct", text }
        O->>L: 增量重估方向
        L-->>O: 返回修订后状态
        O-->>C: 重新渲染状态
    else 确认方向
        U->>C: 点击「确认方向」(关键人为抉择)
        C->>C: 冻结方向卡 (status = confirmed)
    end

    Note over U, L: 阶段 04: 探索路线生成与抉择
    C->>O: POST /api/routes { confirmedState }
    O->>L: 强制生成 3 套差异化切入点路线
    L-->>O: 返回 3 套路线 (含1条推荐)
    O-->>C: 渲染 3 张 RouteNode 卡片
    U->>C: 审阅差异化方案，选中其中 1 条最契合路线
    C->>C: 选定路线高亮展开，未选路线降权收起

    Note over U, L: 阶段 05: 时序步骤推进与跨平台搜索编排
    C->>C: 激活选定路线 Step 1 步骤轴
    C->>O: POST /api/platform-plan { routeId, stepId }
    O->>L: 编排该步骤对应的 3 大主力平台方案
    O->>L: 查阅 PlatformRegistry 注入 URL 模板与去噪语法
    L-->>O: 返回中英关键词对照与专业去噪语法
    O-->>C: 渲染 PlatformPlanNode 卡片
    
    U->>C: 点击「打开全部3个主力平台」或复制关键词
    C-->>U: 新标签页并行拉起各平台搜索；关键词写入剪贴板
    U->>C: 调研完毕，勾选步骤验收清单，填写灵感手记
    U->>C: 切换至 Step 2 / Step 3 (重复拉取方案)

    Note over U, L: 阶段 06: 提案简报沉淀与导出
    U->>C: 点击顶部导航「导出提案简报」
    C->>C: 聚合 Brief、状态、路线、步骤、验收率、手记与词库
    C->>U: 弹出 Dossier 模态窗口，支持一键复制 / 下载 Markdown
```

---

### 5.3 核心状态机流转与决策机制

```mermaid
stateDiagram-v2
    [*] --> Draft : 进入工作台

    state Draft {
        [*] --> Empty : 空白待输入
        Empty --> Populated : 键入自然语言或点击预设案例
    }

    Draft --> Questioning : 点击「开始收敛」(start)
    Draft --> HumanCheckpoint : 点击「一键收敛」(fast_start，未明项标为 assumption)

    state Questioning {
        [*] --> ActiveQuestion : 展示单题 (≤40字, 2-3个对比选项)
        ActiveQuestion --> AnswerSubmitted : 提交答案 (选项/自定义文本)
        ActiveQuestion --> UncertainFirst : 首次选择「暂不确定」
        UncertainFirst --> ActiveQuestion : 换对照场景再问一次
        UncertainFirst --> Deferred : 第二次仍不确定 (标记 deferred，不编造)
        ActiveQuestion --> FastConvergence : 追问中点击「以此方向继续」
        
        AnswerSubmitted --> StateEvaluating : 模型增量更新 DesignState
        StateEvaluating --> ActiveQuestion : 仍有核心未决项 (Uncertainties > 0)
        StateEvaluating --> ReadyToCheck : 未决项清除或达到决策阈值
    }

    FastConvergence --> HumanCheckpoint : 本地截断，保留当前状态与未决项
    Deferred --> ReadyToCheck : 无其余关键问题
    ReadyToCheck --> HumanCheckpoint : 进入检查点

    state HumanCheckpoint {
        [*] --> InReview : 审核方向卡 (意图/优先/避免/准则/假设/未决)
        InReview --> Correcting : 提出自然语言修正意见
        Correcting --> StateEvaluating : 增量重估
        InReview --> DirectionConfirmed : 人工点击「确认方向」(关键分水岭)
    }

    DirectionConfirmed --> RoutesGenerating : 触发生成 3 套差异化探索路线
    
    state RoutesGenerating {
        [*] --> EvaluatingRoutes : 展示 3 套路线对比 (切入点/优劣势/推荐)
        EvaluatingRoutes --> RouteSelected : 设计师单选其中 1 条路线
    }

    RouteSelected --> StepExecuting : 激活 Step 1 步骤轴

    state StepExecuting {
        [*] --> PlanFetching : 生成当前步骤 3 大平台搜索方案
        PlanFetching --> InspectingPlan : 审阅中英词库、去噪语法、打开搜索
        InspectingPlan --> PlatformReplacing : 平台不匹配，从备选库替换
        InspectingPlan --> StepAdvancing : 勾选验收项、填写手记、切换至下一步
        StepAdvancing --> PlanFetching : 针对新步骤生成搜索方案
    }

    StepExecuting --> DossierExport : 调研沉淀完毕，打开简报
    DossierExport --> [*] : 导出 Markdown 方案简报
```

---

## 6. 功能模块详细需求规范

### 6.1 模块一：Brief 输入与双轨启动
- **节点标识**：`00 Brief 输入节点 (BriefInputNode)`
- **主要能力**：
  - 非结构化自然语言输入（中英文均可，20–2000字）；
  - 6 个跨行业典型案例预设（冷泡茶、护肤品、SaaS、咖啡馆、艺术装帧、约束冲突穿戴）；
  - 双轨启动：**标准收敛（识别不确定性，抛出关键问题）** 与 **一键收敛（单次推导，假设标记隔离，直达检查点）**。

### 6.2 模块二：单题动态问答与不确定性探测
- **节点标识**：`01 动态问答卡 (AskNode / QuestionBlock)`
- **主要能力**：
  - 每轮仅问 1 个核心问题（≤40字）；
  - 提供 2–3 个存在本质差异的对比选项 + 自由文本输入 + 暂不确定；
  - 优先级次序：先化解约束冲突，再定表达重点，最后澄清受众感知；
  - 抗死循环机制：暂不确定仅换问一次，仍不确定则标记为 `deferred`；
  - 追问中断收敛：支持一键「以此方向继续」，本地快速封存并推进。

### 6.3 模块三：方向状态卡与人工检查点 (Human Checkpoint)
- **节点标识**：`02 方向状态卡 (StateNode)`
- **主要能力**：
  - 6 核心板块：任务基准、硬性约束、核心意图、优先坚持、坚决避免、判断准则与未决项；
  - 严格溯源：区分 `user`（用户确认）与 `assumption`（模型推断）；
  - 人工检查点（Human Gate）：未经设计师主动确认，系统严禁自动推进路线生成；支持自然语言补充修正重估。

### 6.4 模块四：3 套差异化探索路线生成与抉择
- **节点标识**：`03-04 探索路线卡 x3 (RouteNode)`
- **主要能力**：
  - 强制生成 3 套路线，禁止空泛风格词（如“简约风”已被拦截）；
  - 必须具备互斥切入起点（`startingPoint`）；
  - 仅至多 1 条推荐路线并阐明理由；
  - 包含核心突破问题、核心优势、潜在风险、可行性评估与时序步骤；
  - 选中路线展开步骤轴，未选路线降权收起。

### 6.5 模块五：时序步骤推进与验收清单
- **节点标识**：`05 步骤推进轴 (StepNode)`
- **主要能力**：
  - 3–5 个时序推进步骤（探索目的、交付物清单）；
  - 可交互勾选的验收清单（Acceptance Criteria）；
  - 步骤灵感手记（Notes）录入与持久化。

### 6.6 模块六：多平台搜索编排与去噪关键词资产
- **节点标识**：`06-08 平台搜索方案卡 (PlatformPlanNode)`
- **主要能力**：
  - 针对步骤动态生成 6 大设计平台（Pinterest, Behance, 小红书, IG, Dribbble, Google）搜索策略；
  - 中英双语对照与意图分类（`moodboard` / `detail` / `consumer` / `benchmark`）；
  - 高级去噪语法集成（如 Behance 自动注入 `-mockup` 过滤样机贴图）；
  - 一键新窗口直达、批量并行拉起 3 主力平台、备选来源无缝替换。

### 6.7 模块七：设计提案简报导出 (Dossier)
- **节点标识**：`09 提案简报导出 (DossierModal)`
- **主要能力**：
  - 聚合 Brief、收敛状态、选定路线、步骤进度、验收勾选、手记与搜索词库；
  - 一键复制 Markdown 格式至剪贴板，支持下载 `.md` 文件。

---

## 7. 数据模型与接口契约

系统严格基于以下核心 TypeScript 契约运行：
- `DesignState`：方向收敛状态机模型，包含版本号、状态、约束与判断数组（含 `basis: "user" | "assumption"` 溯源）。
- `Uncertainty`：不确定性模型，包含影响等级与 `open | deferred` 状态。
- `Route` & `RouteStep`：探索路线模型，包含切入点、优劣势、推荐理由与步骤清单。
- `PlatformPlan` & `PlatformSource` & `PlatformKeyword`：平台搜索编排模型，包含中英对照、意图标签与去噪语法。

---

## 8. 非功能性需求与系统质量边界

1. **双轨架构设计 (Live / Mock Dual-Engine)**：支持接入 DeepSeek Flash 实时大模型结构化推理；同时内置确定性离线 Mock 引擎，零 Key 环境下 100% 跑通全部流程。
2. **服务端容错与超时预算**：单次调用服务端 45s、客户端 50s 严格预算，内建轻微残缺 JSON 容错修补。
3. **状态幂等与并发防脏写**：基于 `(sessionId, requestId, baseRevision)` 严格拦截迟到网络响应。
4. **本地持久化与数据隔离**：Zustand 自动同步至 LocalStorage 键 `sift-convergence-v1`，保障草稿防丢失。
5. **瑞士极简设计规范**：杜绝花哨动效与大面积高饱和色彩，采用严谨的网格排版与克制微交互。

---

## 9. 产品演进路线图 (Roadmap)

- **Phase 1（当前已落地）**：文字理解与动作编排、双轨启动、单题问答、方向状态卡与检查点、3 套路线抉择、步骤轴与去样机多平台搜索方案、简报导出。
- **Phase 2（近程规划）**：灵感素材轻量沉淀、外部图片一键收藏卡、AI 以图反推风格流派与提示词结构（Reverse Prompting）、百张级灵感聚类分析报告。
- **Phase 3（远期展望）**：语法化槽位造句（将主谓宾语法映射为「风格 + 核心元素 + 视觉调性」拖拽拼装）、多人实时协同画布、团队评审分歧标记。
