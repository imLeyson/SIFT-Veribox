import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ReactFlowProvider } from "@xyflow/react";
import { useSiftStore } from "@/lib/convergence-store";
import { RouteNode } from "@/components/flow/nodes/RouteNode";
import { StepNode } from "@/components/flow/nodes/StepNode";
import { PlatformPlanNode } from "@/components/flow/nodes/PlatformPlanNode";
import { ImageGenNode } from "@/components/flow/nodes/ImageGenNode";
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
    expect(updatedCard.data?.route.themeName).toContain("《");
    expect(updatedCard.data?.route.startingPoint).toContain("清透浅底");

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
    expect(renderedHtml).toContain("设计取舍");
    expect(renderedHtml).toContain("避坑提醒");
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

    // 2. Add custom PlatformPlan card connected directly to the route.
    const planCardId = useSiftStore.getState().addCustomCard({
      id: "card-plan-test",
      type: "platformPlan",
      title: "空白方案待推导",
      position: { x: 1700, y: 300 },
      data: { isEmpty: true },
    });

    useSiftStore.getState().addCustomEdge({
      id: "edge-route-plan",
      source: "route-r1",
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
    const renderedPlanEmpty = renderToString(
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
    expect(renderedPlanEmpty).toContain("灵感检索");
    expect(renderedPlanEmpty).not.toContain("4 灵感检索");

    const renderedPlanPopulated = renderToString(
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
    expect(renderedPlanPopulated).toContain("灵感检索");
    expect(renderedPlanPopulated).not.toContain("4 灵感检索");
  });

  it("safely synthesizes ImageGen card connected to theme route and renders without crash", () => {
    // 1. Add custom ImageGen card connected to route r1
    const imageGenCardId = useSiftStore.getState().addCustomCard({
      type: "imageGen",
      title: "空白画面生成待推导",
      position: { x: 1200, y: 300 },
      data: { isEmpty: true },
    });

    useSiftStore.getState().addCustomEdge({
      id: "edge-r1-imagegen",
      source: "route-r1",
      target: imageGenCardId,
    });

    // 2. User clicks synthesize card
    const success = useSiftStore.getState().synthesizeCard(imageGenCardId);
    expect(success).toBe(true);

    const imageGenCard = useSiftStore
      .getState()
      .customCards.find((c) => c.id === imageGenCardId)!;
    expect(imageGenCard.data?.isEmpty).toBe(false);
    expect(imageGenCard.data?.prompt).toBeDefined();
    expect(imageGenCard.data?.negativePrompt).toBeDefined();
    expect(imageGenCard.data?.aspectRatio).toBe("3:4");

    // 3. Render ImageGenNode (both when empty and when synthesized)
    let renderedEmpty = "";
    let renderedPopulated = "";
    expect(() => {
      renderedEmpty = renderToString(
        React.createElement(
          ReactFlowProvider,
          null,
          React.createElement(ImageGenNode, {
            id: "unconnected-imagegen-test",
            data: { isEmpty: true },
            selected: false,
          } as any)
        )
      );
      renderedPopulated = renderToString(
        React.createElement(
          ReactFlowProvider,
          null,
          React.createElement(ImageGenNode, {
            id: imageGenCard.id,
            data: imageGenCard.data,
            selected: false,
          } as any)
        )
      );
    }).not.toThrow();

    expect(renderedEmpty).toContain("画面生成");
    expect(renderedEmpty).not.toContain("5 画面生成");
    expect(renderedEmpty).toContain("从「3 风格主题」连线至此");

    expect(renderedPopulated).toContain("画面生成");
    expect(renderedPopulated).not.toContain("5 画面生成");
    expect(renderedPopulated).toContain("画面提示词");
    expect(renderedPopulated).toContain("推导概念画面");
    expect(renderedPopulated).toContain("画面比例");
    expect(renderedPopulated).not.toContain("风格渲染基底");


    // 4. Test collapsed state: photo is retained, prompt/negative keywords are folded away
    useSiftStore.getState().toggleNodeCollapse(imageGenCard.id);
    expect(useSiftStore.getState().collapsedNodeIds).toContain(imageGenCard.id);
    const renderedCollapsed = renderToString(
      React.createElement(
        ReactFlowProvider,
        null,
        React.createElement(ImageGenNode, {
          id: imageGenCard.id,
          data: {
            ...imageGenCard.data,
            imageUrl: "data:image/svg+xml;utf8,<svg>test-image</svg>",
            candidates: [
              {
                id: "c-1",
                url: "data:image/svg+xml;utf8,<svg>test-image</svg>",
                createdAt: 12345,
                variantIndex: 0,
              },
            ],
          },
          selected: false,
        } as any)
      )
    );

    // Header & photo are present in collapsed state
    expect(renderedCollapsed).toContain("画面生成");
    expect(renderedCollapsed).not.toContain("5 画面生成");
    expect(renderedCollapsed).toContain("data:image/svg+xml;utf8,&lt;svg&gt;test-image&lt;/svg&gt;");
    expect(renderedCollapsed).toContain("检视");
    expect(renderedCollapsed).toContain("方案 01");





    // Detailed prompt inputs & controls are hidden in collapsed state
    expect(renderedCollapsed).not.toContain("画面提示词");
    expect(renderedCollapsed).not.toContain("画面比例");

    // 5. Test collapsed state with multiple candidates shows version selector
    const renderedCollapsedMulti = renderToString(
      React.createElement(
        ReactFlowProvider,
        null,
        React.createElement(ImageGenNode, {
          id: imageGenCard.id,
          data: {
            ...imageGenCard.data,
            imageUrl: "data:image/svg+xml;utf8,<svg>candidate-2</svg>",
            candidates: [
              { id: "c-1", url: "data:image/svg+xml;utf8,<svg>candidate-1</svg>", createdAt: 1, variantIndex: 0 },
              { id: "c-2", url: "data:image/svg+xml;utf8,<svg>candidate-2</svg>", createdAt: 2, variantIndex: 1 },
            ],
            activeCandidateIndex: 1,
          },
          selected: false,
        } as any)
      )
    );

    expect(renderedCollapsedMulti).toContain("方案 02");
    expect(renderedCollapsedMulti).toContain("共 2 版");
    expect(renderedCollapsedMulti).toContain("data:image/svg+xml;utf8,&lt;svg&gt;candidate-2&lt;/svg&gt;");
  });

  it("allows standalone direct prompt input and deep customization without upstream constraints", () => {
    // Standalone card created without upstream connection
    const customPrompt = "暗黑极简钛合金保温杯，粗哑光微肌理，大理石台面，侧光漫反射，8k超写实商业产品摄影";
    const standaloneNode = React.createElement(
      ReactFlowProvider,
      null,
      React.createElement(ImageGenNode, {
        id: "standalone-custom-imagegen",
        data: {
          isEmpty: true,
          customTitle: "《钛金暗黑杯》",
          prompt: customPrompt,
          aspectRatio: "9:16",
          stylePreset: "cinematic",
          refWeight: 75,
        },
        selected: true,
      } as any)
    );

    const rendered = renderToString(standaloneNode);

    // Direct custom title & prompt are immediately rendered without blocking
    expect(rendered).toContain("画面生成");
    expect(rendered).not.toContain("5 画面生成");
    expect(rendered).toContain("《钛金暗黑杯》");
    expect(rendered).toContain("暗黑极简钛合金保温杯");
    expect(rendered).toContain("9:16");
    expect(rendered).not.toContain("风格渲染基底");
    expect(rendered).toContain("推导概念画面");
  });

  it("regenerating a blended card updates in-place without creating phantom ghost routes", () => {
    // 1. Setup store with 2 themes
    const mockRoutes: Route[] = [
      {
        id: "r1",
        title: "【清透浅底】风味色块",
        themeName: "清透浅底 · 风味色块",
        focusDimension: "清透底色与色块比例",
        startingPoint: "以浅底反衬风味色块",
        coreProblem: "如何平衡留白与色块饱和度？",
        purpose: "传达轻盈与清爽的风味辨识度",
        pros: "现代、轻快",
        cons: "需避免颜色过多",
        recommendedReason: null,
        alignmentScore: 92,
        steps: [{ id: "r1-s1", title: "底色明度试验", question: "色块面积多少？", purpose: "确立视觉比例", acceptanceCriteria: ["留白大于60%"] }],
      },
      {
        id: "r2",
        title: "【原浆纸白】微肌理留白",
        themeName: "原浆纸白 · 微肌理留白",
        focusDimension: "纸浆微肌理",
        startingPoint: "原生纸张触觉质地",
        coreProblem: "如何不用大色块有高级感？",
        purpose: "通过微弱光影建立品质",
        pros: "亲和力佳",
        cons: "公差控制难",
        recommendedReason: null,
        alignmentScore: 90,
        steps: [{ id: "r2-s1", title: "压凹深度试验", question: "压凹多深？", purpose: "推敲手感", acceptanceCriteria: ["触手可及"] }],
      },
    ];

    useSiftStore.setState({
      routes: mockRoutes,
      rawBrief: "气泡果茶包装",
      customCards: [],
      customEdges: [],
      deletedNodeIds: [],
    });

    // 2. Add blank card, connect both themes
    const cardId = useSiftStore.getState().addCustomCard({
      id: "card-route-regen-test",
      type: "route",
      title: "空白主题",
      position: { x: 900, y: 0 },
      data: { isEmpty: true },
    });
    useSiftStore.getState().addCustomEdge({ id: "e1", source: "route-r1", target: cardId });
    useSiftStore.getState().addCustomEdge({ id: "e2", source: "route-r2", target: cardId });

    // 3. First synthesis
    useSiftStore.getState().synthesizeCard(cardId);
    const afterFirst = useSiftStore.getState();
    const firstCard = afterFirst.customCards.find((c) => c.id === cardId)!;
    const firstRouteId = (firstCard.data?.route as Route).id;
    const firstThemeName = (firstCard.data?.route as Route).themeName;
    const routeCountAfterFirst = afterFirst.routes.length;

    expect(firstCard.data?.isBlended).toBe(true);
    expect(firstRouteId).toBeTruthy();

    // 4. Regenerate — "重新生成" — this is the critical test
    useSiftStore.getState().synthesizeCard(cardId);
    const afterSecond = useSiftStore.getState();
    const secondCard = afterSecond.customCards.find((c) => c.id === cardId)!;
    const secondRouteId = (secondCard.data?.route as Route).id;
    const secondThemeName = (secondCard.data?.route as Route).themeName;

    // The route ID must remain STABLE (no new phantom route)
    expect(secondRouteId).toBe(firstRouteId);

    // The routes array must NOT grow (no ghost routes)
    expect(afterSecond.routes.length).toBe(routeCountAfterFirst);

    // The content must actually change (blendGeneration++ ensures different template variant)
    expect(secondThemeName).not.toBe(firstThemeName);

    // The card itself is still in-place (same cardId, not a new card)
    expect(afterSecond.customCards.filter((c) => c.id === cardId)).toHaveLength(1);

    // 5. Regenerate a third time — still no ghosts
    useSiftStore.getState().synthesizeCard(cardId);
    const afterThird = useSiftStore.getState();
    const thirdRouteId = (afterThird.customCards.find((c) => c.id === cardId)!.data?.route as Route).id;

    expect(thirdRouteId).toBe(firstRouteId);
    expect(afterThird.routes.length).toBe(routeCountAfterFirst);

    // 6. Verify the card renders with action buttons
    const finalCard = afterThird.customCards.find((c) => c.id === cardId)!;
    let html = "";
    expect(() => {
      html = renderToString(
        React.createElement(
          ReactFlowProvider,
          null,
          React.createElement(RouteNode, {
            id: finalCard.id,
            data: { ...finalCard.data, title: finalCard.title },
            selected: false,
            type: "route",
            zIndex: 0,
            isConnectable: true,
            xPos: 900,
            yPos: 0,
            dragging: false,
          } as any)
        )
      );
    }).not.toThrow();

    // Action toolbar should be present
    expect(html).toContain("选定此主题开始探索");
    expect(html).toContain("视点推进");
    expect(html).toContain("灵感检索");
    expect(html).toContain("画面生成");
  });

});
