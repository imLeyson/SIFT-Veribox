import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ReactFlowProvider } from "@xyflow/react";
import { useSiftStore } from "./convergence-store";
import { RouteNode } from "@/components/flow/nodes/RouteNode";
import { StepNode } from "@/components/flow/nodes/StepNode";
import { PlatformPlanNode } from "@/components/flow/nodes/PlatformPlanNode";
import type { Route } from "@/types/routes";

describe("Card Connection & Synthesis Flow (Crash Prevention)", () => {
  it("safely synthesizes blended theme card upon connection without duplicate nodes or rendering crashes", () => {
    // 1. Setup store with 2 active themes (user deleted theme 3)
    const mockRoutes: Route[] = [
      {
        id: "r1",
        title: "【清透浅底】风味色块",
        themeName: "清透浅底 · 风味色块",
        focusDimension: "清透底色与色块比例",
        startingPoint: "以浅底反衬风味色块",
        coreProblem: "如何平衡留白与色块饱和度？",
        purpose: "传达轻盈与清爽的风味辨识度",
        pros: "现代、轻快、视觉负担低",
        cons: "需避免颜色过多导致杂乱",
        recommendedReason: null,
        alignmentScore: 92,
        steps: [
          {
            id: "r1-s1",
            title: "底色明度与色块分级试验",
            question: "色块面积占比多少最合适？",
            purpose: "确立视觉比例",
            acceptanceCriteria: ["留白大于60%"],
          },
        ],
      },
      {
        id: "r2",
        title: "【原浆纸白】微肌理留白",
        themeName: "原浆纸白 · 微肌理留白",
        focusDimension: "纸浆微肌理与无油墨压凹",
        startingPoint: "原生纸张本身的触觉质地",
        coreProblem: "如何不用大色块依然有高级感？",
        purpose: "通过微弱光影与触感建立品质",
        pros: "亲和力极佳，高级克制",
        cons: "大批量生产公差控制难",
        recommendedReason: null,
        alignmentScore: 90,
        steps: [
          {
            id: "r2-s1",
            title: "纸浆肌理与压凹深度试验",
            question: "压凹深度多少最温润？",
            purpose: "推敲细节手感",
            acceptanceCriteria: ["触手可及的微凹凸"],
          },
        ],
      },
    ];

    useSiftStore.setState({
      routes: mockRoutes,
      rawBrief: "夏日清爽气泡果茶包装设计",
      customCards: [],
      customEdges: [],
      deletedNodeIds: ["route-r3"],
    });

    // 2. User adds blank custom theme card
    const cardId = useSiftStore.getState().addCustomCard({
      id: "card-route-test-1",
      type: "route",
      title: "空白主题待推导",
      position: { x: 900, y: 300 },
      data: {
        isEmpty: true,
        index: 2,
      },
    });

    // 3. User connects both theme nodes to the blank card
    useSiftStore.getState().addCustomEdge({
      id: "edge-r1-custom",
      source: "route-r1",
      target: cardId,
    });
    useSiftStore.getState().addCustomEdge({
      id: "edge-r2-custom",
      source: "route-r2",
      target: cardId,
    });

    // 4. User clicks synthesize card
    const success = useSiftStore.getState().synthesizeCard(cardId);
    expect(success).toBe(true);

    const updatedCard = useSiftStore.getState().customCards.find((c) => c.id === cardId)!;
    expect(updatedCard.data?.isEmpty).toBe(false);
    expect(updatedCard.data?.isBlended).toBe(true);
    expect(updatedCard.data?.route).toBeDefined();
    expect(updatedCard.data?.route.themeName).toContain("清透浅底 · 风味色块");
    expect(updatedCard.data?.route.themeName).toContain("原浆纸白 · 微肌理留白");

    // 5. Test rendering RouteNode component for the synthesized card
    let renderedHtml = "";
    expect(() => {
      renderedHtml = renderToString(
        React.createElement(
          ReactFlowProvider,
          null,
          React.createElement(RouteNode, {
            id: updatedCard.id,
            data: {
              ...updatedCard.data,
              title: updatedCard.title,
              content: updatedCard.content,
              color: updatedCard.color,
            },
            selected: false,
            type: "route",
            zIndex: 0,
            isConnectable: true,
            xPos: 900,
            yPos: 300,
            dragging: false,
          } as any)
        )
      );
    }).not.toThrow();

    expect(renderedHtml).toContain("跨界融合");
    expect(renderedHtml).toContain("清透浅底");
    expect(renderedHtml).toContain("原浆纸白");
    expect(renderedHtml).toContain("核心视觉手法");
    expect(renderedHtml).toContain("设计取舍与权衡");
    expect(renderedHtml).toContain("防跑偏提醒");
  });

  it("safely synthesizes step node and platform plan node without crashes", () => {
    // 1. Add custom Step card connected to route
    const stepCardId = useSiftStore.getState().addCustomCard({
      id: "card-step-test",
      type: "step",
      title: "空白视点待推导",
      position: { x: 1300, y: 300 },
      data: { isEmpty: true },
    });

    useSiftStore.getState().addCustomEdge({
      id: "edge-r1-step",
      source: "route-r1",
      target: stepCardId,
    });

    const stepSuccess = useSiftStore.getState().synthesizeCard(stepCardId);
    expect(stepSuccess).toBe(true);

    const stepCard = useSiftStore.getState().customCards.find((c) => c.id === stepCardId)!;
    expect(stepCard.data?.isEmpty).toBe(false);

    // 2. Add custom PlatformPlan card connected to Step card
    const planCardId = useSiftStore.getState().addCustomCard({
      id: "card-plan-test",
      type: "platformPlan",
      title: "空白方案待推导",
      position: { x: 1700, y: 300 },
      data: { isEmpty: true },
    });

    useSiftStore.getState().addCustomEdge({
      id: "edge-step-plan",
      source: stepCardId,
      target: planCardId,
    });

    const planSuccess = useSiftStore.getState().synthesizeCard(planCardId);
    expect(planSuccess).toBe(true);

    const planCard = useSiftStore.getState().customCards.find((c) => c.id === planCardId)!;
    expect(planCard.data?.isEmpty).toBe(false);
    expect(planCard.data?.plan).toBeDefined();
    expect(planCard.data?.plan.primarySources.length).toBeGreaterThan(0);

    // 3. Render StepNode (both when empty and when synthesized)
    expect(() => {
      renderToString(
        React.createElement(
          ReactFlowProvider,
          null,
          React.createElement(StepNode, {
            id: stepCard.id,
            data: { ...stepCard.data, isEmpty: true },
            selected: false,
          } as any)
        )
      );
      renderToString(
        React.createElement(
          ReactFlowProvider,
          null,
          React.createElement(StepNode, {
            id: stepCard.id,
            data: stepCard.data,
            selected: false,
          } as any)
        )
      );
    }).not.toThrow();

    // 4. Render PlatformPlanNode (both when empty and when synthesized)
    expect(() => {
      renderToString(
        React.createElement(
          ReactFlowProvider,
          null,
          React.createElement(PlatformPlanNode, {
            id: planCard.id,
            data: { ...planCard.data, isEmpty: true },
            selected: false,
          } as any)
        )
      );
      renderToString(
        React.createElement(
          ReactFlowProvider,
          null,
          React.createElement(PlatformPlanNode, {
            id: planCard.id,
            data: planCard.data,
            selected: false,
          } as any)
        )
      );
    }).not.toThrow();
  });
});
