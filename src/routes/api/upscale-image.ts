import { createFileRoute } from "@tanstack/react-router";

// AI image upscaler proxy — uses Lovable AI Gateway (Gemini image edit model)
// to enhance / upscale a user-provided image. Returns { image: base64 }.

export const Route = createFileRoute("/api/upscale-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });

        let body: { image?: string; scale?: number; prompt?: string };
        try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

        const { image, scale = 2, prompt } = body;
        if (!image || !image.startsWith("data:image/")) return json({ error: "Missing or invalid image" }, 400);

        const instruction =
          prompt?.trim() ||
          `Upscale this image ${scale}×, sharpen details, denoise, and enhance clarity while preserving the original composition, colors, and subject. Do not add new content or change the framing.`;

        try {
          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3.1-flash-image",
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: instruction },
                    { type: "image_url", image_url: { url: image } },
                  ],
                },
              ],
              modalities: ["image", "text"],
            }),
          });

          if (!upstream.ok) {
            const t = await upstream.text();
            return json({ error: `Upstream ${upstream.status}: ${t.slice(0, 300)}` }, upstream.status);
          }
          const data = await upstream.json();
          // Gemini returns image in choices[0].message.images[0].image_url.url
          const outUrl: string | undefined =
            data?.choices?.[0]?.message?.images?.[0]?.image_url?.url ??
            data?.choices?.[0]?.message?.image_url?.url;

          if (!outUrl) return json({ error: "No image returned from model" }, 502);
          return json({ image: outUrl });
        } catch (e) {
          return json({ error: (e as Error).message || "Upscale failed" }, 500);
        }
      },
    },
  },
});

function json(v: unknown, status = 200) {
  return new Response(JSON.stringify(v), { status, headers: { "Content-Type": "application/json" } });
}
