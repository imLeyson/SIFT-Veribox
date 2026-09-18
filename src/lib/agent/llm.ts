const BASE_URL = (process.env.LLM_BASE_URL ?? "https://ai.tkapi.site/v1").replace(
  /\/$/,
  ""
);
const API_KEY = process.env.LLM_API_KEY ?? "";
const MODEL = process.env.LLM_MODEL ?? "grok-4.6";
const REASONING = process.env.LLM_REASONING_EFFORT ?? "medium";

export function llmConfigured() {
  return Boolean(API_KEY);
}

export function llmModelName() {
  return MODEL;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("模型没有返回 JSON");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

export async function completeJson<T>(
  system: string,
  user: string,
  reasoningEffort = REASONING
): Promise<T> {
  if (!API_KEY) throw new Error("未配置 LLM_API_KEY");

  return withRetry(() => completeJsonOnce<T>(system, user, reasoningEffort));
}

async function completeJsonOnce<T>(
  system: string,
  user: string,
  reasoningEffort: string
): Promise<T> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.4,
      max_tokens: 4096,
      reasoning_effort: reasoningEffort,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`模型请求失败（${res.status}）`);
  }
  if (!raw.trim()) {
    throw new Error("模型网关返回为空，请再试一次");
  }

  let payload: {
    choices?: { message?: { content?: string | null } }[];
  };
  try {
    payload = JSON.parse(raw) as {
      choices?: { message?: { content?: string | null } }[];
    };
  } catch {
    throw new Error("模型网关返回了不完整的内容，请再试一次");
  }
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("模型返回为空");
  return extractJson(content) as T;
}

async function withRetry<T>(fn: () => Promise<T>, times = 2): Promise<T> {
  let last: unknown;
  for (let i = 0; i < times; i += 1) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const msg = e instanceof Error ? e.message : "";
      const retryable = /为空|不完整|失败（|超时|SSL|fetch/i.test(msg);
      if (!retryable || i === times - 1) throw e;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw last instanceof Error ? last : new Error("模型请求失败");
}
