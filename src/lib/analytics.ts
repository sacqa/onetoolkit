// Lightweight GA4 + consent helper. Loads gtag only after the user opts in.
const CONSENT_KEY = "th-cookie-consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type ConsentState = "granted" | "denied" | null;

export function getConsent(): ConsentState {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(CONSENT_KEY);
  return v === "granted" || v === "denied" ? v : null;
}

export function setConsent(state: "granted" | "denied") {
  localStorage.setItem(CONSENT_KEY, state);
  window.dispatchEvent(new CustomEvent("cookie-consent-change", { detail: state }));
  if (state === "granted") loadAnalytics();
}

let loaded = false;
export function loadAnalytics() {
  if (loaded || typeof window === "undefined") return;
  const id = import.meta.env.VITE_GA_ID as string | undefined;
  if (!id || id.startsWith("G-XXXX")) return;
  loaded = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", id, { anonymize_ip: true });
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", name, params);
}
