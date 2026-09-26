import { NextResponse } from "next/server";
import { z } from "zod";
import { generateImageWithGpt } from "@/lib/agent/image-gen";

export const maxDuration = 60;

const ImageGenInputSchema = z.object({
  prompt: z.string().min(1, "提示词不能为空").max(2000, "提示词不能超过2000字"),
  aspectRatio: z.enum(["1:1", "3:4", "4:3", "16:9", "9:16"]).optional(),
  stylePreset: z.enum(["realistic", "minimal", "clay", "cinematic"]).optional(),
  referenceImageUrl: z.string().optional(),
  refWeight: z.number().min(0).max(100).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误，必须为 JSON" }, { status: 400 });
  }

  const parseResult = ImageGenInputSchema.safeParse(body);
  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues.map((i) => i.message).join("；");
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  try {
    const result = await generateImageWithGpt(parseResult.data);
    return NextResponse.json({
      success: true,
      url: result.url,
      revisedPrompt: result.revisedPrompt,
      created: result.created,
    });
  } catch (error: any) {
    console.error("[API image-gen error]:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "图片生成服务调用失败，请重试",
      },
      { status: 502 },
    );
  }
}
