import { describe, expect, it } from "vitest";
import { normalizeThemeName } from "./route-title";

describe("normalizeThemeName", () => {
  it("removes book-title styling and poetic phrasing from visible theme names", () => {
    expect(
      normalizeThemeName("《掌心磨出的亮面》", "默认主题", {
        startingPoint: "握持面与表面处理",
        focusDimension: "曲面与触感",
      }),
    ).toBe("握持面与表面处理");
  });
});
