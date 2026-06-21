import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: `About — ${SITE_NAME}` },
      { name: "description", content: `${SITE_NAME} is a free toolkit of fast, privacy-respecting web utilities for everyday work.` },
      { property: "og:title", content: `About ${SITE_NAME}` },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: () => (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container-page py-16 prose prose-slate dark:prose-invert max-w-3xl">
        <h1>About {SITE_NAME}</h1>
        <p>
          {SITE_NAME} is a collection of fast, focused web utilities — the kind of tools you reach for once a week but never want to install. Every tool is free to use, designed for both mobile and desktop, and built to respect your data: wherever possible, processing happens in your browser instead of on our servers.
        </p>
        <h2>Our principles</h2>
        <ul>
          <li><strong>Speed first.</strong> No bloated bundles, no ad-loaded landing pages between you and the tool.</li>
          <li><strong>Privacy by default.</strong> Files you upload are never kept longer than needed.</li>
          <li><strong>Free forever for the basics.</strong> A Pro tier lifts limits for power users; the free plan stays generous.</li>
        </ul>
        <p>
          Have feedback or a tool you'd like to see added? Reach out on the <a href="/contact">contact page</a>.
        </p>
      </main>
      <SiteFooter />
    </div>
  ),
});
