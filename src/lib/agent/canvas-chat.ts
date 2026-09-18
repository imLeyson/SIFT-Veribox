import type { VBEdge, VBNode } from "@/types";
import { llmConfigured } from "./llm";
import { liveCanvasChatRaw } from "./live";
import { mockCanvasChat } from "./canvas-chat-mock";
import { serializeCanvas } from "@/lib/canvas-graph";
import { parseOrThrow, CanvasChatSchema } from "./schema";

export async function liveCanvasChat(
  message: string,
  nodes: VBNode[],
  edges: VBEdge[],
  selectedId: string | null,
  nodeIds?: string[]
): Promise<{
  reply: string;
  cards: { title: string; body: string; parentId: string | null }[];
}> {
  const ids = new Set(
    (nodeIds && nodeIds.length ? nodeIds : nodes.map((n) => n.id)).filter(Boolean)
  );
  const canvas = serializeCanvas(nodes, edges, selectedId);
  const parsed = llmConfigured()
    ? await liveCanvasChatRaw(message, canvas)
    : parseOrThrow(
        CanvasChatSchema,
        mockCanvasChat(message, selectedId),
        "画布对话"
      );

  const cards = parsed.cards.map((card) => {
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
  });

  return { reply: parsed.reply, cards };
}
