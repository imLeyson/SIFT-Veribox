import type { PlatformSource } from "@/types";

export const SOURCE_REGISTRY = [
  "Pinterest",
  "Behance",
  "小红书",
  "Are.na",
  "Savee",
  "Cosmos",
  "Designspiration",
  "品牌官网",
  "收集箱",
] as const;

const SOURCE_URLS: Record<string, (q: string) => string> = {
  Pinterest: (q) =>
    `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(q)}`,
  Behance: (q) =>
    `https://www.behance.net/search/projects?search=${encodeURIComponent(q)}`,
  小红书: (q) =>
    `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(q)}`,
  "Are.na": (q) => `https://www.are.na/search?q=${encodeURIComponent(q)}`,
  Savee: (q) => `https://savee.it/search/?q=${encodeURIComponent(q)}`,
  Cosmos: (q) => `https://www.cosmos.so/search/${encodeURIComponent(q)}`,
  Designspiration: (q) =>
    `https://www.designspiration.com/search/saves/?q=${encodeURIComponent(q)}`,
  品牌官网: (q) =>
    `https://www.google.com/search?q=${encodeURIComponent(q + " official site")}`,
  收集箱: () => "#",
};

export function withSearchUrl(source: PlatformSource): PlatformSource {
  const builder = SOURCE_URLS[source.name];
  const firstQuery = source.queries[0]?.query ?? source.name;
  return {
    ...source,
    searchUrl: builder ? builder(firstQuery) : undefined,
  };
}
