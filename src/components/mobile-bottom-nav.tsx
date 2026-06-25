import { Link, useLocation } from "@tanstack/react-router";
import { Home, Grid3x3, User, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { isAllowedAdminEmail, useIsAdmin } from "@/hooks/use-role";

/** App-like bottom nav for mobile. Hidden on md+. */
export function MobileBottomNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const showAdmin = isAdmin || isAllowedAdminEmail(user?.email);

  const items = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/#tools", icon: Grid3x3, label: "Tools", match: (p: string) => p === "/" && false },
    user
      ? { to: "/dashboard", icon: User, label: "Account" }
      : { to: "/auth", icon: User, label: "Sign in" },
    showAdmin ? { to: "/admin", icon: Shield, label: "Admin" } : null,
  ].filter(Boolean) as { to: string; icon: typeof Home; label: string }[];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      aria-label="Bottom navigation"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}>
        {items.map((it) => {
          const Icon = it.icon;
          const active = it.to === pathname || (it.to !== "/" && pathname.startsWith(it.to));
          return (
            <li key={it.to + it.label}>
              <Link
                to={it.to}
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
