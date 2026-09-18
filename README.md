# Veribox · Exploration Agent MVP

基于 `Veribox_Exploration_Agent_MVP_PRD_v0.1.md` 的可交互 Demo。

## 流程

Brief 输入 → Brief 确认 → 探索状态 → 3 条探索路线 → 平台搜索计划

## 启动

```bash
cd veribox-mvp
npm install
npm run dev
```

打开 http://localhost:3000

当前 Agent 使用 **mock structured output**（无需 API Key），覆盖护肤 Brief 示例与通用回退。

## 技术栈

- Next.js App Router + TypeScript + Tailwind CSS
- Zustand + LocalStorage
- Lucide icons
