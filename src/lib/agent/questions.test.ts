import { describe, expect, it } from "vitest";
import {
  applyAnswersToBrief,
  dedupeQuestions,
  normalizeQuestions,
  parseAnswers,
} from "./questions";
import {
  mockParseBrief,
  mockPlatformQuestions,
  mockRouteQuestions,
} from "./mock";
import { mockCanvasChat } from "./canvas-chat-mock";
import { parseOrThrow, BriefSchema } from "./schema";
import { wrap } from "./index";
import { stripStateCards } from "@/lib/canvas-graph";
import type { VBEdge, VBNode } from "@/types";

describe("questions", () => {
  it("normalizes 2-4 options", () => {
    const qs = normalizeQuestions(
      [
        {
          id: "q1",
          prompt: "先看哪边？",
          options: [
            { id: "a", label: "首页", rationale: "先定第一屏" },
            { id: "b", label: "流程", rationale: "先把任务走通" },
          ],
        },
      ],
      "brief"
    );
    expect(qs).toHaveLength(1);
    expect(qs[0].options).toHaveLength(2);
  });

  it("short brief yields choice questions in mock", () => {
    const brief = parseOrThrow(BriefSchema, mockParseBrief("帮我做个品牌。"), "Brief");
    expect(brief.clarifyQuestions.length).toBeGreaterThan(0);
    expect(brief.clarifyQuestions[0].options.length).toBeGreaterThanOrEqual(2);
  });

  it("full skincare brief does not force questions in mock", () => {
    const brief = parseOrThrow(
      BriefSchema,
      mockParseBrief(
        "为一个面向 20–30 岁女性的新护肤品牌寻找视觉方向，希望自然、年轻、有品质感，但不要太少女，也不要传统有机品牌感。"
      ),
      "Brief"
    );
    expect(brief.clarifyQuestions).toHaveLength(0);
  });

  it("dedupes by id and prompt", () => {
    const qs = dedupeQuestions(
      [
        {
          id: "brief_q1",
          stage: "brief",
          prompt: "给谁用？",
          options: [
            { id: "a", label: "年轻人" },
            { id: "b", label: "全年龄" },
          ],
        },
        {
          id: "brief_q2",
          stage: "brief",
          prompt: "给谁用？",
          options: [
            { id: "a", label: "年轻人" },
            { id: "b", label: "全年龄" },
          ],
        },
      ],
      [{ id: "brief_q1", prompt: "给谁用？" }]
    );
    expect(qs).toHaveLength(0);
  });

  it("keeps preferences and assumptions separate from known facts", () => {
    const brief = parseOrThrow(BriefSchema, mockParseBrief("帮我做个品牌。"), "Brief");
    const questions = normalizeQuestions(brief.clarifyQuestions, "brief");
    const next = applyAnswersToBrief(
      brief,
      [
        {
          questionId: questions[0].id,
          kind: "option",
          optionId: questions[0].options[0].id,
          custom: questions[0].options[0].label,
        },
        { questionId: questions[1]?.id ?? "q2", kind: "uncertain" },
      ],
      questions
    );
    expect(next.known.join(" ")).toMatch(/App|包装|品牌|界面/);
    expect(next.assumptions.some((item) => item.startsWith("暂不确定"))).toBe(
      true
    );
    expect(next.known.join()).not.toContain("暂不确定");
  });

  it("parses answers with zod and drops junk", () => {
    expect(
      parseAnswers([
        { questionId: "q1", kind: "option", optionId: "a" },
        { hello: true },
      ])
    ).toHaveLength(1);
  });
});

describe("mock forks", () => {
  it("asks a route question when luxury and cost conflict", () => {
    const brief = parseOrThrow(
      BriefSchema,
      mockParseBrief(
        "高端礼品包装，要奢华又要便宜好做，面向年轻人又要像传统老字号，风格还没想好。"
      ),
      "Brief"
    );
    const qs = mockRouteQuestions(brief);
    expect(qs.length).toBeGreaterThan(0);
    expect(qs[0].options.length).toBeGreaterThanOrEqual(2);
  });

  it("asks a platform question only when region is unknown", () => {
    const brief = parseOrThrow(BriefSchema, mockParseBrief("帮我做个品牌。"), "Brief");
    expect(mockPlatformQuestions(brief)).toHaveLength(0);
    expect(
      mockPlatformQuestions({
        ...brief,
        unknown: ["还没定看国内还是海外"],
      }).length
    ).toBeGreaterThan(0);
  });
});

describe("canvas chat mock contract", () => {
  it("does not add cards for ordinary questions", () => {
    const result = mockCanvasChat("为什么先看小红书？", "card-brief");
    expect(result.intent).toBe("answer");
    expect(result.cards).toHaveLength(0);
  });

  it("adds cards only when asked to deepen", () => {
    const result = mockCanvasChat(
      "从「任务理解」接着往下搜。给我 2 个马上打开网站搜的方向",
      "card-brief"
    );
    expect(result.intent).toBe("deepen");
    expect(result.cards.length).toBeGreaterThan(0);
  });
});

describe("envelope", () => {
  it("wraps data and questions with request metadata", () => {
    const env = wrap({ ok: true }, [], 1);
    expect(env.sessionVersion).toBe(1);
    expect(env.requestId).toMatch(/^req_/);
    expect(env.questions).toEqual([]);
    expect(["live", "mock"]).toContain(env.mode);
  });
});

describe("persist migration helper", () => {
  it("strips the start-search state card and reconnects routes to Brief", () => {
    const nodes = [
      {
        id: "card-brief",
        type: "brief",
        data: { kind: "brief", title: "任务理解" },
      },
      {
        id: "card-state",
        type: "state",
        data: { kind: "state", title: "怎么开始搜？" },
      },
      {
        id: "card-route-route_01",
        type: "route",
        data: { kind: "route", title: "先看同类" },
      },
    ] as VBNode[];
    const edges = [
      { id: "e1", source: "card-brief", target: "card-state" },
      {
        id: "e2",
        source: "card-state",
        target: "card-route-route_01",
        label: "方案",
      },
    ] as VBEdge[];
    const next = stripStateCards(nodes, edges);
    expect(next.nodes.some((n) => n.id === "card-state")).toBe(false);
    expect(
      next.edges.some(
        (e) => e.source === "card-brief" && e.target === "card-route-route_01"
      )
    ).toBe(true);
  });
});
