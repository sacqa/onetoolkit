import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "convert_currency",
  title: "Convert currency",
  description: "Convert an amount between two currencies using live exchange rates (ISO 4217 codes, e.g. USD, EUR, INR).",
  inputSchema: {
    amount: z.number().describe("Amount to convert."),
    from: z.string().length(3).describe("Source currency code, e.g. USD."),
    to: z.string().length(3).describe("Target currency code, e.g. EUR."),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
  handler: async ({ amount, from, to }) => {
    const src = from.toUpperCase();
    const dst = to.toUpperCase();
    const res = await fetch(`https://open.er-api.com/v6/latest/${src}`);
    if (!res.ok) {
      return { content: [{ type: "text", text: `Failed to fetch rates (${res.status})` }], isError: true };
    }
    const json = (await res.json()) as { rates?: Record<string, number>; result?: string };
    const rate = json.rates?.[dst];
    if (!rate) {
      return { content: [{ type: "text", text: `No rate found for ${src} -> ${dst}` }], isError: true };
    }
    const converted = amount * rate;
    return {
      content: [{ type: "text", text: `${amount} ${src} = ${converted.toFixed(4)} ${dst} (rate ${rate})` }],
      structuredContent: { amount, from: src, to: dst, rate, converted },
    };
  },
});
