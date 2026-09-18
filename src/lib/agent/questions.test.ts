import { describe, expect, it } from "vitest";
import { normalizeQuestions } from "./questions";
import { mockParseBrief } from "./mock";
import { parseOrThrow, BriefSchema } from "./schema";

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
});
