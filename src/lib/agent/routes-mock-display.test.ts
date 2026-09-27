import { describe, expect, it } from "vitest";
import { getMockRoutes } from "./routes-mock";

describe("mock theme display", () => {
  it("does not reintroduce English studio tags when the live model is unavailable", () => {
    const state = {
      brief: { goal: "可持续材料产品", audience: "设计用户", constraints: [], keywords: [] },
      uncertainties: [],
      confirmedDimensions: [],
    } as any;
    const routes = getMockRoutes("可持续材料产品", state).routes;
    expect(routes.every((route) => !/《[^》]+》\s+[A-Za-z]/.test(route.themeName ?? ""))).toBe(true);
  });
});
