import { describe, expect, it } from "vitest";
import { normalizeRouteTitle } from "./route-title";

describe("normalizeRouteTitle", () => {
  it("turns poetic or decorated model titles into direct working labels", () => {
    expect(
      normalizeRouteTitle("《远看一弧近看三面》", "默认标题", {
        startingPoint: "弧面转折与三面关系",
        focusDimension: "轮廓与转折",
      }),
    ).toBe("弧面转折与三面关系");
  });

  it("uses a plain context label for material formulas", () => {
    expect(
      normalizeRouteTitle("再生纤维微孔阻尼 × 冷铝倒角", "默认标题", {
        startingPoint: "再生纤维物性与微孔阻尼",
        focusDimension: "材料表面与收口",
      }),
    ).toBe("再生纤维物性与微孔阻尼");
  });

  it("keeps a concrete title while removing trailing English tags", () => {
    expect(normalizeRouteTitle("硬壳与软质交界 Silent Shell", "默认标题")).toBe("硬壳与软质交界");
  });
});
