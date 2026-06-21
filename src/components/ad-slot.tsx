import { useEffect, useRef, useState } from "react";
import { getSetting, DEFAULT_ADSENSE, type AdSenseSettings } from "@/lib/app-settings";
import { getConsent } from "@/lib/analytics";

type Placement = "header" | "in-content" | "sidebar" | "footer";

declare global {
  interface Window { adsbygoogle?: unknown[] }
}

let scriptLoaded = false;
function loadAdsenseScript(publisherId: string) {
  if (scriptLoaded || typeof window === "undefined") return;
  scriptLoaded = true;
  const s = document.createElement("script");
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
  document.head.appendChild(s);
}

export function AdSlot({ placement, className }: { placement: Placement; className?: string }) {
  const [cfg, setCfg] = useState<AdSenseSettings | null>(null);
  const [consent, setConsentState] = useState(getConsent());
  const ref = useRef<HTMLModElement>(null);

  useEffect(() => {
    getSetting<AdSenseSettings>("adsense", DEFAULT_ADSENSE).then(setCfg);
    const handler = (e: Event) => setConsentState((e as CustomEvent<"granted" | "denied">).detail);
    window.addEventListener("cookie-consent-change", handler);
    return () => window.removeEventListener("cookie-consent-change", handler);
  }, []);

  const slotId =
    placement === "header" ? cfg?.slot_header :
    placement === "in-content" ? cfg?.slot_in_content :
    placement === "sidebar" ? cfg?.slot_sidebar :
    cfg?.slot_footer;

  const ready =
    cfg?.enabled &&
    cfg.publisher_id &&
    slotId &&
    consent === "granted";

  useEffect(() => {
    if (!ready || !ref.current) return;
    loadAdsenseScript(cfg!.publisher_id);
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // ignore push errors (slot already filled, blocker, etc.)
    }
  }, [ready, cfg, slotId]);

  if (!ready) return null;

  return (
    <div className={className}>
      <ins
        ref={ref}
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={cfg!.publisher_id}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
