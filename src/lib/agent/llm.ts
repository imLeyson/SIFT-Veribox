const BASE_URL = (
  process.env.LLM_BASE_URL ?? "https://api.deepseek.com"
).replace(/\/$/, "");
const API_KEY = process.env.LLM_API_KEY ?? "";
// DeepSeek-V4.1-Flash 的官方 API ID 是 deepseek-flash。
const MODEL = process.env.LLM_MODEL ?? "deepseek-flash";
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

function isJsonValue(value: unknown): value is Record<string, unknown> | unknown[] {
  return Boolean(value) && typeof value === "object";
}

function jsonCandidates(text: string) {
  const candidates: string[] = [];
  for (let start = 0; start < text.length; start += 1) {
    if (text[start] !== "{" && text[start] !== "[") continue;
    const open = text[start];
    const close = open === "{" ? "}" : "]";
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
      if (char === open) depth += 1;
      else if (char === close) {
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
    .replace(/｛/g, "{")
    .replace(/｝/g, "}")
    .replace(/［/g, "[")
    .replace(/］/g, "]")
    .replace(/,\s*([}\]])/g, "$1");
}

export function extractJson(text: unknown): unknown {
  if (isJsonValue(text)) return text;
  if (typeof text !== "string") throw new Error("模型没有返回 JSON");
  const trimmed = text.replace(/<think>[\s\S]*?<\/think>/gi, " ").trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const sources = [fenced, repairJsonSyntax(trimmed), trimmed].filter(
    (source): source is string => Boolean(source),
  );
  for (const source of sources) {
    try {
      return JSON.parse(source);
    } catch {
      // Prefer a complete object/array inside surrounding prose next.
    }
  }
  const candidates = sources.flatMap(jsonCandidates);
  if (!candidates.length) throw new Error("模型没有返回 JSON");
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      try {
        return JSON.parse(repairJsonSyntax(candidate));
      } catch {
        // Try the next balanced JSON value before reporting a provider error.
      }
    }
  }
  throw new Error("模型返回了无法解析的 JSON");
}

function partText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(partText).filter(Boolean).join("\n");
  if (isJsonValue(value) && !Array.isArray(value) && typeof value.text === "string") {
    return value.text;
  }
  return "";
}

function completionJson(payload: {
  choices?: {
    finish_reason?: string;
    message?: { content?: unknown; reasoning_content?: unknown };
  }[];
}): unknown {
  const choice = payload.choices?.[0];
  const message = choice?.message ?? {};
  const content = message.content;
  if (
    isJsonValue(content) &&
    !Array.isArray(content) &&
    typeof content.text !== "string"
  ) {
    return content;
  }
  const text = [partText(content), partText(message.reasoning_content)]
    .filter((item) => item.trim())
    .join("\n");
  if (!text.trim()) throw new Error("模型返回为空");
  try {
    return extractJson(text);
  } catch (error) {
    if (choice?.finish_reason === "length") {
      throw new Error("模型输出被截断，请再试一次");
    }
    throw error;
  }
}

export async function completeJson<T>(
  system: string,
  user: string,
  // Callers pass "none" to disable hidden reasoning. DeepSeek Flash thinking
  // is on by default, so JSON completions always send thinking.disabled even
  // if a stale env still says medium/low.
  reasoningEffort = "none",
): Promise<T> {
  void reasoningEffort;
  if (!API_KEY) throw new Error("未配置 LLM_API_KEY");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await withRetry(() => completeJsonOnce<T>(system, user, controller.signal));
  } finally {
    clearTimeout(timer);
  }
}

function isRetryable(error: unknown, status?: number): boolean {
  if (status && status >= 500 && status !== 504) return true;
  const msg = error instanceof Error ? error.message : String(error);
  if (/超时|AbortError/i.test(msg)) return false;
  return /为空|没有返回 JSON|无法解析|截断|SSL|ECONNRESET|network/i.test(msg);
}

async function completeJsonOnce<T>(
  system: string,
  user: string,
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
        // Non-thinking default is 8K; keep a hard cap under the 45s budget.
        max_tokens: 8192,
        reasoning_effort: "none",
        thinking: { type: "disabled" },
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
    choices?: {
      finish_reason?: string;
      message?: { content?: unknown; reasoning_content?: unknown };
    }[];
  };
  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    throw new Error("模型网关返回了无法解析的内容");
  }
  return completionJson(payload) as T;
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
