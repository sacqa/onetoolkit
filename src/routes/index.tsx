import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  ArrowRight, QrCode, FileText, FileType2, FileImage, Sparkles, IdCard, ImageDown, DollarSign,
  Zap, Shield, Smartphone, Search, Star, type LucideIcon,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CATEGORIES, DEFAULT_BRANDING, DEFAULT_FEATURES, DEFAULT_HERO, DEFAULT_TOOLS,
  loadSetting, type FeatureItem, type HeroContent, type SiteBranding, type ToolCard,
} from "@/lib/homepage-content";
import logoAsset from "@/assets/onetoolkit-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "One Tool Kit — Ten essential tools, one beautiful workspace" },
      { name: "description", content: DEFAULT_BRANDING.description },
      { property: "og:title", content: "One Tool Kit" },
      { property: "og:description", content: DEFAULT_BRANDING.description },
    ],
  }),
  component: Home,
});

const ICONS: Record<string, LucideIcon> = {
  QrCode, FileText, FileType2, FileImage, Sparkles, IdCard, ImageDown, DollarSign,
  Zap, Shield, Smartphone, Star,
};

// Vibrant gradient classes per category — pure presentation
const TOOL_GRADIENTS: Record<string, string> = {
  Image: "from-fuchsia-500 via-pink-500 to-rose-500",
  PDF: "from-emerald-500 via-teal-500 to-cyan-500",
  "AI Write": "from-orange-500 via-amber-500 to-yellow-400",
  Other: "from-violet-500 via-indigo-500 to-blue-500",
  Default: "from-sky-500 via-indigo-500 to-fuchsia-500",
};

function Home() {
  const { data: branding = DEFAULT_BRANDING } = useQuery({
    queryKey: ["cms", "site_branding"],
    queryFn: () => loadSetting<SiteBranding>("site_branding", DEFAULT_BRANDING),
  });
  const { data: hero = DEFAULT_HERO } = useQuery({
    queryKey: ["cms", "homepage_hero"],
    queryFn: () => loadSetting<HeroContent>("homepage_hero", DEFAULT_HERO),
  });
  const { data: tools = DEFAULT_TOOLS } = useQuery({
    queryKey: ["cms", "homepage_tools"],
    queryFn: () => loadSetting<ToolCard[]>("homepage_tools", DEFAULT_TOOLS),
  });
  const { data: features = DEFAULT_FEATURES } = useQuery({
    queryKey: ["cms", "homepage_features"],
    queryFn: () => loadSetting<FeatureItem[]>("homepage_features", DEFAULT_FEATURES),
  });

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("All");

  const sortedTools = useMemo(
    () => [...tools].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [tools],
  );
  const filtered = useMemo(() => {
    return sortedTools.filter((t) => {
      const matchCat = cat === "All" || t.category === cat;
      const q = query.trim().toLowerCase();
      const matchQ = !q || t.name.toLowerCase().includes(q) || t.blurb.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [sortedTools, cat, query]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden aurora-bg">
      {/* Floating color blobs for glass backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        <span className="blob h-[520px] w-[520px] -top-32 -left-24 bg-fuchsia-400/60" />
        <span className="blob h-[420px] w-[420px] top-40 right-[-120px] bg-cyan-400/60 [animation-delay:-6s]" />
        <span className="blob h-[460px] w-[460px] top-[60%] left-[30%] bg-violet-500/55 [animation-delay:-12s]" />
      </div>

      <SiteHeader />

      <main className="relative z-10 flex-1">
        {/* HERO */}
        <section className="container-page pt-14 sm:pt-20 pb-12 text-center">
          <div className="mx-auto mb-7 inline-flex items-center justify-center">
            <img
              src={logoAsset.url}
              alt={branding.site_name}
              className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl shadow-[0_25px_80px_-20px_rgba(120,80,255,0.55)]"
            />
          </div>

          <span className="glass-pill inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-foreground/80">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {hero.badge}
          </span>

          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
              {hero.title}
            </span>
          </h1>
          <p className="mt-5 mx-auto max-w-2xl text-base sm:text-lg text-foreground/70">
            {hero.subtitle}
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-lg hover:opacity-95 border-0">
              <a href={hero.cta_primary_href}>
                {hero.cta_primary_label}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full glass-pill text-foreground border-0">
              <a href={hero.cta_secondary_href}>{hero.cta_secondary_label}</a>
            </Button>
          </div>

          {/* Glass search */}
          <div className="mt-10 mx-auto max-w-xl">
            <div className="relative glass-card rounded-full p-1.5">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/60" />
              <Input
                placeholder="Search 10+ tools…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 pl-12 rounded-full bg-transparent border-0 focus-visible:ring-0 text-base placeholder:text-foreground/50"
              />
            </div>
          </div>
        </section>

        {/* CATEGORY TABS */}
        <section id="tools" className="container-page pb-4">
          <div className="flex flex-wrap items-center gap-2 mb-8">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  cat === c
                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-md"
                    : "glass-pill text-foreground/80 hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
            <span className="ml-auto text-xs text-foreground/60">
              {filtered.length} {filtered.length === 1 ? "tool" : "tools"}
            </span>
          </div>

          {/* TOOL GRID */}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((t) => {
              const Icon = ICONS[t.icon] ?? Star;
              const grad = TOOL_GRADIENTS[t.category] ?? TOOL_GRADIENTS.Default;
              const inner = (
                <div className={`group relative h-full glass-card rounded-2xl p-5 overflow-hidden transition-all ${
                  t.live ? "hover:-translate-y-1 hover:shadow-2xl" : "opacity-60"
                }`}>
                  <div aria-hidden className={`pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${grad} opacity-30 blur-2xl group-hover:opacity-60 transition-opacity`} />
                  <div className="relative flex items-center justify-between">
                    <span className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${grad} text-white shadow-md`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    {!t.live && (
                      <span className="glass-pill rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/70">
                        Soon
                      </span>
                    )}
                  </div>
                  <h3 className="relative mt-4 text-sm sm:text-base font-semibold leading-tight">
                    {t.name}
                  </h3>
                  <p className="relative mt-1.5 text-xs sm:text-sm text-foreground/65 leading-relaxed line-clamp-2">
                    {t.blurb}
                  </p>
                </div>
              );
              return t.live ? (
                <Link key={t.slug} to={t.href} className="block h-full">{inner}</Link>
              ) : (
                <div key={t.slug} className="h-full">{inner}</div>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12 text-foreground/60 text-sm">
                No tools match your search.
              </div>
            )}
          </div>
        </section>

        {/* FEATURES */}
        <section className="container-page py-16 sm:py-24">
          <div className="glass-card rounded-3xl p-8 sm:p-12">
            <div className="grid gap-8 md:grid-cols-3">
              {features.map((f) => {
                const Icon = ICONS[f.icon] ?? Star;
                return (
                  <div key={f.title} className="flex gap-4">
                    <span className="shrink-0 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground">{f.title}</h3>
                      <p className="mt-1.5 text-sm text-foreground/65 leading-relaxed">{f.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
