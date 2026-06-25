import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DEFAULT_BRANDING, loadSetting, type SiteBranding } from "@/lib/homepage-content";

export function SiteFooter() {
  const { data: branding = DEFAULT_BRANDING } = useQuery({
    queryKey: ["cms", "site_branding"],
    queryFn: () => loadSetting<SiteBranding>("site_branding", DEFAULT_BRANDING),
  });

  return (
    <footer className="border-t border-border/60 bg-surface">
      <div className="container-page py-12 grid gap-8 md:grid-cols-4 text-sm">
        <div>
          <div className="font-semibold text-foreground">{branding.site_name}</div>
          <p className="mt-2 text-muted-foreground">{branding.footer_text}</p>
        </div>
        <FooterCol title="Tools" links={[
          ["/tools/qr-code-generator", "QR Code"],
          ["/tools/invoice-generator", "Invoice Generator"],
          ["/tools/image-compressor", "Image Compressor"],
          ["/tools/currency-converter", "Currency Converter"],
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
          © {new Date().getFullYear()} {branding.site_name}. All rights reserved.
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
