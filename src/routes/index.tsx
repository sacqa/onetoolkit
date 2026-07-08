import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  ArrowRight, QrCode, FileText, FileType2, FileImage, FileMinus, IdCard, ImageDown, DollarSign,
  Zap, Shield, Smartphone, Search, Star, Sparkles, type LucideIcon,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import {
  CATEGORIES, DEFAULT_BRANDING, DEFAULT_FEATURES, DEFAULT_HERO, DEFAULT_TOOLS,
  loadSetting, type FeatureItem, type HeroContent, type SiteBranding, type ToolCard,
} from "@/lib/homepage-content";

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
  QrCode, FileText, FileType2, FileImage, FileMinus, IdCard, ImageDown, DollarSign,
  Zap, Shield, Smartphone, Star, Sparkles,
};

// Per-category accent — used for the icon tile and hover border tint
const ACCENTS: Record<string, { bg: string; text: string; hoverBorder: string; hoverBg: string }> = {
  Image:     { bg: "bg-rose-50",    text: "text-rose-600",    hoverBorder: "hover:border-rose-100",    hoverBg: "group-hover:bg-rose-100" },
  PDF:       { bg: "bg-emerald-50", text: "text-emerald-600", hoverBorder: "hover:border-emerald-100", hoverBg: "group-hover:bg-emerald-100" },
  "AI Write":{ bg: "bg-orange-50",  text: "text-orange-600",  hoverBorder: "hover:border-orange-100",  hoverBg: "group-hover:bg-orange-100" },
  Other:     { bg: "bg-blue-50",    text: "text-blue-600",    hoverBorder: "hover:border-blue-100",    hoverBg: "group-hover:bg-blue-100" },
  Default:   { bg: "bg-indigo-50",  text: "text-indigo-600",  hoverBorder: "hover:border-indigo-100",  hoverBg: "group-hover:bg-indigo-100" },
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

  const liveCount = tools.filter((t) => t.live).length;

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <SiteHeader />

      <main className="flex-1">
        <div className="container-page py-10 md:py-16 space-y-16">
          {/* HERO — split bento */}
          <section className="flex flex-col md:flex-row gap-10 md:gap-12 items-center">
            <div className="flex-1 space-y-6 w-full">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">
                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                {hero.badge}
              </span>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900">
                {hero.title.split(" ").map((word, i, arr) =>
                  i === Math.floor(arr.length / 2) ? (
                    <span key={i} className="text-indigo-600">{word} </span>
                  ) : (
                    <span key={i}>{word} </span>
                  ),
                )}
              </h1>
              <p className="text-lg text-slate-600 max-w-md leading-relaxed">
                {hero.subtitle}
              </p>

              <div className="relative max-w-lg">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${liveCount}+ tools (e.g. compress image)`}
                  className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl shadow-sm focus:border-indigo-500 focus:ring-0 transition-all outline-none text-slate-900"
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild size="lg" className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
                  <a href={hero.cta_primary_href}>
                    {hero.cta_primary_label}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-xl border-slate-300">
                  <a href={hero.cta_secondary_href}>{hero.cta_secondary_label}</a>
                </Button>
              </div>
            </div>

            {/* Bento stat blocks */}
            <div className="flex-1 grid grid-cols-2 gap-4 w-full max-w-md md:max-w-none">
              <div className="bg-indigo-600 h-48 rounded-[2rem] p-6 text-white flex flex-col justify-end shadow-lg shadow-indigo-200/60 transform hover:-translate-y-1 transition-transform">
                <div className="text-4xl font-bold">{liveCount}+</div>
                <div className="text-indigo-100 text-sm mt-1">Utility Tools</div>
              </div>
              <div className="bg-amber-400 h-48 rounded-[2rem] p-6 text-amber-950 flex flex-col justify-end shadow-lg shadow-amber-200/60 transform translate-y-8 hover:translate-y-7 transition-transform">
                <div className="text-4xl font-bold">100%</div>
                <div className="text-amber-900 text-sm mt-1">Private & Free</div>
              </div>
            </div>
          </section>

          {/* CATEGORY TABS */}
          <section id="tools" className="space-y-8">
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-200">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`px-6 py-2 rounded-xl font-medium transition-colors ${
                    cat === c
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {c === "All" ? "All Tools" : c}
                </button>
              ))}
              <span className="ml-auto text-xs text-slate-500">
                {filtered.length} {filtered.length === 1 ? "tool" : "tools"}
              </span>
            </div>

            {/* TOOL GRID — bento cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((t, idx) => {
                const Icon = ICONS[t.icon] ?? Star;
                const accent = ACCENTS[t.category] ?? ACCENTS.Default;
                const featured = idx === 0 && cat === "All" && !query;

                const inner = featured ? (
                  <div className={`group relative bg-white border-2 border-slate-100 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl ${accent.hoverBorder} transition-all cursor-pointer overflow-hidden h-full`}>
                    <div className={`absolute top-0 right-0 w-24 h-24 ${accent.bg} rounded-bl-[4rem] flex items-center justify-center transition-colors ${accent.hoverBg}`}>
                      <Icon className={`w-8 h-8 ${accent.text}`} />
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-slate-900">{t.name}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4">{t.blurb}</p>
                    <span className={`${accent.text} font-bold text-sm inline-flex items-center gap-1 group-hover:gap-2 transition-all`}>
                      Use tool <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                ) : (
                  <div className={`group bg-white border-2 border-slate-100 p-8 rounded-[2.5rem] shadow-sm ${t.live ? `hover:shadow-xl ${accent.hoverBorder}` : "opacity-60"} transition-all cursor-pointer h-full`}>
                    <div className={`w-14 h-14 ${accent.bg} rounded-2xl flex items-center justify-center mb-6 ${accent.hoverBg} transition-colors`}>
                      <Icon className={`w-6 h-6 ${accent.text}`} />
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-slate-900 flex items-center gap-2">
                      {t.name}
                      {!t.live && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          Soon
                        </span>
                      )}
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{t.blurb}</p>
                  </div>
                );

                return t.live ? (
                  <Link key={t.slug} to={t.href} className="block h-full">{inner}</Link>
                ) : (
                  <div key={t.slug} className="h-full">{inner}</div>
                );
              })}
              {filtered.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-500 text-sm">
                  No tools match your search.
                </div>
              )}
            </div>
          </section>

          {/* FEATURES STRIP */}
          <section className="bg-indigo-50/50 rounded-[3rem] p-8 sm:p-10 flex flex-wrap justify-center gap-8 sm:gap-12 border border-indigo-100">
            {features.map((f) => {
              const Icon = ICONS[f.icon] ?? Star;
              return (
                <div key={f.title} className="flex items-center gap-4 max-w-xs">
                  <div className="shrink-0 w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-indigo-900">{f.title}</div>
                    <div className="text-xs text-indigo-900/70 leading-snug">{f.body}</div>
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
