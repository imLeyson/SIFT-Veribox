export type RouteTitleContext = {
  startingPoint?: string;
  focusDimension?: string;
};

const GENERIC_TITLES = /^(?:自然|极简|高级|复古|现代|轻奢|科技感|温暖|可爱|优雅|大气|高端|简约|清新|质感|时尚|酷炫|潮流)$/;
const POETIC_TITLE_PATTERNS = [
  /远看.+近看/,
  /掌心.*(?:磨|亮|温)/,
  /(?:时光|岁月|初见|星河|余温|心流|共鸣|交融|升华|软岛)/,
  /一(?:弧|记|抹|眼|面)/,
];

function cleanSurface(value: string): string {
  return value
    .replace(/[“”‘’"'`]/g, "")
    .replace(/[《》【】]/g, "")
    .replace(/\s+(?:[·•|｜]|[-–—])?\s*[A-Za-z][A-Za-z0-9 /_-]*$/g, "")
    .replace(/\s*[×✕]\s*/g, "与")
    .replace(/\s*[/／|｜]\s*/g, "与")
    .replace(/\s+/g, " ")
    .replace(/[。.!！?？]+$/g, "")
    .trim();
}

function stripEnglishSuffix(value: string): string {
  return value.replace(/\s+[A-Za-z][A-Za-z0-9 /_-]*$/, "").trim();
}

function directCandidate(value: string): string {
  return cleanSurface(value)
    .replace(/^(?:以|从|通过|围绕|基于|针对|当前|核心)\s*/g, "")
    .replace(/(?:的)?(?:视觉|设计|探索|切入点|方向|表达|表现)$/g, "")
    .trim();
}

function directFallback(context: RouteTitleContext, fallback: string): string {
  const candidates = [context.startingPoint, context.focusDimension, fallback]
    .filter((value): value is string => Boolean(value?.trim()))
    .map(directCandidate)
    .filter((value) => value.length >= 4);

  const candidate = candidates[0] || "设计方向";
  return candidate.length > 20 ? candidate.slice(0, 20).replace(/[，、；：:]+$/, "") : candidate;
}

/**
 * Keeps route titles readable as working labels instead of turning them into slogans.
 * The model still supplies the title; this only removes decorative or formulaic framing.
 */
export function normalizeRouteTitle(
  rawTitle: string,
  fallback: string,
  context: RouteTitleContext = {},
): string {
  const source = rawTitle.trim();
  const cleaned = cleanSurface(source);
  const fallbackTitle = directFallback(context, fallback);
  const isDecorated = /[《》【】]/.test(source);
  const isFormulaic = /[×✕]/.test(source);
  const isPoetic = POETIC_TITLE_PATTERNS.some((pattern) => pattern.test(cleaned));
  const isPromotional = /^(?:打造|构建|探索|呈现|开启|让|赋能|焕新)/.test(cleaned);

  if (
    !cleaned ||
    GENERIC_TITLES.test(cleaned) ||
    isDecorated ||
    isFormulaic ||
    isPoetic ||
    isPromotional
  ) {
    return fallbackTitle;
  }

  return cleaned;
}

export function normalizeThemeName(
  rawName: string,
  fallback: string,
  context: RouteTitleContext = {},
): string {
  const source = rawName.trim();
  const sourceWithoutEnglish = stripEnglishSuffix(source);
  const normalized = normalizeRouteTitle(sourceWithoutEnglish, fallback, context);
  if (source.includes("《") && source.includes("》")) {
    const book = source.match(/《([^》]+)》/)?.[1]?.trim();
    if (book && book.length >= 2 && !POETIC_TITLE_PATTERNS.some((pattern) => pattern.test(book))) {
      return book.length > 12 ? book.slice(0, 12) : book;
    }
  }
  if (/^[^\u4e00-\u9fa5]*[A-Za-z][A-Za-z0-9 /_-]*$/.test(source) || /[《》【】]/.test(source)) {
    const stripped = cleanSurface(source);
    if (stripped && !POETIC_TITLE_PATTERNS.some((pattern) => pattern.test(stripped))) {
      return stripped.length > 12 ? stripped.slice(0, 12).replace(/[，、；：:与和]+$/, "") : stripped;
    }
  }
  return normalized.length > 12
    ? normalized.slice(0, 12).replace(/[，、；：:与和]+$/, "")
    : normalized;
}
