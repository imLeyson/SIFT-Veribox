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
    affected: "品质感由表面触感还是视觉秩序承担",
    prompt: "品质感主要靠表面触感与特种纸，还是字体与版式网格？",
    rephrase: "拿在手里把玩的触觉质感，还是摆在眼前看到的排版留白，更要显出高级？",
    labels: [
      ["touch", "表面特种纸与微距肌理"],
      ["layout", "非衬线微排版与网格留白"],
    ],
  },
  hierarchy: {
    topic: "包装正面的信息主次",
    affected: "茶品风味还是品牌视觉符号先被识别",
    prompt: "包装正面先突出茶品风味，还是品牌视觉符号？",
    rephrase: "远看这罐茶，先认出品种风味还是品牌大标？",
    labels: [
      ["tea", "茶品风味与产地标识优先"],
      ["brand", "品牌超级符号优先"],
    ],
  },
  skincare_trust: {
    topic: "护肤品牌的视觉信任来源",
    affected: "优先表达温和情绪还是理性功效微排版",
    prompt: "视觉第一眼更要让人感到温和静谧，还是理性功效可信？",
    rephrase: "初次相遇，更需要情绪治愈感还是精密配方理性感？",
    labels: [
      ["gentle", "温和静谧情绪色盘"],
      ["proof", "理性功效数字微排版"],
    ],
  },
  saas_priority: {
    topic: "专业感的表达重点",
    affected: "高密度数据网格还是轻量通透留白",
    prompt: "视觉专业感更应来自高密度精密网格，还是轻量通透留白？",
    rephrase: "新团队打开页面，先感受到精密掌控力还是极简呼吸感？",
    labels: [
      ["power", "精密微阴影与高密度网格"],
      ["simple", "大字阶排版与呼吸感留白"],
    ],
  },
  cafe_priority: {
    topic: "咖啡馆的第一视觉印象",
    affected: "自然手作暖调还是现代极简冷调",
    prompt: "品牌视觉更倾向温润手作纸感，还是极简单色克制版式？",
    rephrase: "希望视觉像街角温润的木质窗口，还是现代冷静的艺廊画册？",
    labels: [
      ["neighbor", "自然手作纸感与草木暖调"],
      ["quiet", "极简单色与克制网格"],
    ],
  },
  packaging_conflict: {
    topic: "包装盒型结构限制冲突",
    impact: "blocking",
    affected: "冷冽金属罐体与质朴原色纸盒取舍",
    prompt: "包装盒型视觉基底，保留冷冽金属罐还是质朴卡纸盒？",
    rephrase: "在视觉定调上，保留定制金属质感还是现成质朴纸盒质感？",
    labels: [
      ["metal", "冷冽金属罐体视觉"],
      ["paper", "质朴原色卡纸盒视觉"],
    ],
  },
  perception: {
    topic: "希望形成的视觉第一印象",
    affected: "确定设计应优先传达的视觉感受",
    prompt: "用户第一眼最应该记住它的哪种视觉感受与画面记忆？",
    rephrase: "用一句设计语言描述，你希望它给人带来怎样的画面感？",
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
    visualKeywords: ["极简版式", "克制微质感", "网格留白"],
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
