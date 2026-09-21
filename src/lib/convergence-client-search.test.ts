import { describe, expect, it, vi } from "vitest";
import { createSiftStore } from "./convergence-store";
import { createConvergenceActions } from "./convergence-client";
import { getMockRoutes } from "./agent/routes-mock";
import { getMockPlatformPlan } from "./agent/platform-mock";
import { EXAMPLES } from "./agent/examples";
import type { DesignState } from "@/types/convergence";

const memory = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const confirmedState: DesignState = {
  revision: 3,
  status: "confirmed",
  brief: { goal: EXAMPLES[0].brief, audience: "都市上班族", deliverable: "罐装茶包装" },
  constraints: [{ text: "只用现成纸盒", basis: "user", sourceIds: ["brief"] }],
  direction: {
    intent: { text: "干净、有仪式感", basis: "user", sourceIds: ["brief"] },
    priorities: [{ text: "通过表面触感体现品质感", basis: "user", sourceIds: ["r1"] }],
    avoid: [],
    criteria: [],
  },
  currentHypothesis: "以触感建立仪式感",
  validationAction: null,
  uncertainties: [],
};

const mockRoutesData = getMockRoutes(EXAMPLES[0].brief, confirmedState);

describe("convergence client routes and search actions", () => {
  it("generates routes when confirm is clicked in checkpoint", async () => {
    const store = createSiftStore(memory);
    store.setState({
      rawBrief: EXAMPLES[0].brief,
      state: { ...confirmedState, status: "checkpoint" },
      next: { type: "checkpoint", reason: "ready" },
    });

    const fetcher = vi.fn(async (url) => {
      if (url === "/api/routes") {
        return Response.json({
          sessionId: store.getState().sessionId,
          requestId: store.getState().activeRequest?.id ?? "r1",
          routes: mockRoutesData.routes,
          recommendedRouteId: mockRoutesData.recommendedRouteId,
          mode: "mock",
          model: null,
        });
      }
      return new Response("Not found", { status: 404 });
    });

    const actions = createConvergenceActions(store, fetcher);
    await actions.confirm();

    expect(fetcher).toHaveBeenCalledWith(
      "/api/routes",
      expect.objectContaining({ method: "POST" }),
    );
    expect(store.getState().state?.status).toBe("confirmed");
    expect(store.getState().routes).toHaveLength(3);
    expect(store.getState().explorationStage).toBe("routes");
  });

  it("selects route, generates platform plan for step 1, then advances to step 2", async () => {
    const store = createSiftStore(memory);
    const targetRoute = mockRoutesData.routes[0];
    store.setState({
      rawBrief: EXAMPLES[0].brief,
      state: confirmedState,
      routes: mockRoutesData.routes,
      explorationStage: "routes",
    });

    const fetcher = vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body);
      const plan = getMockPlatformPlan(confirmedState, body.selectedRoute, body.currentStep);
      return Response.json({
        sessionId: body.sessionId,
        requestId: body.requestId,
        plan,
        mode: "mock",
        model: null,
      });
    });

    const actions = createConvergenceActions(store, fetcher);
    actions.selectRoute(targetRoute.id);
    expect(store.getState().selectedRouteId).toBe(targetRoute.id);
    expect(store.getState().activeStepId).toBe(targetRoute.steps[0].id);

    // Generate platform plan for step 1
    await actions.generatePlatformPlan();
    expect(store.getState().platformPlans).toHaveLength(1);
    expect(store.getState().platformPlans[0].stepId).toBe(targetRoute.steps[0].id);
    expect(store.getState().explorationStage).toBe("platform_ready");

    // Advance to step 2 via nextStep()
    await actions.nextStep();
    expect(store.getState().activeStepId).toBe(targetRoute.steps[1].id);
    expect(store.getState().platformPlans).toHaveLength(2);
    expect(store.getState().platformPlans[0].stepId).toBe(targetRoute.steps[0].id);
    expect(store.getState().platformPlans[1].stepId).toBe(targetRoute.steps[1].id);
  });

  it("copies keywords and triggers open search while logging interaction states", async () => {
    const store = createSiftStore(memory);
    const targetRoute = mockRoutesData.routes[0];
    const step = targetRoute.steps[0];
    const plan = getMockPlatformPlan(confirmedState, targetRoute, step);

    store.setState({
      state: confirmedState,
      routes: mockRoutesData.routes,
      selectedRouteId: targetRoute.id,
      activeStepId: step.id,
      platformPlans: [plan],
    });

    const actions = createConvergenceActions(store);
    const source = plan.primarySources[0];
    const kw = source.keywords[0].keyword;

    await actions.copyKeyword(step.id, source.id, kw);
    actions.openSearch(source.searchUrl, step.id, source.id, kw);

    const key = `${step.id}_${source.id}`;
    const interaction = store.getState().sourceInteractions[key];
    expect(interaction?.copiedKeywords).toContain(kw);
    expect(interaction?.opened).toBe(true);
  });

  it("regenerates routes passing excludeThemeNames and replaces current routes with fresh set", async () => {
    const store = createSiftStore(memory);
    store.setState({
      rawBrief: EXAMPLES[0].brief,
      state: confirmedState,
      routes: mockRoutesData.routes,
      selectedRouteId: mockRoutesData.routes[0].id,
      activeStepId: mockRoutesData.routes[0].steps[0].id,
      explorationStage: "route_selected",
    });

    const altRoutesData = getMockRoutes(EXAMPLES[0].brief, confirmedState, {
      excludeThemeNames: [mockRoutesData.routes[0].themeName!],
      refreshIndex: 1,
    });

    let sentBody: { excludeThemeNames?: string[] } | undefined;
    const fetcher = vi.fn(async (url, init) => {
      if (url === "/api/routes") {
        sentBody = JSON.parse(init.body) as { excludeThemeNames?: string[] };
        return Response.json({
          sessionId: store.getState().sessionId,
          requestId: store.getState().activeRequest?.id ?? "r2",
          routes: altRoutesData.routes,
          recommendedRouteId: altRoutesData.recommendedRouteId,
          mode: "mock",
          model: null,
        });
      }
      return new Response("Not found", { status: 404 });
    });

    const actions = createConvergenceActions(store, fetcher);
    await actions.regenerateRoutes();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(sentBody?.excludeThemeNames).toBeTruthy();
    expect(sentBody?.excludeThemeNames).toContain(mockRoutesData.routes[0].themeName);
    expect(store.getState().routes[0].themeName).toBe(altRoutesData.routes[0].themeName);
    // Downstream selection was rolled back for user to pick new theme
    expect(store.getState().selectedRouteId).toBeNull();
    expect(store.getState().explorationStage).toBe("routes");
  });
});
