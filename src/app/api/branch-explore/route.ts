import { NextResponse } from "next/server";
import { BranchExploreInputSchema } from "@/lib/agent/canvas-schema";
import { runBranchExplore } from "@/lib/agent/branch-explore";

export const maxDuration = 60;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求不是有效 JSON" }, { status: 400 });
  }

  const input = BranchExploreInputSchema.safeParse(body);
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
    const result = await runBranchExplore(input.data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "分支探索生成失败，请重试",
      },
      { status: 502 },
    );
  }
}
