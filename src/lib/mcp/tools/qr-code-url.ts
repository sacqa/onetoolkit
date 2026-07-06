import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "generate_qr_code_url",
  title: "Generate QR code image URL",
  description:
    "Generate a public PNG image URL for a QR code encoding the given text or URL. Returns a link that can be embedded or downloaded.",
  inputSchema: {
    data: z.string().min(1).describe("Text or URL to encode in the QR code."),
    size: z.number().int().min(64).max(1024).optional().describe("Square size in pixels (default 512)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: ({ data, size }) => {
    const s = size ?? 512;
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${s}x${s}&data=${encodeURIComponent(data)}`;
    return {
      content: [{ type: "text", text: url }],
      structuredContent: { url, size: s },
    };
  },
});
