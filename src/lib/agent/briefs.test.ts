import { describe, expect, it } from "vitest";
import {
  parseOrThrow,
  PlatformPlanSchema,
  RoutesPayloadSchema,
  BriefSchema,
} from "./schema";
import { mockGenerateRoutes, mockParseBrief, mockPlatformPlan } from "./mock";

const CASES: { name: string; brief: string; hasIdea: boolean }[] = [
  {
    name: "护肤品牌",
    brief:
      "为一个面向 20–30 岁女性的新护肤品牌寻找视觉方向，希望自然、年轻、有品质感，但不要太少女，也不要传统有机品牌感。",
    hasIdea: false,
  },
  {
    name: "包装设计",
    brief:
      "为都市上班族冷泡罐装茶做包装方向。干净、有仪式感，不要荧光色和大插画，也不要红金茶叶罐。不确定品质感应来自材质还是图形。",
    hasIdea: true,
  },
  {
    name: "SaaS 产品视觉",
    brief:
      "给一个面向中小团队的项目协作 SaaS 做官网和产品视觉方向，希望专业、清晰，不要创业公司紫渐变。",
    hasIdea: false,
  },
  {
    name: "餐饮品牌",
    brief:
      "开在社区的日间咖啡馆品牌视觉，客群附近居民和远程办公的人，想要湿润、克制，不要手写体和拉花特写。",
    hasIdea: true,
  },
  {
    name: "信息不完整",
    brief: "帮我做个品牌。",
    hasIdea: false,
  },
  {
    name: "约束冲突",
    brief:
      "高端礼品包装，要奢华又要便宜好做，面向年轻人又要像传统老字号，风格还没想好。",
    hasIdea: false,
  },
];

describe("brief regression set", () => {
  for (const item of CASES) {
    it(item.name, () => {
      const brief = parseOrThrow(BriefSchema, mockParseBrief(item.brief), "Brief");
      expect(brief.goal.length).toBeGreaterThan(0);
      expect(brief.openQuestions.length).toBeLessThanOrEqual(3);

      const ideas = item.hasIdea ? ["克制", "纸感"] : [];
      const payload = parseOrThrow(
        RoutesPayloadSchema,
        mockGenerateRoutes(
          brief,
          item.hasIdea ? "has_idea" : "no_idea",
          ideas
        ),
        "探索路线"
      );
      expect(payload.routes).toHaveLength(3);
      const starts = payload.routes.map((r) => r.steps[0]);
      expect(new Set(starts).size).toBe(3);
      const recCount = payload.recommendedRouteId ? 1 : 0;
      expect(recCount).toBeLessThanOrEqual(1);
      for (const route of payload.routes) {
        expect(route.steps.length).toBeGreaterThanOrEqual(3);
        expect(["自然", "极简", "高级"]).not.toContain(route.title);
      }

      const plan = parseOrThrow(
        PlatformPlanSchema,
        mockPlatformPlan(brief, payload.routes[0].steps[0]),
        "平台搜索计划"
      );
      expect(plan.sources).toHaveLength(3);
      for (const source of plan.sources) {
        expect(source.queries.length).toBeGreaterThanOrEqual(2);
        expect(source.queries.length).toBeLessThanOrEqual(4);
      }
    });
  }
});
