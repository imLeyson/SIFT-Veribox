# Implementation Plan: SIFT 多问题设计收敛

## Overview

把 SIFT 从“一轮一个问题”升级为“每轮综合 Brief 与已有回答，一次提出 2–3 个高价值问题”。每轮回答后更新 Design State、生成一句逐步具体化的当前设计假设，并在必要时给出一个轻量验证动作。只有没有高价值未决判断时才进入 Human Checkpoint；Agent 不自动宣布完成，由用户选择开始设计、继续深化或回退修改。

## Architecture Decisions

- 将一轮问题建模为 `questions[]`，答案建模为同一轮的 `answers[]`，确保多个判断原子提交。
- Design State 增加 `currentHypothesis` 与可选 `validationAction`，两者必须由模型依据 Brief/回答生成，不能由 UI 自行拼接。
- Human Checkpoint 是用户决策点：`start_design` 由用户显式确认，`deepen` 重新进入提问，`revise` 打开修改入口；模型永远不能直接进入 confirmed。
- 服务端继续校验问题引用、重复问题、约束保留、来源 ID 和问题价值；每轮问题必须是 2–3 个互不重复的 blocking/material 判断。
- 本地持久化升到 v2；旧 v1 会保留原始 Brief，但不把旧单问题状态强行解释成新批量协议。

## Task List

### Phase 1: Contract and State

- [ ] Task 1: Upgrade schemas/types/history/input from singular question/answer to batched questions/answers.
- [ ] Task 2: Add current design hypothesis and optional validation action to Design State and state card.
- [ ] Task 3: Add explicit checkpoint actions for start design, deepen, and revise.

### Checkpoint: Foundation

- [ ] Contract tests cover 2–3 questions, matching answer batches, hypothesis limits, and checkpoint actions.
- [ ] Existing build and tests remain green.

### Phase 2: Agent Behavior

- [ ] Task 4: Rewrite Live prompt to analyze prior state first, ask 2–3 high-value questions, avoid repeats, and stop summarizing.
- [ ] Task 5: Extend Mock convergence to produce batched questions, evolving hypothesis, and one lightweight validation action.
- [ ] Task 6: Strengthen server-side guards for question priority, repeated judgments, state continuity, and no automatic confirmation.

### Checkpoint: Agent Loop

- [ ] Mock flow answers a full round atomically and changes hypothesis/state.
- [ ] A complete or evidence-limited brief reaches a user-controlled checkpoint, never confirmed automatically.

### Phase 3: Canvas and Interaction

- [ ] Task 7: Render 2–3 current questions in one canvas card and collect all answers before submitting.
- [ ] Task 8: Show the current design hypothesis and validation action without long summaries or multi-solution output.
- [ ] Task 9: Add checkpoint controls: 开始设计、继续深化、回退修改；keep correction history and allow rollback edits.
- [ ] Task 10: Update persistence, API/client tests, browser-facing copy, and migration behavior.

### Checkpoint: Complete

- [ ] `npm test`, `npm run lint`, `npm run build` pass.
- [ ] Browser flow verifies start → 2–3 questions → batch answer → updated hypothesis → checkpoint choice.
- [ ] No API key or other secret is staged.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Old persisted sessions use singular question fields | Medium | Bump storage version and import only raw Brief from legacy sessions. |
| Model returns repeated or low-value questions | High | Enforce 2–3 unique open blocking/material uncertainties and reject repeated IDs/prompts. |
| Batch answers partially submit | High | Require one answer per current question and commit the round atomically. |
| Checkpoint accidentally confirms | High | Keep `confirmed` reachable only from explicit user action in the client store. |
| Validation action becomes another long summary | Medium | Schema limits it to one short action with a concrete observable. |

## Open Questions

- Whether “回退修改” should immediately submit a correction or only open the existing correction editor. Initial implementation uses the existing editor so the user controls the text.

## One-click convergence (2026-09-20)

Brief 快路径走 `{ type: "fast_start" }` → `POST /api/brief`，服务端强制 `checkpoint` / `fast_converged`，推导标 assumption。追问中走本地 `convergeNow()`，不打模型，写 `checkpoint/converge` 历史，reason 为 `user_requested`。两者都不 `confirmed`。

- [x] Task A: Schema — `fast_start` 事件、`converge` 历史动作、`fast_converged` 原因
- [x] Task B: Engine — Mock 补全待确认判断；Live 提示；服务端强制检查点
- [x] Task C: Store/client — 本地停问审计；Brief 请求发到 `/api/brief`
- [x] Task D: UI — Brief 与追问入口；检查点文案
- [x] Task E: Tests + lint + build + 浏览器两条路径
