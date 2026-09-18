import { NextResponse } from "next/server";
import { clarifyBrief, wrap } from "@/lib/agent";
import type { AgentAnswer, Brief } from "@/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      brief?: Brief;
      answers?: AgentAnswer[];
      round?: number;
      sessionVersion?: number;
    };
    if (!body.brief) {
      return NextResponse.json({ error: "缺少 Brief" }, { status: 400 });
    }
    const parsed = await clarifyBrief(
      body.brief,
      body.answers ?? [],
      body.round ?? 1
    );
    return NextResponse.json({
      ...wrap(parsed.brief, parsed.questions, (body.sessionVersion ?? 0) + 1),
      stall: parsed.stall,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "确认失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
