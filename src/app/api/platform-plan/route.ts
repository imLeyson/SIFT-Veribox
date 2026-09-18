import { NextResponse } from "next/server";
import { planPlatforms, wrap } from "@/lib/agent";
import type { Brief, ExplorationRoute } from "@/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      brief?: Brief;
      selected_route?: ExplorationRoute;
      active_step?: string;
      sessionVersion?: number;
    };

    if (!body.brief || !body.active_step) {
      return NextResponse.json(
        { error: "缺少 brief 或 active_step" },
        { status: 400 }
      );
    }

    const parsed = await planPlatforms(
      body.brief,
      body.selected_route,
      body.active_step
    );
    return NextResponse.json(
      wrap(parsed.plan, parsed.questions, (body.sessionVersion ?? 0) + 1)
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "平台计划生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
