import { describe, expect, it } from "vitest";
import {
  BriefSchema,
  parseOrThrow,
  PlatformPlanSchema,
  RoutesPayloadSchema,
} from "./schema";
import { mockGenerateRoutes, mockParseBrief, mockPlatformPlan } from "./mock";
import { rankSources } from "./sources";

describe("schema", () => {
  it("accepts a complete brief", () => {
    const brief = mockParseBrief(
      "为一个面向 20–30 岁女性的新护肤品牌寻找视觉方向，希望自然、年轻、有品质感，但不要太少女，也不要传统有机品牌感。"
    );
    expect(parseOrThrow(BriefSchema, brief, "Brief").goal).toContain("护肤");
  });

  it("rejects a brief missing goal", () => {
    expect(() =>
      parseOrThrow(BriefSchema, { targetUser: "a", known: [], unknown: [], constraints: [], deliverable: "x", openQuestions: [] }, "Brief")
    ).toThrow(/Brief/);
  });

  it("requires exactly 3 routes with different starts", () => {
    const brief = mockParseBrief("护肤品牌视觉方向，自然年轻");
    const payload = mockGenerateRoutes(brief, "no_idea", []);
    const parsed = parseOrThrow(RoutesPayloadSchema, payload, "探索路线");
    expect(parsed.routes).toHaveLength(3);
    const starts = parsed.routes.map((r) => r.steps[0]);
    expect(new Set(starts).size).toBe(3);
  });

  it("rejects style names as route titles", () => {
    const brief = mockParseBrief("护肤");
    const payload = mockGenerateRoutes(brief, "no_idea", []);
    payload.routes[0].title = "极简";
    expect(() => parseOrThrow(RoutesPayloadSchema, payload, "探索路线")).toThrow();
  });

  it("requires 3 sources and 2-4 queries", () => {
    const brief = mockParseBrief("护肤品牌视觉方向，自然年轻不要太少女");
    const plan = mockPlatformPlan(brief, "摄影");
    const parsed = parseOrThrow(PlatformPlanSchema, plan, "平台搜索计划");
    expect(parsed.sources).toHaveLength(3);
    expect(parsed.alternatives.length).toBeGreaterThanOrEqual(2);
  });
});

describe("source ranking", () => {
  it("changes order by current step", () => {
    const brief = mockParseBrief("护肤品牌视觉方向，自然年轻不要太少女");
    const photo = rankSources("摄影", brief).map((s) => s.name);
    const competitor = rankSources("同类品牌", brief).map((s) => s.name);
    expect(photo[0]).not.toBe(competitor[0]);
    expect(competitor.slice(0, 3)).toContain("小红书");
  });
});
