import { describe, expect, it } from "vitest";
import { createSiftStore } from "./convergence-store";
import { getMockRoutes } from "./agent/routes-mock";
import { getMockPlatformPlan } from "./agent/platform-mock";
import { EXAMPLES } from "./agent/examples";
import type { DesignState } from "@/types/convergence";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  };
}

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

describe("convergence store routes and external search", () => {
  it("stores routes and handles route selection & re-selection", () => {
    const store = createSiftStore(memoryStorage());
    store.setState({ state: confirmedState, explorationStage: "state_confirmed" });

    store.getState().setRoutes(mockRoutesData.routes, mockRoutesData.recommendedRouteId);
    expect(store.getState().routes).toHaveLength(3);
    expect(store.getState().explorationStage).toBe("routes");

    const targetRoute = mockRoutesData.routes[0];
    store.getState().selectRoute(targetRoute.id);
    expect(store.getState().selectedRouteId).toBe(targetRoute.id);
    expect(store.getState().activeStepId).toBe(targetRoute.steps[0].id);
    expect(store.getState().explorationStage).toBe("route_selected");

    // Add a platform plan
    const plan = getMockPlatformPlan(confirmedState, targetRoute, targetRoute.steps[0]);
    store.getState().setPlatformPlan(plan);
    expect(store.getState().platformPlans).toHaveLength(1);

    // Reselect route cleans up plans and returns to routes
    store.getState().reselectRoute();
    expect(store.getState().selectedRouteId).toBeNull();
    expect(store.getState().activeStepId).toBeNull();
    expect(store.getState().platformPlans).toHaveLength(0);
    expect(store.getState().explorationStage).toBe("routes");
  });

  it("advances steps and cleans up subsequent plans on rollback", () => {
    const store = createSiftStore(memoryStorage());
    const targetRoute = mockRoutesData.routes[0];
    store.setState({
      state: confirmedState,
      routes: mockRoutesData.routes,
      selectedRouteId: targetRoute.id,
      activeStepId: targetRoute.steps[0].id,
      explorationStage: "route_selected",
    });

    const plan1 = getMockPlatformPlan(confirmedState, targetRoute, targetRoute.steps[0]);
    store.getState().setPlatformPlan(plan1);

    // Advance to step 2
    store.getState().setActiveStep(targetRoute.steps[1].id);
    expect(store.getState().activeStepId).toBe(targetRoute.steps[1].id);
    expect(store.getState().explorationStage).toBe("step_active");

    const plan2 = getMockPlatformPlan(confirmedState, targetRoute, targetRoute.steps[1]);
    store.getState().setPlatformPlan(plan2);
    expect(store.getState().platformPlans).toHaveLength(2);

    // Rollback to step 1 cleans up plan 2 but keeps plan 1
    store.getState().setActiveStep(targetRoute.steps[0].id);
    expect(store.getState().activeStepId).toBe(targetRoute.steps[0].id);
    expect(store.getState().platformPlans).toHaveLength(1);
    expect(store.getState().platformPlans[0].stepId).toBe(targetRoute.steps[0].id);
    expect(store.getState().explorationStage).toBe("platform_ready");
  });

  it("handles source skipping and replacing with alternative", () => {
    const store = createSiftStore(memoryStorage());
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

    const firstPrimary = plan.primarySources[0];
    const firstAlt = plan.alternativeSources[0];

    // Skip source
    store.getState().skipSource(step.id, firstPrimary.id);
    const key = `${step.id}_${firstPrimary.id}`;
    expect(store.getState().sourceInteractions[key]?.skipped).toBe(true);

    // Replace source
    store.getState().replaceSource(step.id, firstPrimary.id, firstAlt.id);
    const updatedPlan = store.getState().platformPlans[0];
    expect(updatedPlan.primarySources[0].id).toBe(firstAlt.id);
    expect(updatedPlan.alternativeSources[0].id).toBe(firstPrimary.id);
    expect(store.getState().sourceInteractions[key]?.replacedBy).toBe(firstAlt.id);

    // Record copy and open
    store.getState().recordSourceAction(step.id, firstAlt.id, "copied", "test-kw");
    store.getState().recordSourceAction(step.id, firstAlt.id, "opened", "test-kw");
    const altKey = `${step.id}_${firstAlt.id}`;
    expect(store.getState().sourceInteractions[altKey]?.copiedKeywords).toContain("test-kw");
    expect(store.getState().sourceInteractions[altKey]?.opened).toBe(true);
  });

  it("migrates from v2 confirmed state and stops at state_confirmed without routes", async () => {
    const storage = memoryStorage({
      "sift-convergence-v2": JSON.stringify({
        state: {
          sessionId: "v2-session",
          rawBrief: "旧Brief",
          state: confirmedState,
          history: [],
          positions: {},
        },
        version: 1,
      }),
    });

    const store = createSiftStore(storage);
    await store.persist.rehydrate();

    const state = store.getState();
    expect(state.rawBrief).toBe("旧Brief");
    expect(state.state?.status).toBe("confirmed");
    expect(state.explorationStage).toBe("state_confirmed");
    expect(state.routes).toEqual([]);
    expect(state.selectedRouteId).toBeNull();
  });

  it("supports multiple themes explored in parallel without wiping other themes' plans", () => {
    const store = createSiftStore(memoryStorage());
    const r1 = mockRoutesData.routes[0];
    const r2 = mockRoutesData.routes[1];

    store.setState({
      state: confirmedState,
      routes: mockRoutesData.routes,
    });

    // 1. Explore Theme 1
    store.getState().selectRoute(r1.id);
    expect(store.getState().exploredRouteIds).toContain(r1.id);
    expect(store.getState().selectedRouteId).toBe(r1.id);

    // Generate plan for Theme 1 step 0
    const plan1 = getMockPlatformPlan(confirmedState, r1, r1.steps[0]);
    store.getState().setPlatformPlan(plan1);
    expect(store.getState().platformPlans).toHaveLength(1);

    // 2. Explore Theme 2 in parallel
    store.getState().selectRoute(r2.id);
    expect(store.getState().exploredRouteIds).toContain(r1.id);
    expect(store.getState().exploredRouteIds).toContain(r2.id);
    // Crucial: Theme 1's plan was NOT wiped!
    expect(store.getState().platformPlans).toHaveLength(1);

    // Generate plan for Theme 2 step 0
    const plan2 = getMockPlatformPlan(confirmedState, r2, r2.steps[0]);
    store.getState().setPlatformPlan(plan2);
    expect(store.getState().platformPlans).toHaveLength(2);

    // 3. Unexplore Theme 1: Theme 2 remains explored
    store.getState().unexploreRoute(r1.id);
    expect(store.getState().exploredRouteIds).not.toContain(r1.id);
    expect(store.getState().exploredRouteIds).toContain(r2.id);
  });
});
