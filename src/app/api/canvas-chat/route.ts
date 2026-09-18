import { NextResponse } from "next/server";
import { liveCanvasChat } from "@/lib/agent/canvas-chat";
import { wrap } from "@/lib/agent";
import { parseAnswers } from "@/lib/agent/questions";
import type { AgentQuestion, ChatMessage, VBEdge, VBNode } from "@/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message?: string;
      nodes?: VBNode[];
      edges?: VBEdge[];
      selectedId?: string | null;
      nodeIds?: string[];
      canvas?: unknown;
      answers?: unknown;
      askedQuestions?: AgentQuestion[];
      recent_messages?: Pick<ChatMessage, "role" | "content">[];
      sessionVersion?: number;
    };
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "请输入内容" }, { status: 400 });
    }

    const parsed = await liveCanvasChat(
      message,
      body.nodes ?? [],
      body.edges ?? [],
      body.selectedId ?? null,
      body.nodeIds,
      {
        answers: parseAnswers(body.answers),
        askedQuestions: body.askedQuestions,
        recentMessages: body.recent_messages,
        canvas: body.canvas,
      }
    );

    return NextResponse.json(
      wrap(
        { reply: parsed.reply, cards: parsed.cards },
        parsed.questions,
        Number((body as { sessionVersion?: number }).sessionVersion ?? 0) + 1
      )
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "对话失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
