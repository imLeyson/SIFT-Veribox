import { NextResponse } from "next/server";
import {
  PlatformPlanInputSchema,
  PlatformPlanSchema,
} from "@/lib/agent/routes-schema";
import { enrichPlatformPlan } from "@/lib/agent/inspiration-retrieval";

export const maxDuration = 60;

const InspirationSearchInputSchema = PlatformPlanInputSchema.extend({
  plan: PlatformPlanSchema,
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求不是有效 JSON" }, { status: 400 });
  }

  const input = InspirationSearchInputSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(
      {
        error: input.error.issues
          .slice(0, 3)
          .map((issue) => issue.message)
          .join("；"),
      },
      { status: 400 },
    );
  }

  try {
    const plan = await enrichPlatformPlan(input.data, input.data.plan);
    return NextResponse.json({ plan });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "真实灵感检索失败，请重试",
      },
      { status: 502 },
    );
  }
}
