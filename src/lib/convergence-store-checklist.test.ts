import { describe, it, expect } from "vitest";
import { createSiftStore } from "./convergence-store";

describe("store acceptance checklist and notes", () => {
  it("toggles acceptance criteria on and off", () => {
    const store = createSiftStore();
    expect(store.getState().completedCriteria).toEqual({});

    store.getState().toggleAcceptanceCriterion("step-1", "视觉层级识别度通过");
    expect(store.getState().completedCriteria["step-1"]).toEqual([
      "视觉层级识别度通过",
    ]);

    // Toggle off
    store.getState().toggleAcceptanceCriterion("step-1", "视觉层级识别度通过");
    expect(store.getState().completedCriteria["step-1"]).toEqual([]);

    // Add multiple
    store.getState().toggleAcceptanceCriterion("step-1", "准则 A");
    store.getState().toggleAcceptanceCriterion("step-1", "准则 B");
    expect(store.getState().completedCriteria["step-1"]).toEqual([
      "准则 A",
      "准则 B",
    ]);
  });

  it("clears completedCriteria when reselecting route or resetting", () => {
    const store = createSiftStore();
    store.getState().toggleAcceptanceCriterion("step-1", "准则 A");
    expect(store.getState().completedCriteria["step-1"]).toEqual(["准则 A"]);

    store.getState().reselectRoute();
    expect(store.getState().completedCriteria).toEqual({});

    store.getState().toggleAcceptanceCriterion("step-1", "准则 B");
    store.getState().reset();
    expect(store.getState().completedCriteria).toEqual({});
  });
});
