import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, QrCode, FileText, FileType2, Sparkles, IdCard, ImageDown, DollarSign,
  Zap, Shield, Smartphone,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { SITE_NAME, SITE_DESCRIPTION, TOOLS } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${SITE_NAME} — Free online tools for QR codes, invoices and more` },
      { name: "description", content: SITE_DESCRIPTION },
      { property: "og:title", content: `${SITE_NAME} — Free online tools` },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Home,
});

const ICONS = {
  qr: QrCode, invoice: FileText, pdf: FileType2,
  upscale: Sparkles, passport: IdCard, compress: ImageDown, currency: DollarSign,
} as const;

function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1 relative overflow-hidden aurora-bg">
        {/* Animated colour blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="blob h-80 w-80 bg-[oklch(0.7_0.22_300)] -top-20 -left-10" />
          <span
            className="blob h-96 w-96 bg-[oklch(0.72_0.2_195)] top-40 -right-20"
            style={{ animationDelay: "-6s" }}
          />
          <span
            className="blob h-72 w-72 bg-[oklch(0.7_0.22_25)] bottom-0 left-1/3"
            style={{ animationDelay: "-12s" }}
          />
        </div>

        {/* ---------- HERO ---------- */}
        <section className="relative">
          <div className="container-page py-20 sm:py-28 text-center relative">
            <span className="glass-pill inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-foreground/80">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              5 free tools live · 2 more shipping
            </span>

            <h1 className="mt-6 text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground">
              Everyday tools.<br />
              <span className="bg-gradient-to-r from-[oklch(0.6_0.22_300)] via-[oklch(0.65_0.2_262)] to-[oklch(0.72_0.18_195)] bg-clip-text text-transparent">
                Zero friction.
              </span>
            </h1>

            <p className="mt-6 mx-auto max-w-2xl text-base sm:text-lg text-muted-foreground">
              {SITE_DESCRIPTION}
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/20">
                <Link to="/tools/qr-code-generator">
                  Try the QR generator <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full glass-pill border-foreground/10">
                <Link to="/tools/invoice-generator">Make an invoice</Link>
              </Button>
            </div>

            {/* floating glass mini cards */}
            <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
              {[
                { k: "5", v: "Live tools" },
                { k: "100%", v: "Free tier" },
                { k: "0", v: "Signups needed" },
                { k: "∞", v: "Daily usage" },
              ].map((s) => (
                <div key={s.v} className="glass-card rounded-2xl px-4 py-5">
                  <div className="text-2xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                    {s.k}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- TOOLS ---------- */}
        <section className="container-page py-16 sm:py-20 relative">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div className="min-w-0">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">All tools</h2>
              <p className="mt-2 text-muted-foreground">
                Tap any card to start. Most run fully in your browser.
              </p>
            </div>
            <div className="glass-pill rounded-full px-3 py-1.5 text-xs text-muted-foreground self-start sm:self-auto">
              {TOOLS.filter((t) => t.live).length} of {TOOLS.length} live
            </div>
          </div>

          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map((t) => {
              const Icon = ICONS[t.icon as keyof typeof ICONS];
              const Card = (
                <div
                  className={`group relative h-full glass-card rounded-3xl p-6 transition-all duration-300 ${
                    t.live
                      ? "hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/15"
                      : "opacity-60"
                  }`}
                >
                  {/* gradient ring on hover */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.65 0.22 300 / 0.35), oklch(0.7 0.2 195 / 0.35))",
                      WebkitMask:
                        "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                      WebkitMaskComposite: "xor",
                      maskComposite: "exclude",
                      padding: 1,
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary border border-foreground/10">
                      <Icon className="h-5 w-5" />
                    </span>
                    {t.live ? (
                      <span className="glass-pill rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-success">
                        Live
                      </span>
                    ) : (
                      <span className="glass-pill rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Soon
                      </span>
                    )}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-foreground">{t.name}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{t.blurb}</p>
                  {t.live && (
                    <div className="mt-5 text-sm font-medium text-primary inline-flex items-center gap-1">
                      Open tool
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  )}
                </div>
              );
              return t.live ? (
                <Link key={t.slug} to={`/tools/${t.slug}` as string} className="block">
                  {Card}
                </Link>
              ) : (
                <div key={t.slug}>{Card}</div>
              );
            })}
          </div>
        </section>

        {/* ---------- WHY ---------- */}
        <section className="container-page py-16 sm:py-20 relative">
          <div className="glass-card rounded-3xl p-8 sm:p-12">
            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  Icon: Zap,
                  h: "Built for speed",
                  b: "Tools run in your browser when possible — no upload waits, no privacy worries.",
                },
                {
                  Icon: Shield,
                  h: "Free forever tier",
                  b: "Most features are completely free with no signup. Pro unlocks higher limits.",
                },
                {
                  Icon: Smartphone,
                  h: "Made for everyone",
                  b: "Mobile, desktop, dark mode, keyboard-friendly. Accessible by default.",
                },
              ].map(({ Icon, h, b }) => (
                <div key={h} className="flex gap-4">
                  <span className="shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary border border-foreground/10">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground">{h}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{b}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
