// Shared Claude API client for Edge Functions (Deno runtime).
// Set ANTHROPIC_API_KEY via `supabase secrets set`.

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = Deno.env.get("CLAUDE_MODEL") ?? "claude-sonnet-5";

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeOptions {
  system?: string;
  maxTokens?: number;
  model?: string;
}

async function callClaude(
  messages: ClaudeMessage[],
  options: ClaudeOptions = {},
): Promise<{ text: string; stopReason: string }> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    // No temperature: current Claude models reject it as deprecated.
    body: JSON.stringify({
      model: options.model ?? DEFAULT_MODEL,
      max_tokens: options.maxTokens ?? 4096,
      system: options.system,
      messages,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = data.content
    .filter((block: { type: string }) => block.type === "text")
    .map((block: { text: string }) => block.text)
    .join("\n");
  return { text, stopReason: data.stop_reason ?? "end_turn" };
}

export async function askClaude(
  messages: ClaudeMessage[],
  options: ClaudeOptions = {},
): Promise<string> {
  return (await callClaude(messages, options)).text;
}

/**
 * Parse model output as JSON, tolerating the common failure shapes: fenced
 * code blocks, prose around the object, and trailing commas.
 */
function parseModelJson<T>(raw: string): T {
  const stripped = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(stripped) as T;
  } catch {
    /* fall through to repairs */
  }
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const inner = stripped.slice(start, end + 1);
    try {
      return JSON.parse(inner) as T;
    } catch {
      /* one more repair */
    }
    return JSON.parse(inner.replace(/,\s*([}\]])/g, "$1")) as T;
  }
  throw new SyntaxError("model output contained no JSON object");
}

const JSON_RULES =
  "\n\nJSON OUTPUT RULES: emit one strict, valid JSON object and nothing else — " +
  "double-quoted property names, no trailing commas, no code fences, no prose; " +
  "never use unescaped double quotes inside string values (use single quotes for " +
  "quoted phrases); keep string values tight so the response never gets cut off.";

/**
 * Ask Claude for strict JSON. Two distinct failure modes are handled:
 *   1. Truncation (stop_reason max_tokens): the JSON is cut mid-structure —
 *      retry once with double the budget and a be-more-concise instruction.
 *   2. Malformed output (usually an unescaped quote): show the model its own
 *      broken output and make it re-emit valid JSON once.
 */
export async function askClaudeJson<T>(
  messages: ClaudeMessage[],
  options: ClaudeOptions = {},
): Promise<T> {
  const opts = { ...options, system: (options.system ?? "") + JSON_RULES };
  const first = await callClaude(messages, opts);
  try {
    return parseModelJson<T>(first.text);
  } catch {
    /* fall through to the recovery paths */
  }

  if (first.stopReason === "max_tokens") {
    // The response was cut off — a re-emit at the same budget would be cut
    // off again. Double the budget (capped) and demand a tighter response.
    const retry = await callClaude(
      [
        ...messages,
        {
          role: "user",
          content:
            "IMPORTANT: your previous attempt was CUT OFF because it was too long. " +
            "Emit the COMPLETE JSON response again, tighter: shorter string values, " +
            "no repetition — completeness beats verbosity.",
        },
      ],
      { ...opts, maxTokens: Math.min((options.maxTokens ?? 4096) * 2, 16000) },
    );
    return parseModelJson<T>(retry.text);
  }

  const retry = await callClaude(
    [
      ...messages,
      { role: "assistant", content: first.text.slice(0, 8000) },
      {
        role: "user",
        content:
          "That output was INVALID JSON (it failed to parse). Re-emit the COMPLETE response as strict, valid JSON only: " +
          "double-quoted property names, no trailing commas, no code fences, no prose, and never use unescaped double quotes " +
          "inside string values (use single quotes for quoted phrases instead).",
      },
    ],
    opts,
  );
  return parseModelJson<T>(retry.text);
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}
