import { NextResponse } from "next/server";
import { parseBrief, wrap } from "@/lib/agent";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      brief?: string;
      sessionVersion?: number;
    };
    const brief = body.brief?.trim();
    if (!brief) {
      return NextResponse.json({ error: "Brief 不能为空" }, { status: 400 });
    }
    const parsed = await parseBrief(brief);
    return NextResponse.json(
      wrap(parsed.brief, parsed.questions, (body.sessionVersion ?? 0) + 1)
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "解析失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
