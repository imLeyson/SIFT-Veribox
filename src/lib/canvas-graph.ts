import type { QuestionStage, VBEdge, VBNode } from "@/types";

export const BRIEF_INPUT_ID = "card-brief-input";
export const BRIEF_ID = "card-brief";
export const STATE_ID = "card-state";

export function stripStateCards(nodes: VBNode[], edges: VBEdge[]) {
  const removed = new Set(
    nodes
      .filter((n) => n.type === "state" || n.id === STATE_ID || n.data.kind === "state")
      .map((n) => n.id)
  );
  if (!removed.size) return { nodes, edges };
  const nextNodes = nodes.filter((n) => !removed.has(n.id));
  const outgoing = edges.filter((e) => removed.has(e.source));
  const kept = edges.filter(
    (e) => !removed.has(e.source) && !removed.has(e.target)
  );
  const extra = outgoing.map((e) =>
    link(BRIEF_ID, e.target, typeof e.label === "string" ? e.label : undefined)
  );
  return { nodes: nextNodes, edges: [...kept, ...extra] };
}

const COL = 420;
const ROW = 460;

export function seedNodes(): VBNode[] {
  return [
    {
      id: BRIEF_INPUT_ID,
      type: "briefInput",
      position: { x: 60, y: 160 },
      data: { kind: "briefInput", title: "开始探索" },
      dragHandle: ".card-drag",
    },
  ];
}

export function childPosition(
  parent: VBNode | undefined,
  index: number,
  count: number
): { x: number; y: number } {
  const origin = parent?.position ?? { x: 60, y: 160 };
  const x = origin.x + COL;
  const y = origin.y + (index - (count - 1) / 2) * ROW;
  return { x, y };
}

export function link(
  source: string,
  target: string,
  label?: string
): VBEdge {
  return {
    id: `e-${source}-${target}`,
    source,
    target,
    label,
    type: "smoothstep",
  };
}

export function latestAskId(
  nodes: VBNode[],
  stages?: QuestionStage[]
): string | null {
  const match = [...nodes]
    .reverse()
    .find(
      (n) =>
        n.data.kind === "ask" &&
        (!stages || (n.data.ask && stages.includes(n.data.ask.stage)))
    );
  return match?.id ?? null;
}

export function askParentId(
  nodes: VBNode[],
  stage: QuestionStage,
  selectedId: string | null
): string {
  const chained = latestAskId(nodes);
  if (chained) return chained;
  if (stage === "platform") {
    const route =
      nodes.find((n) => n.data.kind === "route" && !n.data.dimmed) ??
      nodes.find((n) => n.id === selectedId && n.data.kind === "route");
    if (route) return route.id;
  }
  if (stage === "chat" && selectedId && nodes.some((n) => n.id === selectedId)) {
    return selectedId;
  }
  return nodes.some((n) => n.id === BRIEF_ID) ? BRIEF_ID : BRIEF_INPUT_ID;
}

export function summarizeNode(node: VBNode): string {
  const d = node.data;
  if (d.kind === "brief" && d.brief) {
    return `目标：${d.brief.goal}；已知：${d.brief.known.join(" / ")}；未知：${d.brief.unknown.join(" / ")}；避免：${d.brief.constraints.join(" / ")}`;
  }
  if (d.kind === "route" && d.route) {
    return [d.route.title, d.route.steps.join(" → "), d.route.purpose]
      .filter(Boolean)
      .join("｜");
  }
  if (d.kind === "platform" && d.plan) {
    const names = d.plan.sources.map((s) => s.name).join(" → ");
    const qs = d.plan.sources
      .flatMap((s) => s.queries.slice(0, 2).map((q) => q.query))
      .join("；");
    return `${d.plan.goal}｜站点：${names}｜词：${qs}`;
  }
  if (d.kind === "state") {
    return d.body ?? d.title;
  }
  if (d.kind === "insight") {
    return `${d.title}：${d.body ?? ""}`;
  }
  if (d.kind === "ask" && d.ask) {
    return d.ask.questions
      .map((q) => {
        const answer = d.ask?.answers.find((a) => a.questionId === q.id);
        const label =
          answer?.kind === "uncertain"
            ? "暂不确定"
            : answer?.custom ||
              q.options.find((o) => o.id === answer?.optionId)?.label ||
              "未选";
        return `${q.prompt} → ${label}`;
      })
      .join("；");
  }
  return d.title;
}

export function serializeCanvas(
  nodes: VBNode[],
  edges: VBEdge[],
  selectedId: string | null
) {
  return {
    selected_id: selectedId,
    cards: nodes.map((n) => ({
      id: n.id,
      kind: n.data.kind,
      title: n.data.title,
      summary: summarizeNode(n),
    })),
    links: edges.map((e) => ({
      from: e.source,
      to: e.target,
      label: e.label ?? "",
    })),
  };
}
