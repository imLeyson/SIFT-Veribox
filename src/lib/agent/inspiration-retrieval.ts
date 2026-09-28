import type { z } from "zod";
import {
  PlatformPlanInputSchema,
  PlatformPlanSchema,
} from "./routes-schema";
import type {
  InspirationEvidence,
  PlatformPlan,
  PlatformSource,
} from "@/types/routes";
import {
  scoreInspirationCandidates,
  type InspirationCandidate,
} from "./system-one";

type PlatformPlanInput = z.infer<typeof PlatformPlanInputSchema>;
type PlatformPlanContract = z.infer<typeof PlatformPlanSchema>;

type SearchHit = {
  title: string;
  url: string;
  excerpt?: string;
};

type SourceConfig = {
  host: string;
  wordpress?: boolean;
  searchPath?: string;
};

const SOURCE_CONFIGS: Record<string, SourceConfig> = {
  dezeen: { host: "www.dezeen.com", wordpress: true },
  "the dieline": { host: "thedieline.com", wordpress: true },
  bpando: { host: "bpando.org", wordpress: true },
  "packaging of the world": { host: "packagingoftheworld.com", wordpress: true },
  "its nice that": { host: "www.itsnicethat.com", searchPath: "/search" },
  "are.na": { host: "www.are.na", searchPath: "/search" },
  behance: { host: "www.behance.net", searchPath: "/search/projects" },
  dribbble: { host: "dribbble.com", searchPath: "/search" },
  godly: { host: "godly.website", searchPath: "/" },
  typewolf: { host: "www.typewolf.com", searchPath: "/" },
  "fonts in use": { host: "fontsinuse.com", searchPath: "/" },
  brandnew: { host: "www.underconsideration.com", searchPath: "/brandnew" },
  "站酷": { host: "www.zcool.com.cn", searchPath: "/search" },
  "小红书": { host: "www.xiaohongshu.com", searchPath: "/search_result" },
  pinterest: { host: "www.pinterest.com", searchPath: "/search/pins" },
};

const DEFAULT_CONFIG: SourceConfig = {
  host: "www.google.com",
  searchPath: "/search",
};

function normalizePlatform(platform: string): string {
  return platform.toLowerCase().replace(/[()·]/g, " ").replace(/\s+/g, " ").trim();
}

function sourceConfig(platform: string): SourceConfig {
  const normalized = normalizePlatform(platform);
  const exact = SOURCE_CONFIGS[normalized];
  if (exact) return exact;
  const entry = Object.entries(SOURCE_CONFIGS).find(([key]) =>
    normalized.includes(key) || key.includes(normalized),
  );
  return entry?.[1] ?? DEFAULT_CONFIG;
}

function cleanText(value: string, max = 360): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function decodeJsonTitle(value: unknown): string {
  if (typeof value === "string") return cleanText(value, 180);
  if (value && typeof value === "object" && "rendered" in value) {
    return cleanText(String((value as { rendered?: unknown }).rendered ?? ""), 180);
  }
  return "";
}

function isAllowedUrl(url: string, config: SourceConfig): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      (parsed.hostname === config.host || parsed.hostname.endsWith(`.${config.host}`))
    );
  } catch {
    return false;
  }
}

function buildQuery(source: PlatformSource, input: PlatformPlanInput): string {
  const keyword =
    source.keywords.find((item) => item.dimension === "reality") ??
    source.keywords.find((item) => item.dimension === "form") ??
    source.keywords[0];
  const route = input.selectedRoute;
  const raw = [
    route.themeName || route.title,
    route.focusDimension,
    keyword?.advancedQuery || keyword?.calibratedQuery || keyword?.keyword,
    input.currentStep.title,
  ]
    .filter(Boolean)
    .join(" ");
  return raw.replace(/\s+/g, " ").trim().slice(0, 180);
}

async function fetchText(url: string, timeoutMs = 7000): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "SIFT-Inspiration-Reader/1.0",
        Accept: "text/html,application/json,text/plain;q=0.9",
        "Accept-Language": "en-US,en;q=0.8,zh-CN;q=0.7",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

async function searchWordpress(config: SourceConfig, query: string): Promise<SearchHit[]> {
  if (!config.wordpress) return [];
  const endpoint = new URL(`https://${config.host}/wp-json/wp/v2/search`);
  endpoint.searchParams.set("search", query);
  endpoint.searchParams.set("per_page", "6");
  endpoint.searchParams.set("_fields", "title,url,subtype");
  const raw = await fetchText(endpoint.toString(), 7000);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<{ title?: unknown; url?: string; subtype?: string }>;
    return parsed
      .filter((item) => item.url && item.subtype !== "attachment")
      .map((item) => ({ title: decodeJsonTitle(item.title), url: item.url! }))
      .filter((item) => item.title && isAllowedUrl(item.url, config));
  } catch {
    return [];
  }
}

function parseReaderLinks(markdown: string, config: SourceConfig): SearchHit[] {
  const hits: SearchHit[] = [];
  const pattern = /\[([^\]]{3,180})\]\((https?:\/\/[^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markdown)) && hits.length < 12) {
    const title = cleanText(match[1], 180);
    const url = match[2].replace(/&amp;/g, "&");
    if (!title || !isAllowedUrl(url, config)) continue;
    const path = new URL(url).pathname;
    if (path === "/" || path.length < 8 || /\/search|\/tag\/|\/category\//i.test(path)) continue;
    if (hits.some((hit) => hit.url === url)) continue;
    hits.push({ title, url });
  }
  return hits;
}

async function searchViaReader(config: SourceConfig, query: string): Promise<SearchHit[]> {
  if (config.host === "www.google.com") return [];
  const path = config.searchPath || "/";
  const target = new URL(`https://${config.host}${path}`);
  target.searchParams.set(path.includes("search") ? "q" : "s", query);
  const readerUrl = `https://r.jina.ai/http://${target.host}${target.pathname}${target.search}`;
  const markdown = await fetchText(readerUrl, 12000);
  return markdown ? parseReaderLinks(markdown, config) : [];
}

async function readPage(hit: SearchHit, config: SourceConfig): Promise<InspirationCandidate | null> {
  if (!isAllowedUrl(hit.url, config)) return null;
  const direct = await fetchText(hit.url, 7000);
  const directExcerpt = direct ? extractPageExcerpt(direct) : "";
  if (directExcerpt.length >= 80) {
    return { id: hit.url, title: hit.title, excerpt: directExcerpt, url: hit.url };
  }

  const readerUrl = `https://r.jina.ai/http://${new URL(hit.url).host}${new URL(hit.url).pathname}`;
  const markdown = await fetchText(readerUrl, 12000);
  if (!markdown) return null;
  const excerpt = cleanText(markdown.replace(/^Title:[^\n]*\n/i, ""), 420);
  return excerpt.length >= 80
    ? { id: hit.url, title: hit.title, excerpt, url: hit.url }
    : null;
}

function extractPageExcerpt(html: string): string {
  const description =
    html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)["']/i)?.[1] ??
    "";
  const article =
    html.match(/<(?:article|main)[^>]*>([\s\S]*?)<\/(?:article|main)>/i)?.[1] ??
    html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ??
    html;
  const bodyText = cleanText(article, 900);
  return cleanText(`${description} ${bodyText}`, 420);
}

function contextFor(input: PlatformPlanInput) {
  const direction = input.state.direction;
  return {
    brief: input.state.brief.goal || "",
    strategy: direction?.intent?.text || "",
    theme: input.selectedRoute.themeName || input.selectedRoute.title,
    snapshot: input.selectedRoute.visualSnapshot || "",
    step: `${input.currentStep.title} ${input.currentStep.question} ${input.currentStep.purpose}`,
  };
}

async function enrichSource(
  source: PlatformSource,
  input: PlatformPlanInput,
): Promise<PlatformSource> {
  const config = sourceConfig(source.platform);
  const query = buildQuery(source, input);
  const searchedAt = new Date().toISOString();
  let hits = await searchWordpress(config, query);
  if (hits.length === 0) hits = await searchViaReader(config, query);
  const candidates = (
    await Promise.all(hits.slice(0, 6).map((hit) => readPage(hit, config)))
  ).filter((candidate): candidate is InspirationCandidate => Boolean(candidate));

  if (candidates.length === 0) {
    return {
      ...source,
      retrieval: { status: "unavailable", query, searchedAt, reviewedCount: 0 },
      evidence: [],
    };
  }

  const scoringContext = contextFor(input);
  scoringContext.step = `${scoringContext.step} ${query}`;
  const scores = await scoreInspirationCandidates(scoringContext, candidates);
  const evidence: InspirationEvidence[] = candidates
    .map((candidate) => {
      const score = scores[candidate.id];
      return {
        url: candidate.url,
        title: candidate.title,
        excerpt: candidate.excerpt,
        relevanceScore: score?.score ?? 0,
        confidence: score?.confidence ?? 0,
        matchedSignals: score?.matchedSignals ?? [],
      };
    })
    .filter((item) => item.relevanceScore >= 48)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 3);

  return {
    ...source,
    retrieval: {
      status: evidence.length > 0 ? "live" : "partial",
      query,
      searchedAt,
      reviewedCount: candidates.length,
    },
    evidence,
  };
}

export async function enrichPlatformPlan(
  input: PlatformPlanInput,
  plan: PlatformPlanContract | PlatformPlan,
): Promise<PlatformPlan> {
  if (process.env.INSPIRATION_RETRIEVAL === "off") return plan as PlatformPlan;
  const enriched = await Promise.all(
    plan.primarySources.map((source) => enrichSource(source, input)),
  );
  return PlatformPlanSchema.parse({
    ...plan,
    primarySources: enriched,
  });
}
