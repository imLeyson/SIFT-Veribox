import { describe, expect, it } from "vitest";
import { collectGlobalChatSourceCardIds } from "./ai-task";

describe("collectGlobalChatSourceCardIds", () => {
  it("keeps provenance focused on themes and saved visual assets", () => {
    const ids = collectGlobalChatSourceCardIds(
      [
        { id: "route-a" },
        { id: "route-b" },
      ],
      [
        { id: "card-brief", type: "brief", content: "brief" },
        { id: "card-note", type: "note", content: "saved note" },
        { id: "card-empty-note", type: "note" },
        { id: "card-image", type: "image", data: { fileName: "ref.png" } },
        { id: "card-plan", type: "platformPlan", data: { plan: {} } },
      ],
    );

    expect(ids).toEqual(["route-route-a", "route-route-b", "card-note", "card-image"]);
  });

  it("uses the custom route card id when a route is represented on the canvas", () => {
    const ids = collectGlobalChatSourceCardIds(
      [{ id: "route-a" }],
      [{ id: "card-custom-route", type: "route", data: { route: { id: "route-a" } } }],
    );

    expect(ids).toEqual(["card-custom-route"]);
  });
});
