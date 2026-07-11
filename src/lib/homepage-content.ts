import { supabase } from "@/integrations/supabase/client";

export type HeroContent = {
  badge: string;
  title: string;
  subtitle: string;
  cta_primary_label: string;
  cta_primary_href: string;
  cta_secondary_label: string;
  cta_secondary_href: string;
};

export type ToolCard = {
  slug: string;
  name: string;
  blurb: string;
  category: string;
  href: string;
  icon: string; // lucide icon name
  live: boolean;
  order: number;
};

export type FeatureItem = {
  icon: string;
  title: string;
  body: string;
};

export type SiteBranding = {
  site_name: string;
  tagline: string;
  description: string;
  footer_text: string;
};

export type Integrations = {
  ga_measurement_id: string; // e.g. G-XXXXXXX
  gsc_verification: string;  // e.g. google-site-verification token content
  adsense_publisher_id: string;
};

export const DEFAULT_HERO: HeroContent = {
  badge: "100% Free · No signup",
  title: "Free tools to make your life easier",
  subtitle:
    "QR codes, invoices, image compression, currency conversion and more — all in one place, all in your browser.",
  cta_primary_label: "Browse all tools",
  cta_primary_href: "#tools",
  cta_secondary_label: "Make an invoice",
  cta_secondary_href: "/tools/invoice-generator",
};

export const DEFAULT_TOOLS: ToolCard[] = [
  { slug: "qr-code-generator", name: "QR Code Generator", blurb: "Create custom QR codes with logo, color and style controls.", category: "Image", href: "/tools/qr-code-generator", icon: "QrCode", live: true, order: 1 },
  { slug: "invoice-generator", name: "Invoice Generator", blurb: "Polished invoices with live preview and one-click PDF export.", category: "PDF", href: "/tools/invoice-generator", icon: "FileText", live: true, order: 2 },
  { slug: "image-compressor", name: "Image Compressor", blurb: "Shrink JPG, PNG and WEBP images in your browser.", category: "Image", href: "/tools/image-compressor", icon: "ImageDown", live: true, order: 3 },
  { slug: "passport-photo", name: "Passport Photo Maker", blurb: "Crop and arrange passport-size photos for 10+ countries.", category: "Image", href: "/tools/passport-photo", icon: "IdCard", live: true, order: 4 },
  { slug: "currency-converter", name: "Currency Converter", blurb: "Live exchange rates for 150+ currencies.", category: "Other", href: "/tools/currency-converter", icon: "DollarSign", live: true, order: 5 },
  { slug: "pdf-to-jpg", name: "PDF to JPG", blurb: "Convert each page of a PDF to a high-quality JPG image.", category: "PDF", href: "/tools/pdf-to-jpg", icon: "FileImage", live: true, order: 6 },
  { slug: "compress-pdf", name: "Compress PDF", blurb: "Shrink PDF file size while keeping pages readable.", category: "PDF", href: "/tools/compress-pdf", icon: "FileMinus", live: true, order: 7 },
  { slug: "word-to-pdf", name: "Word to PDF", blurb: "Convert DOCX documents to a clean PDF in your browser.", category: "PDF", href: "/tools/word-to-pdf", icon: "FileType2", live: true, order: 8 },
  { slug: "company-profile-generator", name: "AI Company Profile", blurb: "Generate a polished company profile with AI and export a designer PDF.", category: "AI Write", href: "/tools/company-profile-generator", icon: "Building2", live: true, order: 9 },
];

export const DEFAULT_FEATURES: FeatureItem[] = [
  { icon: "Zap", title: "Built for speed", body: "Tools run in your browser when possible — no upload waits, no privacy worries." },
  { icon: "Shield", title: "Free forever tier", body: "Most features are completely free with no signup. Pro unlocks higher limits." },
  { icon: "Smartphone", title: "Made for everyone", body: "Mobile, desktop, dark mode, keyboard-friendly. Accessible by default." },
];

export const DEFAULT_BRANDING: SiteBranding = {
  site_name: "One Tool Kit",
  tagline: "Ten essential tools, one beautiful workspace",
  description:
    "One Tool Kit is a free toolkit with a QR generator, invoice maker, image compressor, passport photo maker, AI upscaler and live currency converter.",
  footer_text: "Ten essential tools, one beautiful workspace.",
};

export const DEFAULT_INTEGRATIONS: Integrations = {
  ga_measurement_id: "",
  gsc_verification: "",
  adsense_publisher_id: "",
};

export const CATEGORIES = ["All", "PDF", "Image", "AI Write", "Other"] as const;

export async function loadSetting<T>(key: string, fallback: T): Promise<T> {
  const { data } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as T) ?? fallback;
}

export async function saveSetting(key: string, value: unknown) {
  return supabase.from("app_settings").upsert(
    { key, value: value as never, updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
}
