import { NextResponse } from "next/server";
import { agentInfo, parseBrief } from "@/lib/agent";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { brief?: string };
    const brief = body.brief?.trim();
    if (!brief) {
      return NextResponse.json({ error: "Brief 不能为空" }, { status: 400 });
    }

    const data = await parseBrief(brief);
    return NextResponse.json({ data, ...agentInfo() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "解析失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
