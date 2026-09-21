import type { z } from "zod";
import {
  parseContract,
  RoutesInputSchema,
  RoutesResultSchema,
} from "./routes-schema";
import { llmConfigured, llmModelName } from "./llm";
import { liveRoutes } from "./routes-live";
import { getMockRoutes } from "./routes-mock";

type RoutesInput = z.infer<typeof RoutesInputSchema>;
type RoutesResult = z.infer<typeof RoutesResultSchema>;

export async function runRoutesGeneration(
  value: RoutesInput,
): Promise<RoutesResult> {
  const input = parseContract(RoutesInputSchema, value);

  let rawPayload: unknown;
  if (llmConfigured()) {
    // Model failure keeps current direction state, does not fallback to Mock
    rawPayload = await liveRoutes(input);
  } else {
    const mock = getMockRoutes(input.rawBrief, input.state, {
      excludeThemeNames: input.excludeThemeNames,
      refreshIndex: input.refreshIndex,
    });
    rawPayload = {
      sessionId: input.sessionId,
      requestId: input.requestId,
      routes: mock.routes,
      recommendedRouteId: mock.recommendedRouteId,
    };
  }

  const result = parseContract(RoutesResultSchema, {
    ...(rawPayload as object),
    sessionId: input.sessionId,
    requestId: input.requestId,
    mode: llmConfigured() ? "live" : "mock",
    model: llmConfigured() ? llmModelName() : null,
  });

  return result;
}
