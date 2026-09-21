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

/**
 * Keep generated source descriptions useful for visual research instead of
 * making the early exploration phase sound like a manufacturing review.
 */
export function toInspirationCopy(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/商业落地/g, "商业案例")
    .replace(/落地案/g, "完整案例")
    .replace(/落地/g, "案例")
    .replace(/生产级/g, "成熟")
    .replace(/生产截图/g, "真实界面截图")
    .replace(/打样/g, "质感实拍")
    .replace(/样张/g, "参考图")
    .replace(/实物/g, "参考")
    .replace(/必须严控/g, "可继续观察")
    .replace(/需精准控制/g, "可在视觉对照中关注")
    .replace(/需在结构上设置/g, "可进一步观察")
    .replace(/需选配/g, "可进一步观察")
    .replace(/无法量产结构/g, "与批量生产相关的结构细节")
    .replace(/验收/g, "判断")
    .replace(/检验/g, "观察")
    .replace(/测试/g, "对照")
    .trim();
}
