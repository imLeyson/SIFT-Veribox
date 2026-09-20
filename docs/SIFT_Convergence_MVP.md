# SIFT：设计方向收敛 MVP

本版替代“探索路线与搜索行动”主流程。服务个人设计师，保留无限画布，无登录、数据库或外部搜索。

## 行为

- 原始 Brief、问答历史、一张持续更新的方向状态卡。卡片可拖动缩放，不可删除或创建流程分支。
- 每轮一个问题，最多 40 字；可提供 2–3 个有差异的选项，也可只要求文本回答。没有预选或推荐答案。
- 先处理限制冲突，再判断表达重点、受众感知和评价标准。没有高价值问题时不凑轮数。
- 暂不确定不生成偏好；同一判断最多换一个场景或对照问法，第二次仍不确定则暂缓。
- 没有关键问题、剩余问题需要外部依据或用户主动停止时进入 Human Checkpoint。
- Brief 上可「一键收敛」：一次模型调用，不提问，按 Brief 填方向；没写清的判断标成待确认，然后进入检查点。
- 追问中可「一键收敛」：立即停止提问，按当前 Design State 进入检查点；未决项保留，不调用模型，不替用户确认。
- 仅用户可确认方向；确认保留未决项和待确认假设。没有任何方向判断时，只可保存状态和继续补充。
- 修改或补充会重新评估，不要求从头填问卷。

## 状态与来源

`DesignState` 包含 revision、status、brief、constraints、direction、uncertainties。direction 分为 intent、priorities、avoid、criteria。

每个 Judgment 使用 `{ text, basis: "user" | "assumption", sourceIds }`。来源只能是原始 Brief（`brief`）或一条已记录回答／修正的 requestId。历史保留完整问题、答案、更新前后版本。假设不会因确认整个方向自动成为事实。

问题用稳定 uncertaintyId 绑定未决判断。约束冲突题额外用 `constraintRefs` 指明重新讨论的约束原文；只有被直接讨论的约束可因该回答替换，其他约束必须保留。

画布节点只是视图，不向模型回传节点文本、坐标或连线。状态卡默认展示六栏：任务、当前方向、优先、避免、判断标准、待定；列表超过三项可展开。

## API

保留 `GET /api/status`。两个 POST 共用 `runConvergenceTurn`，一次正常轮转调用一次模型，返回完整状态，不用 JSON Patch。

- `POST /api/brief`：event 为 `{ type: "start" }` 或 `{ type: "fast_start" }`，state 为 null，history 为空，pendingQuestions 为 null。
- `fast_start` 必须返回检查点，reason 为 `fast_converged`；服务端若收到提问会强制改成检查点。推导标 `assumption`。
- 追问中的「一键收敛」是本地状态转换，不调用模型；递增 revision、清空未提交草稿，并写入 `checkpoint/converge` 历史。
- `POST /api/clarify`：event 为 `{ type: "answer", answer }` 或 `{ type: "correct", text }`。
- 公共输入：sessionId、requestId、rawBrief、state、history、pendingQuestion、event。
- answer：`{ questionId, kind: "option", optionId }` / `{ questionId, kind: "custom", text }` / `{ questionId, kind: "uncertain" }`。
- 公共输出：state、next、history、sessionId、requestId、baseRevision、mode、model。
- next：`{ type: "ask", questions }` 或 `{ type: "checkpoint", reason }`；reason 为 ready / needs_evidence / user_requested / fast_converged。用户主动停止在本地记录 user_requested，不消耗模型请求。
- 无效输入返回 400；模型或契约失败返回 502 和可读 error。不会返回半份新状态。

旧 /api/routes、/api/platform-plan、/api/canvas-chat 已删除。这是内部 API 的不兼容变更；旧客户端需要升级。

## 持久化与请求一致性

Zustand 保存到新的 `sift-convergence-v1` 键。首次没有新数据时只预填旧 rawBrief，旧键保留。损坏记录打开空会话并提示；保存失败提示不要刷新。

请求成功并通过校验后，一次性提交状态、问答历史和下一步。失败保留当前题和草稿。sessionId、requestId、baseRevision 联合检查迟到响应。新建、取消、主动进入 Checkpoint 和发起修正会取消旧请求。

人工确认和主动停止均递增版本。页面刷新不恢复 loading 或临时错误。

## Mock 与 Live 的边界

Mock 是可复现的流程演示，不是设计推理模型。内置冷泡茶、护肤、SaaS、咖啡馆、约束冲突和方向完整的示例；其他输入使用简短的开放问题。示例中的已知判断可修正，其余补充作为用户输入记录。任意自然语言冲突、语义相似问题和事实依据仍需 Live 评估。

Live 保留完整上下文，使用一个结构化提示词。服务端强制单题、引用有效、状态一致、保留未涉及的约束和最多一次换问。语义层面的“问得准”需要人工抽查，不能由结构校验或 Mock 测试保证。

## 验收与手工回归

- 同一冷泡茶 Brief 选择触感或版式，状态和下一判断不同。
- 连续两次暂不确定，原判断标为暂缓且没有编造偏好。
- 方向完整的 Brief 可以直接进入人工确认。
- 已说明的受众、禁忌不再询问；SaaS 不问包装细节。
- 解决约束冲突后只替换涉及的限制，保留预算等无关约束。
- 刷新保留草稿和状态；取消／网络失败不新增历史；迟到响应不覆盖新会话。
- 确认后不自动追问；修正重新打开评估并保留历史。

2026-09-19 实施验证：

- 35 个自动化测试通过，Lint、生产构建和 diff 空白检查通过；覆盖响应会话不匹配、重复修正提交和已暂缓问题的输入拒绝。
- 浏览器走通示例输入、选项回答、刷新恢复草稿、人工确认、修改补充、连续两次不确定及窄窗口操作。
- 实际调用配置的 DeepSeek-V4.1-Flash（API ID：`deepseek-flash`）：冷泡茶能单题追问、按回答更新来源、一次换问后暂缓；完整社区咖啡馆 Brief 直接返回 ready Checkpoint，未追问。
- Live 检查是少量样例抽查，不能保证任意真实项目的提问质量；后续仍需按实际 Brief 人工评估。
