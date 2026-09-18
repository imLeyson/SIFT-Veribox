import { NextResponse } from "next/server";
import { generateRoutes, wrap } from "@/lib/agent";
import { parseAnswers } from "@/lib/agent/questions";
import type { AgentQuestion, Brief, ChatMessage } from "@/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      brief?: Brief;
      user_initial_idea?: string[];
      answers?: unknown;
      askedQuestions?: AgentQuestion[];
      recent_messages?: Pick<ChatMessage, "role" | "content">[];
      canvas?: unknown;
      force?: boolean;
      sessionVersion?: number;
    };

    if (!body.brief) {
      return NextResponse.json({ error: "缺少 brief" }, { status: 400 });
    }

    const parsed = await generateRoutes(
      body.brief,
      body.user_initial_idea?.length ? "has_idea" : "no_idea",
      body.user_initial_idea ?? [],
      {
        answers: parseAnswers(body.answers),
        askedQuestions: body.askedQuestions,
        recentMessages: body.recent_messages,
        canvas: body.canvas,
        force: body.force,
      }
    );
    return NextResponse.json(
      wrap(parsed.payload, parsed.questions, (body.sessionVersion ?? 0) + 1)
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "路线生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
