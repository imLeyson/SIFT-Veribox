import type {
  ConvergenceInput,
  DesignState,
  Judgment,
  Question,
  TurnPayload,
} from "@/types/convergence";
import { answerText } from "@/types/convergence";
import { EXAMPLES } from "./examples";

type Decision = {
  topic: string;
  prompt: string;
  rephrase: string;
  labels: [string, string][];
  impact?: "blocking" | "material";
  affected: string;
};
const decisions: Record<string, Decision> = {
  quality_expression: {
    topic: "品质感的表达重点",
    affected: "品质感由触感还是视觉秩序承担",
    prompt: "品质感主要靠表面触感，还是字体与版式？",
    rephrase: "拿在手里还是摆在眼前，更要显得有品质？",
    labels: [
      ["touch", "表面触感"],
      ["layout", "字体与版式"],
    ],
  },
  hierarchy: {
    topic: "包装正面的信息主次",
    affected: "茶品与品牌谁先被识别",
    prompt: "包装正面先突出茶品，还是品牌？",
    rephrase: "远看这罐茶，先认出品种还是品牌？",
    labels: [
      ["tea", "茶品优先"],
      ["brand", "品牌优先"],
    ],
  },
  tactile_priority: {
    topic: "触感的取舍",
    affected: "触感应支持日常使用还是礼品体验",
    prompt: "拿起茶罐时，更应像日常饮品还是礼物？",
    rephrase: "这罐茶更像每天喝的，还是送人的？",
    labels: [
      ["daily", "日常饮品"],
      ["gift", "礼物"],
    ],
  },
  skincare_trust: {
    topic: "护肤品牌的信任来源",
    affected: "优先表达温和亲近还是功效可信",
    prompt: "第一眼更要让人觉得温和，还是功效可信？",
    rephrase: "第一次买它，更需要安心感还是功效证据？",
    labels: [
      ["gentle", "温和亲近"],
      ["proof", "功效可信"],
    ],
  },
  saas_priority: {
    topic: "专业感的表达重点",
    affected: "突出功能实力还是容易上手",
    prompt: "专业感更应来自功能实力，还是容易上手？",
    rephrase: "新团队打开页面，先看到能力还是使用门槛低？",
    labels: [
      ["power", "功能实力"],
      ["simple", "容易上手"],
    ],
  },
  cafe_priority: {
    topic: "咖啡馆的第一印象",
    affected: "突出邻里亲近还是安静专注",
    prompt: "路过的人先感到邻里亲近，还是安静专注？",
    rephrase: "更希望居民进来聊天，还是安静待一会儿？",
    labels: [
      ["neighbor", "邻里亲近"],
      ["quiet", "安静专注"],
    ],
  },
  packaging_conflict: {
    topic: "包装结构限制冲突",
    impact: "blocking",
    affected: "定制金属盒与现成纸盒无法同时满足",
    prompt: "定制金属盒和只用现成纸盒，保留哪项？",
    rephrase: "实际下单时，必须选金属盒还是现成纸盒？",
    labels: [
      ["metal", "定制金属盒"],
      ["paper", "现成纸盒"],
    ],
  },
  purpose: {
    topic: "交付对象",
    impact: "blocking",
    affected: "需要知道设计对象，才能判断表达取舍",
    prompt: "这次具体要设计什么？",
    rephrase: "这次最终要交付的东西是什么？",
    labels: [],
  },
  perception: {
    topic: "希望形成的印象",
    affected: "确定设计应优先传达的感受",
    prompt: "最希望别人记住它的哪一点？",
    rephrase: "别人用一句话介绍它，你希望听到什么？",
    labels: [],
  },
};

const chosenText: Record<string, string> = {
  touch: "通过表面触感体现品质感",
  layout: "通过字体与版式体现品质感",
  tea: "先识别茶品，再识别品牌",
  brand: "先识别品牌，再识别茶品",
  daily: "触感服务于日常饮用",
  gift: "触感强化赠礼体验",
  gentle: "优先传达温和亲近",
  proof: "优先传达功效可信",
  power: "优先呈现功能实力",
  simple: "优先让人感到容易上手",
  neighbor: "优先传达邻里亲近",
  quiet: "优先传达安静专注",
  metal: "采用定制金属盒；现成纸盒限制不再适用",
  paper: "采用现成纸盒；不再要求定制金属盒",
};
function judgment(text: string, source = "brief"): Judgment {
  return {
    text: text.length > 240 ? text.slice(0, 239) + "…" : text,
    basis: "user",
    sourceIds: [source],
  };
}
function uncertainty(id: string): DesignState["uncertainties"][number] {
  const d = decisions[id];
  return {
    id,
    topic: d.topic,
    impact: d.impact ?? "material",
    decisionAffected: d.affected,
    status: "open",
  };
}
function initialize(rawBrief: string): DesignState {
  const example = EXAMPLES.find((e) => e.brief === rawBrief);
  const state: DesignState = {
    revision: 0,
    status: "questioning",
    brief: {
      goal: rawBrief.split(/[。\n]/)[0].slice(0, 240),
      audience: null,
      deliverable: null,
    },
    constraints: rawBrief
      .split(/[。\n，,]/)
      .filter((s) => /不要|避免|必须|不能|只用|要求/.test(s))
      .map((s) => judgment(s.trim())),
    direction: { intent: null, priorities: [], avoid: [], criteria: [] },
    uncertainties: [],
  };
  state.direction.avoid = state.constraints.filter((c) =>
    /不要|避免/.test(c.text),
  );
  const profiles: Record<string, [string, string, string, string | null]> = {
    tea: [
      "都市上班族",
      "冷泡罐装茶包装",
      "干净、有仪式感",
      "quality_expression",
    ],
    skincare: [
      "20–30 岁女性",
      "护肤品牌视觉",
      "自然、年轻、有品质感",
      "skincare_trust",
    ],
    saas: ["中小团队", "SaaS 官网和产品视觉", "专业、清晰", "saas_priority"],
    cafe: [
      "附近居民和远程办公的人",
      "咖啡馆品牌视觉",
      "湿润、克制",
      "cafe_priority",
    ],
    conflict: ["都市上班族", "礼品茶包装", "体面", "packaging_conflict"],
    complete: ["附近居民", "咖啡馆品牌视觉", "像熟悉的邻居", null],
  };
  const profile = example && profiles[example.id];
  if (profile) {
    state.brief.audience = profile[0];
    state.brief.deliverable = profile[1];
    state.direction.intent = judgment(profile[2]);
    if (profile[3]) state.uncertainties.push(uncertainty(profile[3]));
    if (example?.id === "complete") {
      state.direction.priorities = [judgment("优先传达日常可亲")];
      state.direction.avoid = [judgment("避免精品店距离感")];
      state.direction.criteria = [
        judgment("居民觉得适合每天来，而不是只来打卡"),
      ];
    }
  } else {
    state.uncertainties = [uncertainty("purpose")];
  }
  return state;
}

export function mockConvergence(input: ConvergenceInput): TurnPayload {
  const state = input.state
    ? structuredClone(input.state)
    : initialize(input.rawBrief);
  const { event, pendingQuestion: q } = input;
  if (event.type === "answer" && q && event.answer.kind !== "uncertain") {
    const value =
      event.answer.kind === "option"
        ? chosenText[event.answer.optionId]
        : answerText(q, event.answer);
    const item = judgment(value, input.requestId);
    state.uncertainties = state.uncertainties.filter(
      (u) => u.id !== q.uncertaintyId,
    );
    if (q.uncertaintyId === "purpose") {
      state.brief.deliverable = value;
      state.uncertainties.push(uncertainty("perception"));
    } else if (q.uncertaintyId === "perception") {
      state.direction.intent = item;
    } else {
      state.direction.priorities.push(item);
      if (q.uncertaintyId === "packaging_conflict") {
        state.constraints = [
          ...state.constraints.filter(
            (c) => !q.constraintRefs.includes(c.text),
          ),
          item,
        ];
        state.direction.criteria.push(
          judgment("按已选择的结构评估设计", input.requestId),
        );
      }
      if (
        q.uncertaintyId === "quality_expression" &&
        event.answer.kind === "option"
      ) {
        state.uncertainties.push(
          uncertainty(
            event.answer.optionId === "touch"
              ? "tactile_priority"
              : "hierarchy",
          ),
        );
      }
    }
  }
  if (event.type === "correct") {
    // Only the demo's known decision can be replaced automatically; other input is additive.
    const target = /品质|触感|版式/.test(event.text)
      ? "quality_expression"
      : /茶品|品牌优先/.test(event.text)
        ? "hierarchy"
        : null;
    const sources = new Set(
      input.history
        .filter((h) => h.question?.uncertaintyId === target)
        .map((h) => h.id),
    );
    const index = target
      ? state.direction.priorities.findIndex((j) =>
          j.sourceIds.some((id) => sources.has(id)),
        )
      : -1;
    const item = judgment(event.text.replace(/^改为/, ""), input.requestId);
    if (index >= 0) state.direction.priorities[index] = item;
    else state.direction.priorities.push(item);
    if (target)
      state.uncertainties = state.uncertainties.filter((u) => u.id !== target);
  }
  const afterCorrection = input.history.findLastIndex(
    (h) => h.event.type === "correct",
  );
  const recent = input.history.slice(afterCorrection + 1);
  for (const u of state.uncertainties) {
    const attempts =
      recent.filter(
        (h) =>
          h.question?.uncertaintyId === u.id &&
          h.event.type === "answer" &&
          h.event.answer.kind === "uncertain",
      ).length +
      (event.type === "answer" &&
      event.answer.kind === "uncertain" &&
      q?.uncertaintyId === u.id
        ? 1
        : 0);
    if (attempts >= 2) u.status = "deferred";
  }
  const u = state.uncertainties.find(
    (u) => u.status === "open" && u.impact !== "minor",
  );
  if (!u) {
    state.status = "checkpoint";
    return {
      state,
      next: {
        type: "checkpoint",
        reason: state.uncertainties.length ? "needs_evidence" : "ready",
      },
    };
  }
  const d = decisions[u.id];
  const rephrase =
    event.type === "answer" &&
    event.answer.kind === "uncertain" &&
    q?.uncertaintyId === u.id;
  const question: Question = {
    id: `q_${input.requestId}`,
    uncertaintyId: u.id,
    prompt: rephrase ? d.rephrase : d.prompt,
    constraintRefs:
      u.id === "packaging_conflict"
        ? state.constraints
            .filter((c) => /金属盒|纸盒/.test(c.text))
            .map((c) => c.text)
        : [],
    options: d.labels.map(([id, label]) => ({ id, label })),
  };
  state.status = "questioning";
  return { state, next: { type: "ask", question } };
}
