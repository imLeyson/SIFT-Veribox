import type { VBEdge, VBNode } from "@/types";

export const BRIEF_INPUT_ID = "card-brief-input";
export const BRIEF_ID = "card-brief";
export const STATE_ID = "card-state";

const COL = 390;
const ROW = 300;

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

export function summarizeNode(node: VBNode): string {
  const d = node.data;
  if (d.kind === "brief" && d.brief) {
    return `目标：${d.brief.goal}；已知：${d.brief.known.join(" / ")}；未知：${d.brief.unknown.join(" / ")}；避免：${d.brief.constraints.join(" / ")}`;
  }
  if (d.kind === "route" && d.route) {
    return `${d.route.title}｜${d.route.steps.join(" → ")}｜${d.route.purpose}`;
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
