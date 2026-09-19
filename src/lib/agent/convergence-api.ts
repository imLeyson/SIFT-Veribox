import { NextResponse } from "next/server";
import { ConvergenceInputSchema } from "./convergence-schema";
import { runConvergenceTurn } from "./convergence";

export async function handleTurn(request: Request, start: boolean) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求不是有效 JSON" }, { status: 400 });
  }
  const input = ConvergenceInputSchema.safeParse(body);
  if (!input.success)
    return NextResponse.json(
      {
        error: input.error.issues
          .slice(0, 3)
          .map((i) => i.message)
          .join("；"),
      },
      { status: 400 },
    );
  if ((input.data.event.type === "start") !== start)
    return NextResponse.json(
      { error: "请求类型与接口不匹配" },
      { status: 400 },
    );
  try {
    return NextResponse.json(await runConvergenceTurn(input.data));
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "状态更新失败，请重试",
      },
      { status: 502 },
    );
  }
}
