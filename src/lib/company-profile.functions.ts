import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const InputSchema = z.object({
  companyName: z.string().min(1),
  industry: z.string().optional().default(""),
  overview: z.string().optional().default(""),
  mission: z.string().optional().default(""),
  vision: z.string().optional().default(""),
  values: z.string().optional().default(""),
  products: z.string().optional().default(""),
  history: z.string().optional().default(""),
  team: z.string().optional().default(""),
  achievements: z.string().optional().default(""),
  audience: z.string().optional().default(""),
  advantages: z.string().optional().default(""),
  contact: z.string().optional().default(""),
  socials: z.string().optional().default(""),
  website: z.string().optional().default(""),
  tone: z.string().optional().default("Corporate"),
  extra: z.string().optional().default(""),
  section: z.string().optional().default("all"),
});

async function callGateway(system: string, user: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limit exceeded — please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted for this workspace.");
    throw new Error(`AI gateway error (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = await res.json() as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    // Try extracting JSON from a code fence
    const m = content.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("AI returned invalid JSON");
  }
}

const SYSTEM_PROMPT = `You are a senior corporate copywriter and brand strategist. You write concise, confident, publication-quality company profile content. Never use marketing fluff, emojis, or filler like "In today's world". Return ONLY valid JSON matching the requested schema. Every string must be plain text (no markdown, no HTML).`;

function buildFullPrompt(data: z.infer<typeof InputSchema>) {
  return `Generate a complete corporate company profile as JSON with this exact shape:
{
  "tagline": "one short line (max 10 words) capturing what the company does",
  "overview": "2-3 paragraph company overview (150-220 words)",
  "mission": "one paragraph mission statement (40-70 words)",
  "vision": "one paragraph vision statement (30-60 words)",
  "values": [{"title":"...","description":"one sentence"}] (4-6 items),
  "products": [{"name":"...","description":"1-2 sentence description"}] (3-6 items),
  "history": [{"year":"YYYY","event":"one sentence milestone"}] (4-6 items in chronological order),
  "team": [{"name":"...","role":"...","bio":"1 sentence"}] (3-5 items — invent plausible names only if user gave none),
  "achievements": ["short bullet", ...] (4-6 items),
  "targetAudience": "one paragraph describing the ideal customer (40-70 words)",
  "advantages": ["short bullet", ...] (4-6 items describing competitive advantages),
  "closing": "one confident closing paragraph inviting collaboration (40-60 words)"
}

Tone: ${data.tone || "Corporate, confident, modern"}.

Input from the user:
- Company name: ${data.companyName}
- Industry: ${data.industry || "(not provided — infer)"}
- Business overview: ${data.overview || "(not provided — infer)"}
- Mission: ${data.mission || "(not provided — infer)"}
- Vision: ${data.vision || "(not provided — infer)"}
- Core values: ${data.values || "(not provided — infer)"}
- Products & services: ${data.products || "(not provided — infer)"}
- Company history: ${data.history || "(not provided — invent plausible timeline)"}
- Team: ${data.team || "(not provided — invent plausible leadership)"}
- Achievements: ${data.achievements || "(not provided — infer)"}
- Target audience: ${data.audience || "(not provided — infer)"}
- Competitive advantages: ${data.advantages || "(not provided — infer)"}
- Contact: ${data.contact || ""}
- Website: ${data.website || ""}
- Social links: ${data.socials || ""}
- Additional requirements: ${data.extra || "(none)"}

Return only the JSON object, nothing else.`;
}

function buildSectionPrompt(section: string, data: z.infer<typeof InputSchema>) {
  const shapes: Record<string, string> = {
    tagline: `{"tagline":"..."}`,
    overview: `{"overview":"2-3 paragraphs, 150-220 words"}`,
    mission: `{"mission":"one paragraph, 40-70 words"}`,
    vision: `{"vision":"one paragraph, 30-60 words"}`,
    values: `{"values":[{"title":"...","description":"one sentence"}] (4-6 items)}`,
    products: `{"products":[{"name":"...","description":"..."}] (3-6 items)}`,
    history: `{"history":[{"year":"YYYY","event":"..."}] (4-6 items chronological)}`,
    team: `{"team":[{"name":"...","role":"...","bio":"..."}] (3-5 items)}`,
    achievements: `{"achievements":["...", ...] (4-6 items)}`,
    targetAudience: `{"targetAudience":"one paragraph 40-70 words"}`,
    advantages: `{"advantages":["...", ...] (4-6 items)}`,
    closing: `{"closing":"one paragraph 40-60 words"}`,
  };
  const shape = shapes[section] ?? shapes.overview;
  return `Regenerate ONLY the "${section}" section for the company profile below. Return JSON matching: ${shape}

Company: ${data.companyName}
Industry: ${data.industry}
Overview context: ${data.overview}
Extra notes: ${data.extra}
Tone: ${data.tone}`;
}

export const generateCompanyProfile = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const prompt = data.section && data.section !== "all"
      ? buildSectionPrompt(data.section, data)
      : buildFullPrompt(data);
    const result = await callGateway(SYSTEM_PROMPT, prompt);
    return result;
  });
