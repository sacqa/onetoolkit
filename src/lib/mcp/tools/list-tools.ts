import { defineTool } from "@lovable.dev/mcp-js";
import { DEFAULT_TOOLS } from "@/lib/homepage-content";

export default defineTool({
  name: "list_tools",
  title: "List available tools",
  description: "List all tools available on One Tool Kit, with their slug, name, category, blurb, and public URL.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const items = DEFAULT_TOOLS.filter((t) => t.live).map((t) => ({
      slug: t.slug,
      name: t.name,
      category: t.category,
      blurb: t.blurb,
      url: `https://onetoolkit.lovable.app${t.href}`,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
      structuredContent: { tools: items },
    };
  },
});
