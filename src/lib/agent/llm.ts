const BASE_URL = (
  process.env.LLM_BASE_URL ?? "https://api.deepseek.com"
).replace(/\/$/, "");
const API_KEY = process.env.LLM_API_KEY ?? "";
// DeepSeek-V4.1-Flash 的官方 API ID 是 deepseek-flash。
const MODEL = process.env.LLM_MODEL ?? "deepseek-flash";
const REASONING = process.env.LLM_REASONING_EFFORT ?? "medium";
// 服务端 45s 先于客户端 50s 超时，保证用户拿到可读错误而不是请求被掐断。
// Vercel 函数上限 maxDuration=60s，留出余量。
const configuredTimeout = Number(process.env.LLM_TIMEOUT_MS ?? 45000);
const TIMEOUT_MS =
  Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? Math.min(configuredTimeout, 45000)
    : 45000;

export function llmConfigured() {
  return Boolean(API_KEY);
}

export function llmModelName() {
  return MODEL;
}

function jsonCandidates(text: string) {
  const candidates: string[] = [];
  for (let start = 0; start < text.length; start += 1) {
    if (text[start] !== "{") continue;
    let depth = 0;
    let quoted = false;
    let escaped = false;
    for (let index = start; index < text.length; index += 1) {
      const char = text[index];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') quoted = false;
        continue;
      }
      if (char === '"') {
        quoted = true;
        continue;
      }
      if (char === "{") depth += 1;
      if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          candidates.push(text.slice(start, index + 1));
          break;
        }
      }
    }
  }
  return candidates;
}

function repairJsonSyntax(candidate: string) {
  return candidate
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1");
}

export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const sources = [fenced, trimmed].filter(
    (source): source is string => Boolean(source),
  );
  const candidates = sources.flatMap(jsonCandidates);
  if (!candidates.length) throw new Error("模型没有返回 JSON");
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      try {
        return JSON.parse(repairJsonSyntax(candidate));
      } catch {
        // Try the next balanced JSON object before reporting a provider error.
      }
    }
  }
  throw new Error("模型返回了无法解析的 JSON");
}

export async function completeJson<T>(
  system: string,
  user: string,
  reasoningEffort = REASONING,
): Promise<T> {
  if (!API_KEY) throw new Error("未配置 LLM_API_KEY");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await withRetry(() =>
      completeJsonOnce<T>(system, user, reasoningEffort, controller.signal),
    );
  } finally {
    clearTimeout(timer);
  }
}

function isRetryable(error: unknown, status?: number): boolean {
  if (status && status >= 500 && status !== 504) return true;
  const msg = error instanceof Error ? error.message : String(error);
  if (/超时|AbortError/i.test(msg)) return false;
  return /为空|SSL|ECONNRESET|network/i.test(msg);
}

async function completeJsonOnce<T>(
  system: string,
  user: string,
  reasoningEffort: string,
  signal: AbortSignal,
): Promise<T> {
  let res: Response;
  let raw: string;
  try {
    res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      signal,
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        // The contract is compact; limiting completion length keeps the
        // interactive checkpoint below the server/client timeout window.
        max_tokens: 3200,
        reasoning_effort: reasoningEffort,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    raw = await res.text();
  } catch {
    if (signal.aborted) {
      throw new Error("模型请求超时，请再试一次");
    }
    throw new Error("模型网关网络错误，请再试一次");
  }

  if (!res.ok) {
    const err = new Error(`模型请求失败（${res.status}）`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  if (!raw.trim()) {
    throw new Error("模型网关返回为空，请再试一次");
  }

  let payload: {
    choices?: { message?: { content?: string | null } }[];
  };
  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    throw new Error("模型网关返回了无法解析的内容");
  }
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("模型返回为空");
  return extractJson(content) as T;
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (!isRetryable(error, status)) throw error;
    await new Promise((r) => setTimeout(r, 800));
    return fn();
  }
}
