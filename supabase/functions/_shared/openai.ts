// Shared OpenAI client for Edge Functions (Deno runtime).
// Set OPENAI_API_KEY via `supabase secrets set`. Used for idea generation;
// writing tasks go through Claude (see _shared/claude.ts).

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o";

export interface OpenAiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function askOpenAiJson<T>(
  messages: OpenAiMessage[],
  options: { model?: string; temperature?: number } = {},
): Promise<T> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model ?? DEFAULT_MODEL,
      temperature: options.temperature ?? 0.8,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content) as T;
}
