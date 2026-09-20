import type {
  ConvergenceInput,
  DesignState,
  Judgment,
  Question,
  Answer,
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
    rephrase: "新团队打开页面，先看到能力还是门槛低？",
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
  perception: {
    topic: "希望形成的印象",
    affected: "确定设计应优先传达的感受",
    prompt: "别人第一眼最应该记住它的哪一点？",
    rephrase: "别人用一句话介绍它，你希望听到什么？",
    labels: [],
  },
};

const chosenText: Record<string, string> = {
  touch: "通过表面触感体现品质感",
  layout: "通过字体与版式体现品质感",
  tea: "先识别茶品，再识别品牌",
  brand: "先识别品牌，再识别茶品",
  gentle: "优先传达温和亲近",
  proof: "优先传达功效可信",
  power: "优先呈现功能实力",
  simple: "优先让人感到容易上手",
  neighbor: "优先传达邻里亲近",
  quiet: "优先传达安静专注",
  metal: "采用定制金属盒；现成纸盒限制不再适用",
  paper: "采用现成纸盒；不再要求定制金属盒",
};

function judgment(
  text: string,
  source = "brief",
  basis: Judgment["basis"] = "user",
): Judgment {
  return {
    text: text.length > 240 ? text.slice(0, 239) + "…" : text,
    basis,
    sourceIds: [source],
  };
}

function uncertainty(id: string): DesignState["uncertainties"][number] {
  const decision = decisions[id];
  return {
    id,
    topic: decision.topic,
    impact: decision.impact ?? "material",
    decisionAffected: decision.affected,
    status: "open",
  };
}

function hypothesis(state: DesignState): string | null {
  const priorities = state.direction.priorities.map((item) => item.text);
  if (!priorities.length) return state.direction.intent?.text ?? null;
  const focus = priorities.slice(-3).join("，并");
  return `${state.brief.goal ?? "这项设计"}应先${focus}，再用一个可观察的对照验证是否成立。`;
}

function validation(state: DesignState) {
  if (!state.direction.priorities.length) return null;
  return {
    label: "做一个最小对照",
    instruction: "用两张低保真草图只改变当前优先项，问一位目标用户先注意到什么。",
  };
}

function initialize(rawBrief: string): DesignState {
  const example = EXAMPLES.find((item) => item.brief === rawBrief);
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
      .filter((item) => /不要|避免|必须|不能|只用|要求/.test(item))
      .map((item) => judgment(item.trim())),
    direction: { intent: null, priorities: [], avoid: [], criteria: [] },
    currentHypothesis: null,
    validationAction: null,
    uncertainties: [],
  };
  state.direction.avoid = state.constraints.filter((item) =>
    /不要|避免/.test(item.text),
  );
  const profiles: Record<
    string,
    [string, string, string, string[], string | null]
  > = {
    tea: [
      "都市上班族",
      "冷泡罐装茶包装",
      "干净、有仪式感",
      ["quality_expression", "hierarchy"],
      null,
    ],
    skincare: [
      "20–30 岁女性",
      "护肤品牌视觉",
      "自然、年轻、有品质感",
      ["skincare_trust", "perception"],
      null,
    ],
    saas: [
      "中小团队",
      "SaaS 官网和产品视觉",
      "专业、清晰",
      ["saas_priority", "perception"],
      null,
    ],
    cafe: [
      "附近居民和远程办公的人",
      "咖啡馆品牌视觉",
      "湿润、克制",
      ["cafe_priority", "perception"],
      null,
    ],
    conflict: [
      "都市上班族",
      "礼品茶包装",
      "体面",
      ["packaging_conflict", "perception"],
      null,
    ],
    complete: ["附近居民", "咖啡馆品牌视觉", "像熟悉的邻居", [], null],
  };
  const profile = example && profiles[example.id];
  if (profile) {
    state.brief.audience = profile[0];
    state.brief.deliverable = profile[1];
    state.direction.intent = judgment(profile[2]);
    state.uncertainties = profile[3].map(uncertainty);
    if (example?.id === "complete") {
      state.direction.priorities = [judgment("优先传达日常可亲")];
      state.direction.avoid = [judgment("避免精品店距离感")];
      state.direction.criteria = [
        judgment("居民觉得适合每天来，而不是只来打卡"),
      ];
    }
  } else {
    state.uncertainties = [uncertainty("perception")];
  }
  state.currentHypothesis = hypothesis(state);
  state.validationAction = validation(state);
  return state;
}

function answerFor(question: Question, answer: Answer) {
  if (answer.kind === "option") return chosenText[answer.optionId] ?? answer.optionId;
  return answerText(question, answer);
}

function questionFor(
  state: DesignState,
  input: ConvergenceInput,
  index: number,
  rephrase: boolean,
): Question[] {
  const open = state.uncertainties.filter(
    (item) => item.status === "open" && item.impact !== "minor",
  );
  if (open.length < 2) return [];
  return open.slice(0, 3).map((item, offset) => {
    const decision = decisions[item.id];
    return {
      id: `q_${input.requestId}_${index + offset}`,
      uncertaintyId: item.id,
      prompt: rephrase ? decision.rephrase : decision.prompt,
      constraintRefs:
        item.id === "packaging_conflict"
          ? state.constraints
              .filter((constraint) => /金属盒|纸盒/.test(constraint.text))
              .map((constraint) => constraint.text)
          : [],
      options: decision.labels.map(([id, label]) => ({ id, label })),
    };
  });
}

function assumeOpenJudgments(state: DesignState, requestId: string) {
  const remaining: DesignState["uncertainties"] = [];
  for (const item of state.uncertainties) {
    if (item.status !== "open" || item.impact === "minor") {
      remaining.push(item);
      continue;
    }
    const decision = decisions[item.id];
    const label = decision.labels[0]?.[1] ?? decision.affected;
    const assumed = judgment(`先按${label}推进`, requestId, "assumption");
    if (item.id === "perception" && !state.direction.intent) {
      state.direction.intent = assumed;
    } else {
      state.direction.priorities.push(assumed);
    }
  }
  state.uncertainties = remaining;
}

export function mockConvergence(input: ConvergenceInput): TurnPayload {
  const state = input.state ? structuredClone(input.state) : initialize(input.rawBrief);
  const { event } = input;
  if (event.type === "fast_start") {
    assumeOpenJudgments(state, input.requestId);
    state.currentHypothesis = hypothesis(state);
    state.validationAction = validation(state);
    state.status = "checkpoint";
    return {
      state,
      next: { type: "checkpoint", reason: "fast_converged" },
    };
  }
  if (event.type === "answer") {
    const answers = event.answers;
    for (const answer of answers) {
      const question = input.pendingQuestions?.find(
        (item) => item.id === answer.questionId,
      );
      if (!question || answer.kind === "uncertain") continue;
      const value = answerFor(question, answer);
      const item = judgment(value, input.requestId);
      state.uncertainties = state.uncertainties.filter(
        (uncertaintyItem) => uncertaintyItem.id !== question.uncertaintyId,
      );
      if (question.uncertaintyId === "perception") state.direction.intent = item;
      else state.direction.priorities.push(item);
      if (question.uncertaintyId === "packaging_conflict") {
        state.constraints = [
          ...state.constraints.filter(
            (constraint) => !question.constraintRefs.includes(constraint.text),
          ),
          item,
        ];
        state.direction.criteria.push(
          judgment("按已选择的结构评估设计", input.requestId),
        );
      }
    }
  }
  if (event.type === "correct") {
    state.direction.priorities.push(judgment(event.text.replace(/^改为/, ""), input.requestId));
  }

  const answerEvents = event.type === "answer" ? event.answers : [];
  const uncertainQuestionIds = new Set(
    answerEvents
      .filter((answer) => answer.kind === "uncertain")
      .map((answer) => answer.questionId),
  );
  for (const uncertaintyItem of state.uncertainties) {
    const attempts = input.history.reduce((count, entry) => {
      if (entry.event.type !== "answer") return count;
      const answers = entry.event.answers;
      return (
        count +
        (entry.questions ?? []).filter(
          (question) =>
            question.uncertaintyId === uncertaintyItem.id &&
            answers.some((answer) => answer.kind === "uncertain"),
        ).length
      );
    }, 0);
    if (
      attempts +
      [...uncertainQuestionIds].filter((id) =>
        input.pendingQuestions?.some(
          (question) => question.id === id && question.uncertaintyId === uncertaintyItem.id,
        ),
      ).length >= 2
    )
      uncertaintyItem.status = "deferred";
  }

  state.currentHypothesis = hypothesis(state);
  state.validationAction = validation(state);
  const questions = questionFor(
    state,
    input,
    1,
    event.type === "answer" &&
      event.answers.some((answer) => answer.kind === "uncertain"),
  );
  if (!questions.length) {
    state.status = "checkpoint";
    return {
      state,
      next: {
        type: "checkpoint",
        reason: state.uncertainties.some((item) => item.status === "open")
          ? "needs_evidence"
          : "ready",
      },
    };
  }
  state.status = "questioning";
  return { state, next: { type: "ask", questions } };
}
