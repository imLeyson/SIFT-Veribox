import { describe, expect, it } from "vitest";
import { selectCreativeLenses } from "./creative-lenses";

describe("creative lenses", () => {
  it("returns three different lenses for a generation round", () => {
    const lenses = selectCreativeLenses("儿童牙刷|设计探索项目 02|0");

    expect(lenses).toHaveLength(3);
    expect(new Set(lenses.map((lens) => lens.id)).size).toBe(3);
    expect(lenses.every((lens) => lens.instruction.length > 10)).toBe(true);
  });

  it("changes the lens mix when the user asks for another batch", () => {
    const first = selectCreativeLenses("儿童牙刷|设计探索项目 02|0");
    const next = selectCreativeLenses("儿童牙刷|设计探索项目 02|1");

    expect(next.map((lens) => lens.id)).not.toEqual(first.map((lens) => lens.id));
  });
});
