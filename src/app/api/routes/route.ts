import { NextResponse } from "next/server";
import { agentInfo, generateRoutes } from "@/lib/agent";
import type { Brief, StartingState } from "@/types";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      brief?: Brief;
      starting_state?: StartingState;
      user_initial_idea?: string[];
    };

    if (!body.brief || !body.starting_state) {
      return NextResponse.json(
        { error: "缺少 brief 或 starting_state" },
        { status: 400 }
      );
    }

    const data = await generateRoutes(
      body.brief,
      body.starting_state,
      body.user_initial_idea ?? []
    );
    return NextResponse.json({ data, ...agentInfo() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "路线生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
