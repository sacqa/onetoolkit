import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: `Privacy Policy — ${SITE_NAME}` },
      { name: "description", content: `How ${SITE_NAME} collects, uses and protects your data.` },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: () => (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container-page py-16 prose prose-slate dark:prose-invert max-w-3xl">
        <h1>Privacy Policy</h1>
        <p><em>Last updated: {new Date().toLocaleDateString()}</em></p>
        <p>This is starter copy. Replace before launch with text reviewed by counsel.</p>
        <h2>What we collect</h2>
        <p>Account email, optional profile information, and aggregate usage events (which tool was used, when). Files you upload for conversion or upscaling are processed and deleted within 1 hour.</p>
        <h2>How we use it</h2>
        <p>To operate the service, prevent abuse, and improve the tools. We do not sell personal data.</p>
        <h2>Third parties</h2>
        <p>We use Google Analytics, Google AdSense, and third-party APIs (e.g. image upscaling) where required. See their respective policies.</p>
        <h2>Your rights</h2>
        <p>You can delete your account from the dashboard at any time. Contact us for any data request.</p>
      </main>
      <SiteFooter />
    </div>
  ),
});
