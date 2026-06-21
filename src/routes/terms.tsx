import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: `Terms of Service — ${SITE_NAME}` },
      { name: "description", content: `Terms governing your use of ${SITE_NAME}.` },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: () => (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container-page py-16 prose prose-slate dark:prose-invert max-w-3xl">
        <h1>Terms of Service</h1>
        <p><em>Last updated: {new Date().toLocaleDateString()}</em></p>
        <p>Starter copy — replace with finalized terms before launch.</p>
        <h2>Use of service</h2>
        <p>You agree to use {SITE_NAME} only for lawful purposes. You must not abuse the service, attempt to break security, or generate harmful or infringing content.</p>
        <h2>Free and paid plans</h2>
        <p>Free tier limits may change. Paid plans are billed in advance and non-refundable except where required by law.</p>
        <h2>No warranty</h2>
        <p>The service is provided "as is" without warranties of any kind.</p>
      </main>
      <SiteFooter />
    </div>
  ),
});
