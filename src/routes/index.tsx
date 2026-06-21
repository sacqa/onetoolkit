import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, QrCode, FileText, FileType2, Sparkles, IdCard, ImageDown, DollarSign } from "lucide-react";
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

      <main className="flex-1">
        {/* Hero */}
        <section className="hero-gradient">
          <div className="container-page py-20 sm:py-28 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> 5 free tools live, more coming
            </span>
            <h1 className="mt-6 text-4xl sm:text-6xl font-bold tracking-tight text-foreground">
              Everyday tools.<br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Zero friction.
              </span>
            </h1>
            <p className="mt-6 mx-auto max-w-2xl text-lg text-muted-foreground">
              {SITE_DESCRIPTION}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/tools/qr-code-generator">
                  Try the QR generator <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/tools/invoice-generator">Make an invoice</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Tools grid */}
        <section className="container-page py-20">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">All tools</h2>
              <p className="mt-2 text-muted-foreground">Click any tool to start. No account needed for basic use.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map((t) => {
              const Icon = ICONS[t.icon as keyof typeof ICONS];
              const Card = (
                <div className={`group h-full rounded-2xl border border-border bg-card p-6 transition-all ${t.live ? "hover:border-primary/40 hover:shadow-[var(--shadow-soft)]" : "opacity-70"}`}>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    {t.live ? (
                      <span className="text-xs font-medium text-success">Live</span>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground">Soon</span>
                    )}
                  </div>
                  <h3 className="mt-4 font-semibold text-foreground">{t.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.blurb}</p>
                  {t.live && (
                    <div className="mt-4 text-sm font-medium text-primary inline-flex items-center gap-1">
                      Open tool <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  )}
                </div>
              );
              return t.live ? (
                <Link key={t.slug} to={`/tools/${t.slug}` as string}>{Card}</Link>
              ) : (
                <div key={t.slug}>{Card}</div>
              );
            })}
          </div>
        </section>

        {/* Why */}
        <section className="bg-surface border-y border-border/60">
          <div className="container-page py-20 grid gap-10 md:grid-cols-3">
            {[
              ["Built for speed", "Tools run in your browser when possible — no upload waits, no privacy worries."],
              ["Free forever tier", "Most features are completely free with no signup. Pro plan unlocks higher limits."],
              ["Made for everyone", "Mobile, desktop, dark mode, keyboard-friendly. Accessible by default."],
            ].map(([h, b]) => (
              <div key={h}>
                <h3 className="font-semibold text-foreground">{h}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
