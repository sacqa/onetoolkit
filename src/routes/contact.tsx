import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: `Contact — ${SITE_NAME}` },
      { name: "description", content: `Get in touch with the ${SITE_NAME} team.` },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: () => (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container-page py-16 prose prose-slate dark:prose-invert max-w-3xl">
        <h1>Contact</h1>
        <p>
          We'd love to hear from you. For support, feature requests, bug reports or partnership inquiries, email us at <a href="mailto:hello@toolhub.app">hello@toolhub.app</a>.
        </p>
        <p>We typically respond within one business day.</p>
      </main>
      <SiteFooter />
    </div>
  ),
});
