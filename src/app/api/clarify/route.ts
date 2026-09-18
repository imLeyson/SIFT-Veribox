import { NextResponse } from "next/server";
import { agentInfo, clarifyBrief } from "@/lib/agent";
import type { Brief } from "@/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      brief?: Brief;
      picks?: { id: string; prompt: string; choice: string | null }[];
      round?: number;
    };
    if (!body.brief) {
      return NextResponse.json({ error: "缺少 Brief" }, { status: 400 });
    }
    const data = await clarifyBrief(
      body.brief,
      body.picks ?? [],
      body.round ?? 1
    );
    return NextResponse.json({ data, ...agentInfo() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "确认失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
