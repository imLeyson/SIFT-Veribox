import { NextResponse } from "next/server";
import { RoutesInputSchema } from "@/lib/agent/routes-schema";
import { runRoutesGeneration } from "@/lib/agent/routes";

export const maxDuration = 60;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求不是有效 JSON" }, { status: 400 });
  }

  const input = RoutesInputSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(
      {
        error: input.error.issues
          .slice(0, 3)
          .map((i) => i.message)
          .join("；"),
      },
      { status: 400 },
    );
  }

  try {
    const result = await runRoutesGeneration(input.data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "生成探索路线失败，请重试",
      },
      { status: 502 },
    );
  }
}
