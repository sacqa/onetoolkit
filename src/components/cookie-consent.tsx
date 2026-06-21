import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getConsent, setConsent, loadAnalytics } from "@/lib/analytics";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const current = getConsent();
    if (current === "granted") loadAnalytics();
    if (current === null) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-4 sm:max-w-md z-50">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-lg,0_20px_50px_-20px_rgba(0,0,0,0.4))]">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Cookie className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm">We value your privacy</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              We use cookies to measure traffic and improve our tools. You can accept or reject analytics —
              essential cookies are always on. Read our <Link to="/cookies" className="underline">cookie policy</Link>.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => { setConsent("granted"); setShow(false); }}
              >
                Accept all
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setConsent("denied"); setShow(false); }}
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
