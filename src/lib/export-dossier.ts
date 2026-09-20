import type { SiftStore } from "./convergence-store";

export function generateDossierMarkdown(store: Partial<SiftStore>): string {
  const {
    rawBrief,
    state,
    routes = [],
    selectedRouteId,
    activeStepId,
    platformPlans = [],
    stepNotes = {},
    completedCriteria = {},
  } = store;

  const now = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);
  const goalTitle = state?.brief.goal ?? "未命名设计探索项目";

  const lines: string[] = [];

  // Header
  lines.push(`# 🎨 SIFT 设计探索与收敛提案简报`);
  lines.push(`> 项目：**${goalTitle}**  `);
  lines.push(`> 生成时间：${now} · 工具：SIFT AI 探索副驾\n`);

  // Section 00: Brief
  lines.push(`## 00 原始设计任务 (Brief)`);
  lines.push(`\`\`\`text\n${rawBrief?.trim() || "暂无输入 Brief"}\n\`\`\`\n`);
  if (state?.brief.audience || state?.brief.deliverable) {
    lines.push(`- **目标受众**：${state.brief.audience || "未明确"}`);
    lines.push(`- **核心交付物**：${state.brief.deliverable || "未明确"}\n`);
  }

  // Section 01: Direction & Convergence
  if (state) {
    lines.push(`## 01 方向收敛与设计边界 (Convergence)`);
    if (state.direction.intent?.text) {
      lines.push(`### 🎯 核心设计意图\n${state.direction.intent.text}\n`);
    }

    if (state.currentHypothesis) {
      lines.push(`### 💡 当前设计假设\n> ${state.currentHypothesis}\n`);
    }

    if (state.constraints.length > 0) {
      lines.push(`### 🔒 任务硬性约束`);
      state.constraints.forEach((c) => lines.push(`- ${c.text}`));
      lines.push("");
    }

    if (state.direction.priorities.length > 0) {
      lines.push(`### 🌟 优先坚持 (Priorities)`);
      state.direction.priorities.forEach((p) => lines.push(`- ✅ ${p.text}`));
      lines.push("");
    }

    if (state.direction.avoid.length > 0) {
      lines.push(`### 🚫 坚决避免 (Avoidances)`);
      state.direction.avoid.forEach((a) => lines.push(`- ❌ ${a.text}`));
      lines.push("");
    }

    if (state.direction.criteria.length > 0) {
      lines.push(`### ⚖️ 判断准则 (Evaluation Criteria)`);
      state.direction.criteria.forEach((c) => lines.push(`- 📏 ${c.text}`));
      lines.push("");
    }

    if (state.uncertainties.length > 0) {
      lines.push(`### ❓ 待定与暂缓未决项`);
      state.uncertainties.forEach((u) => {
        const tag = u.status === "deferred" ? "【暂缓】" : "【待验证】";
        lines.push(`- ${tag} **${u.topic}**：影响决策《${u.decisionAffected}》`);
      });
      lines.push("");
    }
  }

  // Section 02: Selected Theme
  if (selectedRoute) {
    lines.push(`## 02 选定设计主题 (Chosen Design Theme)`);
    const themeHeading = selectedRoute.themeName
      ? `${selectedRoute.themeName} — ${selectedRoute.title}`
      : selectedRoute.title;
    lines.push(`### 📌 ${themeHeading}`);
    if (selectedRoute.visualSnapshot) {
      lines.push(`- **画面效果快照**：${selectedRoute.visualSnapshot}`);
    }
    lines.push(`- **切入起点**：${selectedRoute.startingPoint}`);
    if (selectedRoute.timeframe) {
      lines.push(`- **预计周期**：${selectedRoute.timeframe}`);
    }
    if (selectedRoute.feasibility) {
      const labels = {
        high: "落地可行性高",
        medium: "落地难度适中",
        challenging: "挑战型创新工艺",
      };
      lines.push(`- **工艺可行性**：${labels[selectedRoute.feasibility]}`);
    }
    if (selectedRoute.recommendedReason) {
      lines.push(`- **决策理由**：${selectedRoute.recommendedReason}`);
    }
    lines.push(`- **核心突破问题**：${selectedRoute.coreProblem}`);
    lines.push(`- **预期目标**：${selectedRoute.purpose}`);
    lines.push(`- **视觉亮点**：${selectedRoute.pros}`);
    lines.push(`- **防跑偏提示**：${selectedRoute.cons}\n`);

    // Section 03: Steps & Execution
    lines.push(`## 03 探索步骤推进与验收清单 (Steps & Execution)`);

    selectedRoute.steps.forEach((st, idx) => {
      const isCurrent = st.id === activeStepId;
      const checked = completedCriteria[st.id] ?? [];
      const totalCrit = st.acceptanceCriteria?.length ?? 0;
      const notes = stepNotes[st.id] ?? [];

      lines.push(`### Step 0${idx + 1} · ${st.title} ${isCurrent ? "*(当前推进中)*" : ""}`);
      lines.push(`- **核心问题**：${st.question}`);
      lines.push(`- **探索目的**：${st.purpose}`);

      if (st.deliverables && st.deliverables.length > 0) {
        lines.push(`- **交付物清单**：`);
        st.deliverables.forEach((d) => lines.push(`  - 📦 ${d}`));
      }

      if (st.acceptanceCriteria && st.acceptanceCriteria.length > 0) {
        lines.push(`- **阶段验收核验 (${checked.length}/${totalCrit} 已通过)**：`);
        st.acceptanceCriteria.forEach((crit) => {
          const isDone = checked.includes(crit);
          lines.push(`  - [${isDone ? "x" : " "}] ${crit}`);
        });
      }

      if (notes.length > 0) {
        lines.push(`- **设计师探索手记与灵感归档**：`);
        notes.forEach((n) => lines.push(`  - 📝 ${n}`));
      }

      // Attached platform plan for this step
      const plan = platformPlans.find((p) => p.stepId === st.id);
      if (plan) {
        lines.push(`\n#### 🔍 Step 0${idx + 1} 推荐搜索方案与关键词资产`);
        plan.primarySources.forEach((src, sIdx) => {
          lines.push(`**${sIdx + 1}. ${src.platform}** (角色定位：${src.roleTag})`);
          lines.push(`- *推荐依据*：${src.reason}`);
          lines.push(`- *搜索直达*：[在新标签页打开搜索](${src.searchUrl})`);
          lines.push(`- *关键词组合*：`);
          src.keywords.forEach((k) => {
            const typeTag = k.searchType ? ` [${k.searchType}]` : "";
            const adv = k.advancedQuery ? ` *(去样机语法: \`${k.advancedQuery}\`)*` : "";
            lines.push(`  - \`${k.keyword}\`${typeTag} — ${k.meaning}${adv}`);
          });
          lines.push("");
        });
      }

      lines.push("---\n");
    });
  } else if (routes.length > 0) {
    lines.push(`## 02 生成的备选设计主题 (${routes.length} 个待选)`);
    routes.forEach((r, idx) => {
      const themeTitle = r.themeName ? `${r.themeName} — ${r.title}` : r.title;
      lines.push(`### 主题 0${idx + 1}：${themeTitle}`);
      if (r.visualSnapshot) {
        lines.push(`- **画面效果快照**：${r.visualSnapshot}`);
      }
      lines.push(`- **切入起点**：${r.startingPoint}`);
      lines.push(`- **核心问题**：${r.coreProblem}`);
      lines.push(`- **视觉亮点 / 防跑偏**：${r.pros} / ${r.cons}\n`);
    });
  }

  lines.push(`\n---\n*由 SIFT 生成 · 助力设计师完成从 Brief 到落地交付的探索收敛*`);

  return lines.join("\n");
}
