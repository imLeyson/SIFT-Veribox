import { describe, expect, it } from "vitest";
import {
  applyBriefInputImeEvent,
  type BriefInputImeState,
} from "./brief-input-ime";

describe("applyBriefInputImeEvent", () => {
  it("keeps composition-local text and commits only after composition ends", () => {
    let state: BriefInputImeState = { value: "", composing: false };

    const started = applyBriefInputImeEvent(state, {
      type: "compositionstart",
    });
    state = started.state;
    expect(started.commit).toBeNull();

    const composing = applyBriefInputImeEvent(state, {
      type: "change",
      value: "n",
    });
    state = composing.state;
    expect(state).toEqual({ value: "n", composing: true });
    expect(composing.commit).toBeNull();

    const committed = applyBriefInputImeEvent(state, {
      type: "compositionend",
      value: "你",
    });
    expect(committed.state).toEqual({ value: "你", composing: false });
    expect(committed.commit).toBe("你");
  });

  it("commits ordinary changes immediately when no composition is active", () => {
    const result = applyBriefInputImeEvent(
      { value: "你", composing: false },
      { type: "change", value: "你好" },
    );

    expect(result.state).toEqual({ value: "你好", composing: false });
    expect(result.commit).toBe("你好");
  });
});
