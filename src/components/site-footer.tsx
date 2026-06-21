import { Link } from "@tanstack/react-router";
import { SITE_NAME } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-surface">
      <div className="container-page py-12 grid gap-8 md:grid-cols-4 text-sm">
        <div>
          <div className="font-semibold text-foreground">{SITE_NAME}</div>
          <p className="mt-2 text-muted-foreground">
            Free, fast, no-fluff tools for everyday work. Built for the modern web.
          </p>
        </div>
        <FooterCol title="Tools" links={[
          ["/tools/qr-code-generator", "QR Code"],
          ["/tools/invoice-generator", "Invoice Generator"],
        ]} />
        <FooterCol title="Company" links={[
          ["/about", "About"],
          ["/contact", "Contact"],
        ]} />
        <FooterCol title="Legal" links={[
          ["/privacy", "Privacy"],
          ["/terms", "Terms"],
          ["/cookies", "Cookies"],
        ]} />
      </div>
      <div className="border-t border-border/60">
        <div className="container-page py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="font-semibold text-foreground">{title}</div>
      <ul className="mt-2 space-y-1.5">
        {links.map(([to, label]) => (
          <li key={to}>
            <Link to={to} className="text-muted-foreground hover:text-foreground">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
