import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: `Cookie Policy — ${SITE_NAME}` },
      { name: "description", content: `How ${SITE_NAME} uses cookies and similar technologies.` },
      { property: "og:url", content: "/cookies" },
    ],
    links: [{ rel: "canonical", href: "/cookies" }],
  }),
  component: () => (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container-page py-16 prose prose-slate dark:prose-invert max-w-3xl">
        <h1>Cookie Policy</h1>
        <p>We use essential cookies to keep you signed in, and analytics cookies (only after consent) to understand how the site is used. You can opt out at any time.</p>
      </main>
      <SiteFooter />
    </div>
  ),
});
