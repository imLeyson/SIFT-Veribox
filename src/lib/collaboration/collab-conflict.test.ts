import { describe, expect, it } from "vitest";
import { mergeCardConflict } from "./collab-manager";

describe("mergeCardConflict", () => {
  it("keeps both text edits in readable order", () => {
    expect(
      mergeCardConflict({
        cardId: "note-1",
        fields: ["content"],
        localPatch: { content: "我的判断" },
        remotePatch: { content: "队友的判断" },
        remotePeer: { id: "peer-2", name: "设计师 22", color: "#6366f1" },
        timestamp: 1,
      }),
    ).toEqual({ content: "我的判断\n\n队友的判断" });
  });

  it("merges card data without dropping local fields", () => {
    expect(
      mergeCardConflict({
        cardId: "note-1",
        fields: ["data"],
        localPatch: { data: { src: "local", width: 320 } },
        remotePatch: { data: { height: 240 } },
        remotePeer: { id: "peer-2", name: "设计师 22", color: "#6366f1" },
        timestamp: 1,
      }),
    ).toEqual({ data: { src: "local", width: 320, height: 240 } });
  });
});
