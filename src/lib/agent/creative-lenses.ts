export type CreativeLens = {
  id: string;
  label: string;
  instruction: string;
};

const CREATIVE_LENSES: CreativeLens[] = [
  {
    id: "use",
    label: "使用动作",
    instruction: "从用户真实使用中的一个动作、停顿或触点出发，把它转译成形态、节奏或界面行为。避免只描述材质和颜色。",
  },
  {
    id: "scene",
    label: "场景关系",
    instruction: "从产品与桌面、货架、房间、屏幕或人的关系出发，提出一个具体场景中的视觉命题。",
  },
  {
    id: "material",
    label: "材料变化",
    instruction: "从材料的来源、变化过程、缺陷或老化痕迹出发，形成一个可被看见的设计语言，避免泛泛使用‘高级质感’。",
  },
  {
    id: "information",
    label: "信息结构",
    instruction: "从内容的阅读顺序、信息取舍或标记方式出发，把信息组织转译成视觉结构，不要默认使用网格模板。",
  },
  {
    id: "culture",
    label: "文化线索",
    instruction: "从 Brief 中真实出现的地域、物件、工艺或生活经验提取线索，只使用有来源的文化意象，不凭空添加故事。",
  },
  {
    id: "contrast",
    label: "反常组合",
    instruction: "从任务中的两个真实约束之间寻找不寻常但可解释的组合，形成明确的视觉冲突与取舍。",
  },
  {
    id: "scale",
    label: "尺度变化",
    instruction: "从远看与近看、整体与局部、日常尺寸与微缩尺寸的差异出发，建立具有层次的视觉体验。",
  },
  {
    id: "trace",
    label: "时间痕迹",
    instruction: "从使用留下的磨损、折痕、沉积、变化或记录痕迹出发，提出一个会随时间成立的视觉母题。",
  },
];

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function selectCreativeLenses(seed: string, count = 3): CreativeLens[] {
  const safeCount = Math.max(1, Math.min(count, CREATIVE_LENSES.length));
  const start = hashSeed(seed) % CREATIVE_LENSES.length;
  const strides = [1, 3, 5, 7];
  const stride = strides[hashSeed(`${seed}:stride`) % strides.length];
  const selected: CreativeLens[] = [];
  const used = new Set<number>();

  for (let offset = 0; selected.length < safeCount && offset < CREATIVE_LENSES.length * 2; offset += 1) {
    const index = (start + offset * stride) % CREATIVE_LENSES.length;
    if (used.has(index)) continue;
    used.add(index);
    selected.push(CREATIVE_LENSES[index]);
  }

  return selected;
}
