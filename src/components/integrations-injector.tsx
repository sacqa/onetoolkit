import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DEFAULT_INTEGRATIONS, loadSetting, type Integrations } from "@/lib/homepage-content";

/**
 * Client-side injector for:
 * - Google Analytics 4 (gtag.js) — only loaded if a measurement ID is configured AND cookie consent is granted.
 * - Google Search Console verification meta tag.
 */
export function IntegrationsInjector() {
  const { data } = useQuery({
    queryKey: ["cms", "integrations"],
    queryFn: () => loadSetting<Integrations>("integrations", DEFAULT_INTEGRATIONS),
  });

  useEffect(() => {
    if (typeof document === "undefined" || !data) return;

    // GSC verification meta
    if (data.gsc_verification) {
      const existing = document.querySelector('meta[name="google-site-verification"]');
      if (existing) existing.setAttribute("content", data.gsc_verification);
      else {
        const m = document.createElement("meta");
        m.name = "google-site-verification";
        m.content = data.gsc_verification;
        document.head.appendChild(m);
      }
    }

    // GA4 — respects cookie consent
    if (data.ga_measurement_id) {
      const consent = localStorage.getItem("th-cookie-consent");
      if (consent !== "granted") return;
      if (document.querySelector(`script[data-ga-id="${data.ga_measurement_id}"]`)) return;
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${data.ga_measurement_id}`;
      s.dataset.gaId = data.ga_measurement_id;
      document.head.appendChild(s);

      const inline = document.createElement("script");
      inline.dataset.gaId = data.ga_measurement_id;
      inline.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${data.ga_measurement_id}',{anonymize_ip:true});`;
      document.head.appendChild(inline);
    }
  }, [data]);

  return null;
}
