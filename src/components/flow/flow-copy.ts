export function questionSubmitLabel(
  answeredCount: number,
  questionCount: number,
  disabled: boolean,
): string {
  if (disabled) return "正在整理判断…";
  if (answeredCount === questionCount) return "确认视觉取向 →";
  if (answeredCount > 0) return `确认已选 (${answeredCount}/${questionCount}) 并继续 →`;
  return "直接继续，生成策略 →";
}

export function revisionLabel(revision: number): string {
  return revision > 0 ? `第 ${revision} 次记录` : "决策记录";
}
