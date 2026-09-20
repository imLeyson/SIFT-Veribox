# Spec: SIFT 一键收敛

## Objective

给设计师两条更快的出口，都停在 Human Checkpoint，不替用户宣布完成。

1. **Brief 一键收敛**：粘贴任务后直接出方向状态。Brief 里写清的事实标 `user`；为填满方向而做的推导标 `assumption`（待确认）。一次模型调用，不问题。
2. **追问中一键收敛**：停止当前提问，保留已有判断和未决项，不调用模型，进入检查点。

现有「开始收敛」问答主路径不变。

## Tech Stack

Next.js App Router、TypeScript、Zustand、Zod、现有 `/api/brief` 与 `/api/clarify`、Mock/Live `runConvergenceTurn`。

## Commands

```bash
npm test
npm run lint
npm run build
npm run dev -- --hostname 127.0.0.1 --port 3000
```

## Project Structure

- `src/lib/agent/convergence-schema.ts` — 事件与下一步契约
- `src/lib/agent/convergence.ts` — 轮次守卫，fast_start 强制检查点
- `src/lib/agent/convergence-live.ts` / `convergence-mock.ts` — 模型与示例行为
- `src/lib/convergence-store.ts` / `convergence-client.ts` — 本地停问与请求
- `src/components/flow/nodes/BriefInputNode.tsx` / `AskNode.tsx` / `Workspace.tsx` / `StateNode.tsx` — 入口与文案
- `src/lib/**/*.test.ts` — 行为测试

## Code Style

跟随现有短函数、中文错误文案、契约先 Zod 再 UI。新增事件放在 `EventSchema` 末尾，避免打乱 `HistoryEntrySchema` 对 answer/correct/checkpoint 的引用。

```ts
send({ type: "fast_start" }); // POST /api/brief
store.getState().convergeNow(); // 本地，不打模型
```

## Testing Strategy

Vitest 覆盖：

- `fast_start` 不能带旧状态；普通 `start` 仍可追问
- Brief 快路径进入 `checkpoint` / `fast_converged`，不 `confirmed`，推导为 `assumption`
- 模型若仍返回提问，服务端强制改成检查点
- 追问中 `convergeNow` 不改 direction、清空草稿、写 `checkpoint/converge` 历史、重复点击忽略
- `/api/brief` 接受 `fast_start`，`/api/clarify` 拒绝；追问中收敛不发请求

## Boundaries

- Always: 不自动 `confirmed`；失败保留 Brief/草稿；测试、lint、build 通过后再交付
- Ask first: 改存储键、新依赖、部署生产
- Never: 提交密钥；让模型宣布完成；用一键收敛替换问答主路径

## Success Criteria

- Brief 上「开始收敛」仍问 2–3 题；「一键收敛」一次调用后出现状态卡和检查点
- 追问中「一键收敛」立即进入检查点，未决项仍在，可开始设计 / 继续深化 / 回退修改
- 检查点文案能区分「按 Brief 直接收敛」和「用户停问」
- 刷新后会话仍在；不自动确认

## Open Questions

无。已确认做 Brief + 追问中两条路径。
