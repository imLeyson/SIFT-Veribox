import { NextResponse } from "next/server";
import { z } from "zod";
import { executeGlobalChat, type GlobalChatRequest } from "@/lib/agent/global-chat";
import { AITaskModeSchema, AITaskResultSchema } from "@/lib/agent/ai-task";

export const maxDuration = 60;

const GlobalChatRouteContextSchema = z.object({
  rawBrief: z.string().optional(),
  goal: z.string().optional(),
  audience: z.string().optional(),
  deliverable: z.string().optional(),
  strategyIntent: z.string().optional(),
  currentHypothesis: z.string().optional(),
  constraints: z.array(z.string()).optional(),
  priorities: z.array(z.string()).optional(),
  avoid: z.array(z.string()).optional(),
  criteria: z.array(z.string()).optional(),
  routes: z.array(
    z.object({
      title: z.string(),
      themeName: z.string().optional(),
      visualSnapshot: z.string().optional(),
      pros: z.string().optional(),
      cons: z.string().optional(),
      coreProblem: z.string().optional(),
      isSelected: z.boolean().optional(),
    }),
  ).optional(),
  imageGenPrompts: z.array(z.string()).optional(),
  imageUrls: z.array(z.string()).optional(),
  notes: z.array(z.string()).optional(),
}).default({});

const GlobalChatRouteRequestSchema = z.object({
  mode: AITaskModeSchema.default("co_create"),
  sourceCardIds: z.array(z.string()).default([]),
  context: GlobalChatRouteContextSchema,
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

  const parseResult = GlobalChatRouteRequestSchema.safeParse(body);
  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues.map((i) => i.message).join("；");
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  try {
    const result = await executeGlobalChat(parseResult.data as GlobalChatRequest);
    return NextResponse.json(AITaskResultSchema.parse(result));
  } catch (error: unknown) {
    console.error("[API global-chat error]:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "全局协同对话处理失败",
      },
      { status: 500 },
    );
  }
}
