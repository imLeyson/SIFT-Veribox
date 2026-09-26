import { NextResponse } from "next/server";
import { z } from "zod";
import { executeCardChat } from "@/lib/agent/card-chat";

export const maxDuration = 60;

const CardChatRequestSchema = z.object({
  cardType: z.enum(["imageGen", "platformPlan", "route", "state", "note"]),
  cardTitle: z.string().default("卡片"),
  cardData: z.record(z.string(), z.any()).default({}),
  upstreamContext: z
    .object({
      goal: z.string().optional(),
      themeName: z.string().optional(),
      strategyIntent: z.string().optional(),
      priorities: z.array(z.string()).optional(),
      avoid: z.array(z.string()).optional(),
      criteria: z.array(z.string()).optional(),
    })
    .optional(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1, "消息内容不能为空"),
    }),
  ).min(1, "至少需要包含一条消息"),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误，必须为 JSON" }, { status: 400 });
  }

  const parseResult = CardChatRequestSchema.safeParse(body);
  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues.map((i) => i.message).join("；");
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  try {
    const result = await executeCardChat(parseResult.data);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[API card-chat error]:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "卡片协同对话处理失败",
      },
      { status: 500 },
    );
  }
}
