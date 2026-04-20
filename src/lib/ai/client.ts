import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export function hasLiveAI(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// Calls Claude and returns parsed JSON. Extracts the first {...} block
// in case the model wraps output in prose or code fences.
export async function completeJSON<T>(
  prompt: string,
  maxTokens = 1500
): Promise<T> {
  const c = getClient();
  if (!c) throw new Error("ANTHROPIC_API_KEY not set");

  const resp = await c.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  const text = resp.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const jsonText = extractJSON(text);
  return JSON.parse(jsonText) as T;
}

function extractJSON(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}
