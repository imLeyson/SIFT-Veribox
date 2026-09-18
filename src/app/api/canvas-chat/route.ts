import { NextResponse } from "next/server";
import { liveCanvasChat } from "@/lib/agent/canvas-chat";
import { agentInfo } from "@/lib/agent";
import type { VBEdge, VBNode } from "@/types";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message?: string;
      nodes?: VBNode[];
      edges?: VBEdge[];
      selectedId?: string | null;
    };
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "请输入内容" }, { status: 400 });
    }

    const data = await liveCanvasChat(
      message,
      body.nodes ?? [],
      body.edges ?? [],
      body.selectedId ?? null
    );

    return NextResponse.json({ data, ...agentInfo() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "对话失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
