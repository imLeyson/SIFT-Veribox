import { describe, expect, it } from "vitest";
import { inferCraft } from "./craft";

describe("inferCraft", () => {
  it("detects app and mini program", () => {
    expect(inferCraft("记账 App 首页不要金色图表")).toBe("app");
    expect(inferCraft("社区小馆点餐小程序")).toBe("miniprogram");
  });
  it("detects packaging vs interaction", () => {
    expect(inferCraft("香薰瓶包装货架")).toBe("packaging");
    expect(inferCraft("任务路径和失败反馈的交互")).toBe("interaction");
  });
});
