import { describe, expect, it } from "vitest";
import { createSiftStore } from "./convergence-store";
import { createConvergenceActions } from "./convergence-client";
import { getMockRoutes } from "./agent/routes-mock";
import { getMockPlatformPlan } from "./agent/platform-mock";
import { EXAMPLES } from "./agent/examples";
import { runConvergenceTurn } from "./agent/convergence";
import type { ConvergenceInput } from "@/types/convergence";

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
}

describe("E2E SIFT 00–08 Flow Simulation", () => {
  it("walks through complete lifecycle from Brief to 08 external search and persists state", async () => {
    const memory = createMemoryStorage();
    const store = createSiftStore(memory);

    // Mock fetcher to handle /api/brief, /api/routes, and /api/platform-plan
    const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      const body = JSON.parse(init?.body as string);

      if (urlStr.includes("/api/brief")) {
        const turnResult = await runConvergenceTurn(body as ConvergenceInput);
        return Response.json(turnResult);
      }

      if (urlStr.includes("/api/routes")) {
        const routesData = getMockRoutes(body.rawBrief, body.state);
        return Response.json({
          sessionId: body.sessionId,
          requestId: body.requestId,
          routes: routesData.routes,
          recommendedRouteId: routesData.recommendedRouteId,
          mode: "mock",
          model: null,
        });
      }

      if (urlStr.includes("/api/platform-plan")) {
        const plan = getMockPlatformPlan(
          body.state,
          body.selectedRoute,
          body.currentStep,
        );
        return Response.json({
          sessionId: body.sessionId,
          requestId: body.requestId,
          plan,
          mode: "mock",
          model: null,
        });
      }

      return new Response("Not found", { status: 404 });
    };

    const actions = createConvergenceActions(store, fetcher as typeof fetch);

    // 00: Enter Brief
    const rawBrief = EXAMPLES[0].brief; // 冷泡茶包装
    store.getState().setRawBrief(rawBrief);
    expect(store.getState().rawBrief).toBe(rawBrief);

    // 01-02: Fast-converge into Human Checkpoint
    await actions.fastStart();
    expect(store.getState().state).not.toBeNull();
    expect(store.getState().state?.status).toBe("checkpoint");
    expect(store.getState().next?.type).toBe("checkpoint");
    expect(store.getState().state?.status).not.toBe("confirmed");

    // 03: User clicks "开始设计" at Human Checkpoint -> confirm & generate 3 routes
    await actions.confirm();
    expect(store.getState().state?.status).toBe("confirmed");
    expect(store.getState().explorationStage).toBe("routes");
    expect(store.getState().routes).toHaveLength(3);

    const routes = store.getState().routes;
    const startings = new Set(routes.map((r) => r.startingPoint));
    expect(startings.size).toBe(3); // Distinct starting points
    expect(store.getState().recommendedRouteId).toBeTruthy();

    // 04: User selects Route 1
    const chosenRoute = routes[0];
    actions.selectRoute(chosenRoute.id);
    expect(store.getState().selectedRouteId).toBe(chosenRoute.id);
    expect(store.getState().activeStepId).toBe(chosenRoute.steps[0].id);
    expect(store.getState().explorationStage).toBe("route_selected");

    // 05: Active step is Step 1 -> Click "开始这一步" to generate platform plan
    await actions.generatePlatformPlan();
    expect(store.getState().explorationStage).toBe("platform_ready");
    expect(store.getState().platformPlans).toHaveLength(1);

    const planStep1 = store.getState().platformPlans[0];
    expect(planStep1.stepId).toBe(chosenRoute.steps[0].id);

    // 06: Recommended platforms and order
    expect(planStep1.primarySources).toHaveLength(3);
    const primaryRoles = new Set(planStep1.primarySources.map((s) => s.roleTag));
    expect(primaryRoles.size).toBe(3); // Distinct roles
    expect(planStep1.alternativeSources.length).toBeGreaterThanOrEqual(2);

    // 07: Expanded platform keywords
    const firstPlatform = planStep1.primarySources[0];
    expect(firstPlatform.keywords.length).toBeGreaterThanOrEqual(2);
    expect(firstPlatform.keywords[0].keyword).toBeTruthy();
    expect(firstPlatform.keywords[0].meaning).toBeTruthy();

    // 08: Search actions
    const testKw = firstPlatform.keywords[0].keyword;
    await actions.copyKeyword(planStep1.stepId, firstPlatform.id, testKw);
    actions.openSearch(firstPlatform.searchUrl, planStep1.stepId, firstPlatform.id, testKw);

    const interactionKey = `${planStep1.stepId}_${firstPlatform.id}`;
    expect(store.getState().sourceInteractions[interactionKey]?.copiedKeywords).toContain(testKw);
    expect(store.getState().sourceInteractions[interactionKey]?.opened).toBe(true);

    // Skip and Replace
    actions.skipSource(planStep1.stepId, firstPlatform.id);
    expect(store.getState().sourceInteractions[interactionKey]?.skipped).toBe(true);

    const altSource = planStep1.alternativeSources[0];
    actions.replaceSource(planStep1.stepId, firstPlatform.id, altSource.id);
    const updatedPlan1 = store.getState().platformPlans[0];
    expect(updatedPlan1.primarySources[0].id).toBe(altSource.id);

    // Next step -> Step 2
    await actions.nextStep();
    expect(store.getState().activeStepId).toBe(chosenRoute.steps[1].id);
    // Preserves Step 1 plan and appends Step 2 plan
    expect(store.getState().platformPlans).toHaveLength(2);
    expect(store.getState().platformPlans[0].stepId).toBe(chosenRoute.steps[0].id);
    expect(store.getState().platformPlans[1].stepId).toBe(chosenRoute.steps[1].id);

    // Persistence recovery test: simulate page reload
    const rehydratedStore = createSiftStore(memory);
    await rehydratedStore.persist.rehydrate();

    const restored = rehydratedStore.getState();
    expect(restored.rawBrief).toBe(rawBrief);
    expect(restored.state?.status).toBe("confirmed");
    expect(restored.routes).toHaveLength(3);
    expect(restored.selectedRouteId).toBe(chosenRoute.id);
    expect(restored.activeStepId).toBe(chosenRoute.steps[1].id);
    expect(restored.platformPlans).toHaveLength(2);
    expect(restored.sourceInteractions[interactionKey]?.opened).toBe(true);
  });
});
