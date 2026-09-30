import { z } from "zod";

export const AITaskModeSchema = z.enum(["co_create", "synthesize", "judge"]);
export type AITaskMode = z.infer<typeof AITaskModeSchema>;

export const AITaskModeLabels: Record<AITaskMode, string> = {
  co_create: "共创发散",
  synthesize: "整理沉淀",
  judge: "判断比较",
};

export const AITaskModeTitles: Record<AITaskMode, string> = {
  co_create: "共创发散草案",
  synthesize: "阶段性方向整理",
  judge: "方向比较草案",
};

export const AIClaimSchema = z.object({
  text: z.string(),
  sourceCardIds: z.array(z.string()).default([]),
  kind: z.enum(["observation", "inference", "recommendation"]),
});

export const SuggestedArtifactSchema = z.object({
  type: z.enum(["note", "route", "comparison"]),
  title: z.string(),
  content: z.string(),
});

export const AITaskResultSchema = z.object({
  mode: AITaskModeSchema,
  title: z.string(),
  reply: z.string(),
  claims: z.array(AIClaimSchema),
  suggestedArtifacts: z.array(SuggestedArtifactSchema),
});

export type AIClaim = z.infer<typeof AIClaimSchema>;
export type SuggestedArtifact = z.infer<typeof SuggestedArtifactSchema>;
export type AITaskResult = z.infer<typeof AITaskResultSchema>;

type RouteSource = { id: string };
type SourceCard = {
  id: string;
  type?: string;
  content?: string;
  data?: Record<string, unknown> & { route?: { id?: string } };
};

/**
 * Keep chat provenance scoped to actual design inputs instead of every canvas node.
 * System routes use a stable `route-{id}` fallback; custom route cards keep their
 * own card id so saved artifacts can be traced back to the canvas.
 */
export function collectGlobalChatSourceCardIds(
  routes: RouteSource[] = [],
  customCards: SourceCard[] = [],
): string[] {
  const ids: string[] = [];
  const add = (id: string | undefined) => {
    if (id && !ids.includes(id)) ids.push(id);
  };

  routes.forEach((route) => {
    const customRoute = customCards.find(
      (card) => card.type === "route" && card.data?.route?.id === route.id,
    );
    add(customRoute?.id ?? `route-${route.id}`);
  });

  customCards.forEach((card) => {
    if (card.type === "note" && card.content?.trim()) add(card.id);
    if (card.type === "image" || card.type === "imageGen") add(card.id);
  });

  return ids;
}
