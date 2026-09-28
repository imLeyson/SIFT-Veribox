import type { z } from "zod";
import {
  parseContract,
  PlatformPlanInputSchema,
  PlatformPlanResultSchema,
} from "./routes-schema";
import { llmConfigured, llmModelName } from "./llm";
import { livePlatformPlan } from "./platform-live";
import { getMockPlatformPlan } from "./platform-mock";
import { enrichPlatformPlan } from "./inspiration-retrieval";

type PlatformPlanInput = z.infer<typeof PlatformPlanInputSchema>;
type PlatformPlanResult = z.infer<typeof PlatformPlanResultSchema>;

export async function runPlatformPlanGeneration(
  value: PlatformPlanInput,
): Promise<PlatformPlanResult> {
  const input = parseContract(PlatformPlanInputSchema, value);

  let rawPayload: unknown;
  if (llmConfigured()) {
    rawPayload = await livePlatformPlan(input);
  } else {
    const mock = getMockPlatformPlan(
      input.state,
      input.selectedRoute,
      input.currentStep,
    );
    rawPayload = {
      sessionId: input.sessionId,
      requestId: input.requestId,
      plan: mock,
    };
  }

  // Keyword generation is only the first pass. Review real pages before the
  // result reaches the canvas so every returned inspiration source carries
  // inspectable evidence (or an explicit unavailable state).
  if (rawPayload && typeof rawPayload === "object" && "plan" in rawPayload) {
    const payload = rawPayload as { plan: unknown };
    payload.plan = await enrichPlatformPlan(
      input,
      payload.plan as z.infer<typeof PlatformPlanResultSchema>["plan"],
    );
  }

  const result = parseContract(PlatformPlanResultSchema, {
    ...(rawPayload as object),
    sessionId: input.sessionId,
    requestId: input.requestId,
    mode: llmConfigured() ? "live" : "mock",
    model: llmConfigured() ? llmModelName() : null,
  });

  return result;
}
