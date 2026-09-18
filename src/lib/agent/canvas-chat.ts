import type { AgentContext, AgentQuestion, VBEdge, VBNode } from "@/types";
import { llmConfigured } from "./llm";
import { liveCanvasChatRaw } from "./live";
import { mockCanvasChat } from "./canvas-chat-mock";
import { serializeCanvas } from "@/lib/canvas-graph";
import { parseOrThrow, CanvasChatSchema } from "./schema";
import { dedupeQuestions, normalizeQuestions } from "./questions";

export async function liveCanvasChat(
  message: string,
  nodes: VBNode[],
  edges: VBEdge[],
  selectedId: string | null,
  nodeIds?: string[],
  ctx: AgentContext = {}
): Promise<{
  reply: string;
  cards: { title: string; body: string; parentId: string | null }[];
  questions: AgentQuestion[];
}> {
  const ids = new Set(
    (nodeIds && nodeIds.length ? nodeIds : nodes.map((n) => n.id)).filter(Boolean)
  );
  const canvas = serializeCanvas(nodes, edges, selectedId);
  const raw = llmConfigured()
    ? await liveCanvasChatRaw(message, canvas, ctx)
    : mockCanvasChat(message, selectedId);
  const parsed = {
    ...parseOrThrow(CanvasChatSchema, raw, "画布对话"),
    questions: "questions" in raw ? raw.questions : [],
    intent:
      "intent" in raw
        ? raw.intent
        : undefined,
  };

  const wantsCards = parsed.intent === "deepen" || parsed.intent === "edit";
  const cards = wantsCards
    ? parsed.cards.map((card) => {
        const parentId =
          card.parentId && ids.has(card.parentId)
            ? card.parentId
            : selectedId && ids.has(selectedId)
              ? selectedId
              : ([...ids][ids.size - 1] ?? null);
        if (!parentId || !ids.has(parentId)) {
          throw new Error("画布对话的 parentId 必须对应已有卡片");
        }
        return { ...card, parentId };
      })
    : [];

  return {
    reply: parsed.reply,
    cards,
    questions: dedupeQuestions(
      normalizeQuestions(parsed.questions, "chat"),
      [
        ...(ctx.askedQuestions ?? []),
        ...((ctx.answers ?? []).map((a) => ({ id: a.questionId }))),
      ]
    ),
  };
}
