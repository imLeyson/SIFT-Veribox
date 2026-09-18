# SIFT

SIFT 是一个帮助设计师把模糊 Brief 编排成视觉探索路线和搜索行动的 Agent。

```text
Brief → 理解任务 → 选择当前状态 → 3 条探索路线 → 平台搜索计划 → 画布对话深化
```

Agent 负责组织可能性，设计师负责判断和选择。

## 启动

```bash
npm install
npm run dev
```

打开 http://localhost:3000

无 `LLM_API_KEY` 时走 Mock Mode。配置 Grok 4.6：

```text
LLM_BASE_URL
LLM_API_KEY
LLM_MODEL=grok-4.6
LLM_REASONING_EFFORT=medium
```

## 测试

```bash
npm run lint
npm run test
npm run build
```
