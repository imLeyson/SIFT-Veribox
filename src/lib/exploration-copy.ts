import type { DesignState } from "@/types/convergence";

export function compactText(value: string | null | undefined, maxLength = 96): string {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function getBriefAnchor(
  rawBrief: string,
  goal?: string | null,
): string {
  return compactText(goal || rawBrief, 92) || "尚未填写 Brief";
}

export function getConvergenceAnchor(state: DesignState | null): string {
  if (!state) return "等待方向收敛";
  return compactText(
    state.direction.intent?.text ||
      state.direction.priorities[0]?.text ||
      state.currentHypothesis ||
      state.brief.goal,
    88,
  ) || "方向已生成，保留多种视觉可能";
}

export function getPrioritiesAnchor(state: DesignState | null, maxItems = 2): string[] {
  if (!state?.direction.priorities?.length) return [];
  return state.direction.priorities
    .map((p) => compactText(p.text, 50))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function getAvoidAnchor(state: DesignState | null, maxItems = 2): string[] {
  if (!state?.direction.avoid?.length) return [];
  return state.direction.avoid
    .map((a) => compactText(a.text, 50))
    .filter(Boolean)
    .slice(0, maxItems);
}

/**
 * Keep generated source descriptions useful for visual research instead of
 * making the early exploration phase sound like a manufacturing review.
 */
export function toInspirationCopy(value: string | null | undefined): string {
  return (value ?? "")
    // Remove specific grammage like 300g, 400g, 157g
    .replace(/(\b|\D)\d{2,4}\s*g(?=[^\w]|$)/gi, "$1")
    .replace(/\b\d{2,4}克(?:重)?/g, "")
    // Remove manufacturing factory phrases & QC warnings
    .replace(/需警惕压凹过深导致纸面破裂或过浅失去触感[，,、]?\s*/g, "需避免压凹过重破坏视觉平整度，")
    .replace(/压凹过深导致纸面破裂[，,、]?\s*/g, "压凹过重破坏整体雅致，")
    .replace(/(?:棉纸|特种纸|纸张)?克重与(?:压凹)?压力需精确匹配[，,、]?\s*/g, "")
    .replace(/否则易显廉价[。.]?/g, "否则易削弱整体高级感。")
    .replace(/，，/g, "，")
    .replace(/、、/g, "、")
    // Replace landing and production terms with visual inspiration language
    .replace(/商业落地/g, "商业案例")
    .replace(/落地法/g, "灵感演绎")
    .replace(/落地案/g, "完整案例")
    .replace(/落地性/g, "表现力")
    .replace(/工程落地/g, "视觉探索")
    .replace(/平衡落地/g, "兼顾美感")
    .replace(/落地/g, "参考")
    .replace(/生产级/g, "成熟")
    .replace(/生产截图/g, "真实界面截图")
    .replace(/打样/g, "质感实拍")
    .replace(/样张/g, "参考图")
    .replace(/实物/g, "参考")
    .replace(/必须严控/g, "可继续观察")
    .replace(/需精准控制/g, "可在视觉对照中关注")
    .replace(/需在结构上设置/g, "可进一步观察")
    .replace(/需选配/g, "可进一步观察")
    .replace(/无法量产结构/g, "复杂的结构细节")
    .replace(/验收/g, "判断")
    .replace(/检验/g, "观察")
    .replace(/测试/g, "对照")
    .trim();
}
