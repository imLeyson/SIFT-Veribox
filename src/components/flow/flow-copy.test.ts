import { describe, expect, it } from "vitest";
import { questionSubmitLabel, revisionLabel } from "./flow-copy";

describe("flow copy", () => {
  it("uses a direct continuation label when no question is answered", () => {
    expect(questionSubmitLabel(0, 3, false)).toBe("直接继续，生成策略 →");
  });

  it("keeps the number of answered questions visible when the user is partial", () => {
    expect(questionSubmitLabel(1, 3, false)).toBe("确认已选 (1/3) 并继续 →");
  });

  it("shows a stable user-facing revision label instead of an internal code", () => {
    expect(revisionLabel(2)).toBe("第 2 次记录");
  });
});
