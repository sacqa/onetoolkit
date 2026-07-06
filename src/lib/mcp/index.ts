import { defineMcp } from "@lovable.dev/mcp-js";
import listToolsTool from "./tools/list-tools";
import qrCodeUrlTool from "./tools/qr-code-url";
import convertCurrencyTool from "./tools/convert-currency";

export default defineMcp({
  name: "onetoolkit-mcp",
  title: "One Tool Kit",
  version: "0.1.0",
  instructions:
    "Tools for One Tool Kit — a free web toolkit. Use `list_tools` to discover available tools, `generate_qr_code_url` to make QR code images, and `convert_currency` for live FX conversion.",
  tools: [listToolsTool, qrCodeUrlTool, convertCurrencyTool],
});
