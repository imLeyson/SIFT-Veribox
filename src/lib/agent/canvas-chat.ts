import type { VBEdge, VBNode } from "@/types";
import { completeJson } from "./llm";
import { serializeCanvas } from "@/lib/canvas-graph";

export async function liveCanvasChat(
  message: string,
  nodes: VBNode[],
  edges: VBEdge[],
  selectedId: string | null
): Promise<{
  reply: string;
  cards: { title: string; body: string; parentId: string | null }[];
}> {
  const canvas = serializeCanvas(nodes, edges, selectedId);
  const data = await completeJson<Record<string, unknown>>(
    `你是 Veribox，画布上的视觉探索智能体。你会「看见」整张无限画布：每张卡片的内容、连线、以及用户当前焦点。
先真正思考：画布上已经有什么、缺什么、用户这句话是要开新枝还是收窄。
只返回 JSON：
{
  "reply": "对设计师说的话，短，像同事。先点明你从画布里读到了什么，再说你加了什么。",
  "cards": [
    {
      "title": "短标题",
      "body": "可执行正文。若是搜索任务，写出中文词 + 英文词 + 建议网站。不要空话。",
      "parentId": "挂到已有卡片 id"
    }
  ]
}

硬性规则：
1. 先读 cards[] 和 links[]，禁止假装没看见 Brief / 方案 / 搜索卡。
2. 默认在焦点右侧长出 1-3 张新卡片，形成树状分支。不要重做整条主流程。
3. 卡片必须可执行：更窄的搜索词、对照假设、竞品切口、材质/结构、需要用户拍板的问题。
4. parentId 必须是画布上已有 id；没有则用 selected_id。
5. 不要替用户决定最终风格。
6. 中文。`,
    JSON.stringify({ message, canvas }, null, 2),
    "medium"
  );

  const reply =
    typeof data.reply === "string"
      ? data.reply.trim()
      : "我根据画布加了几张卡片。";
  const cardsRaw = Array.isArray(data.cards) ? data.cards : [];
  const cards = cardsRaw
    .map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const title = typeof row.title === "string" ? row.title.trim() : "";
      const body = typeof row.body === "string" ? row.body.trim() : "";
      const parentId =
        typeof row.parentId === "string" && row.parentId
          ? row.parentId
          : selectedId;
      if (!title || !body) return null;
      return { title, body, parentId };
    })
    .filter((c): c is { title: string; body: string; parentId: string | null } =>
      Boolean(c)
    );

  return { reply, cards };
}
