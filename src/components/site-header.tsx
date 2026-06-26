import { Link } from "@tanstack/react-router";
import { Menu, X, Shield } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { isAllowedAdminEmail, useIsAdmin } from "@/hooks/use-role";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_BRANDING, loadSetting, type SiteBranding } from "@/lib/homepage-content";
import logoAsset from "@/assets/onetoolkit-logo.png.asset.json";

const NAV = [
  { to: "/tools/qr-code-generator", label: "QR Code" },
  { to: "/tools/invoice-generator", label: "Invoice" },
  { to: "/tools/image-compressor", label: "Compress" },
  { to: "/tools/passport-photo", label: "Passport" },
  { to: "/tools/currency-converter", label: "Currency" },
  { to: "/about", label: "About" },
] as const;

export function SiteHeader() {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const { data: branding = DEFAULT_BRANDING } = useQuery({
    queryKey: ["cms", "site_branding"],
    queryFn: () => loadSetting<SiteBranding>("site_branding", DEFAULT_BRANDING),
  });
  const showAdmin = isAdmin || isAllowedAdminEmail(user?.email);
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
          <img src={logoAsset.url} alt="One Tool Kit" className="h-9 w-9 rounded-lg object-cover shadow-sm" />
          <span className="truncate">{branding.site_name}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              {showAdmin && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin">
                    <Shield className="h-4 w-4 mr-1" />
                    Admin
                  </Link>
                </Button>
              )}
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => supabase.auth.signOut()}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth" search={{ mode: "signin" }}>Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth" search={{ mode: "signup" }}>Get started</Link>
              </Button>
            </>
          )}
        </div>

        <button
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-border"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/60 bg-background">
          <div className="container-page flex flex-col py-3">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="py-2 text-sm" onClick={() => setOpen(false)}>
                {n.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2 flex-wrap">
              {user ? (
                <>
                  {showAdmin && (
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link to="/admin" onClick={() => setOpen(false)}>
                        <Shield className="h-4 w-4 mr-1" />Admin
                      </Link>
                    </Button>
                  )}
                  <Button asChild size="sm" className="flex-1">
                    <Link to="/dashboard" onClick={() => setOpen(false)}>Dashboard</Link>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setOpen(false); supabase.auth.signOut(); }}>
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link to="/auth" search={{ mode: "signin" }} onClick={() => setOpen(false)}>Sign in</Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1">
                    <Link to="/auth" search={{ mode: "signup" }} onClick={() => setOpen(false)}>Sign up</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
