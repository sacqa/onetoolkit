import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  ArrowRight, QrCode, FileText, FileType2, Sparkles, IdCard, ImageDown, DollarSign,
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OneToolKit — Free online tools for everyday work" },
      { name: "description", content: DEFAULT_BRANDING.description },
      { property: "og:title", content: "OneToolKit — Free online tools" },
      { property: "og:description", content: DEFAULT_BRANDING.description },
      { property: "og:url", content: "https://onetoolkit.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://onetoolkit.lovable.app/" }],
  }),
  component: Home,
});

const ICONS: Record<string, LucideIcon> = {
  QrCode, FileText, FileType2, Sparkles, IdCard, ImageDown, DollarSign,
  Zap, Shield, Smartphone, Star,
};

function Home() {
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
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero — TinyWow-style light, centered */}
        <section className="bg-[hsl(210_60%_98%)] dark:bg-surface border-b border-border/60">
          <div className="container-page py-16 sm:py-24 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              {hero.badge}
            </span>

            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground">
              {hero.title}
            </h1>
            <p className="mt-5 mx-auto max-w-2xl text-base sm:text-lg text-muted-foreground">
              {hero.subtitle}
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="rounded-full">
                <a href={hero.cta_primary_href}>
                  {hero.cta_primary_label}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <a href={hero.cta_secondary_href}>{hero.cta_secondary_label}</a>
              </Button>
            </div>

            {/* Search bar */}
            <div className="mt-10 mx-auto max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for a tool…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-12 pl-11 rounded-full bg-card border-border text-base"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Category tabs */}
        <section id="tools" className="container-page py-10">
          <div className="flex flex-wrap items-center gap-2 mb-8">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                  cat === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:border-primary/40"
                }`}
              >
                {c}
              </button>
            ))}
            <span className="ml-auto text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "tool" : "tools"}
            </span>
          </div>

          <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((t) => {
              const Icon = ICONS[t.icon] ?? Star;
              const inner = (
                <div className={`group relative h-full rounded-2xl border border-border bg-card p-5 transition-all ${
                  t.live ? "hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40" : "opacity-60"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    {!t.live && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Soon
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 text-sm sm:text-base font-semibold text-foreground leading-tight">
                    {t.name}
                  </h3>
                  <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">
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
              <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
                No tools match your search.
              </div>
            )}
          </div>
        </section>

        {/* Features */}
        <section className="container-page pb-16 sm:pb-24">
          <div className="rounded-3xl border border-border bg-surface p-8 sm:p-12">
            <div className="grid gap-8 md:grid-cols-3">
              {features.map((f) => {
                const Icon = ICONS[f.icon] ?? Star;
                return (
                  <div key={f.title} className="flex gap-4">
                    <span className="shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground">{f.title}</h3>
                      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
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
