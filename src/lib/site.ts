export const SITE_NAME = "ToolHub";
export const SITE_TAGLINE = "Free online tools for every workflow";
export const SITE_DESCRIPTION =
  "ToolHub is a free utility toolkit with a QR generator, invoice maker, PDF/Word converter, AI image upscaler, passport photo maker, image compressor and live currency converter. No signup required for most tools.";

export const TOOLS = [
  {
    slug: "qr-code-generator",
    name: "QR Code Generator",
    blurb: "Create custom QR codes for URLs, WiFi, vCards and more — with logo, color and style controls.",
    icon: "qr",
    live: true,
  },
  {
    slug: "invoice-generator",
    name: "Invoice Generator",
    blurb: "Build polished invoices with live preview, multiple templates and one-click PDF export.",
    icon: "invoice",
    live: true,
  },
  {
    slug: "pdf-word-converter",
    name: "PDF ↔ Word",
    blurb: "Convert between PDF and Word documents while keeping your formatting intact.",
    icon: "pdf",
    live: false,
  },
  {
    slug: "image-upscaler",
    name: "AI Image Upscaler",
    blurb: "Upscale photos 2× or 4× with AI — sharper detail, fewer artifacts.",
    icon: "upscale",
    live: false,
  },
  {
    slug: "passport-photo",
    name: "Passport Photo Maker",
    blurb: "Auto-crop and arrange passport-size photos for any country format.",
    icon: "passport",
    live: false,
  },
  {
    slug: "image-compressor",
    name: "Image Compressor",
    blurb: "Shrink JPG, PNG and WEBP images in your browser — nothing leaves your device.",
    icon: "compress",
    live: false,
  },
  {
    slug: "currency-converter",
    name: "Currency Converter",
    blurb: "Live exchange rates for 150+ currencies with 30-day trend charts.",
    icon: "currency",
    live: false,
  },
] as const;

export type ToolSlug = (typeof TOOLS)[number]["slug"];
