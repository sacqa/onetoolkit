import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, DollarSign, Loader2, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/tools/currency-converter")({
  head: () => ({
    meta: [
      { title: `Currency Converter — Live worldwide rates | ${SITE_NAME}` },
      { name: "description", content: "Convert 160+ world currencies with live mid-market rates and historical trend charts. Free and fast." },
      { property: "og:title", content: "Free Currency Converter — 160+ currencies" },
      { property: "og:description", content: "Live exchange rates across every major and minor currency, with historical charts. No signup." },
    ],
    links: [{ rel: "canonical", href: "/tools/currency-converter" }],
  }),
  component: CurrencyConverterPage,
});

// Live rates — open.er-api.com covers 160+ currencies, no key required.
const LIVE_API = "https://open.er-api.com/v6/latest";
// Historical — Frankfurter (ECB) covers ~30 majors. Used only when both codes are supported.
const HIST_API = "https://api.frankfurter.dev/v1";

// Worldwide currency list (ISO 4217). Sorted alphabetically by code.
const CURRENCIES: [string, string][] = [
  ["AED", "UAE Dirham"], ["AFN", "Afghan Afghani"], ["ALL", "Albanian Lek"], ["AMD", "Armenian Dram"],
  ["ANG", "Netherlands Antillean Guilder"], ["AOA", "Angolan Kwanza"], ["ARS", "Argentine Peso"],
  ["AUD", "Australian Dollar"], ["AWG", "Aruban Florin"], ["AZN", "Azerbaijani Manat"],
  ["BAM", "Bosnia-Herzegovina Convertible Mark"], ["BBD", "Barbadian Dollar"], ["BDT", "Bangladeshi Taka"],
  ["BGN", "Bulgarian Lev"], ["BHD", "Bahraini Dinar"], ["BIF", "Burundian Franc"], ["BMD", "Bermudan Dollar"],
  ["BND", "Brunei Dollar"], ["BOB", "Bolivian Boliviano"], ["BRL", "Brazilian Real"], ["BSD", "Bahamian Dollar"],
  ["BTN", "Bhutanese Ngultrum"], ["BWP", "Botswanan Pula"], ["BYN", "Belarusian Ruble"], ["BZD", "Belize Dollar"],
  ["CAD", "Canadian Dollar"], ["CDF", "Congolese Franc"], ["CHF", "Swiss Franc"], ["CLP", "Chilean Peso"],
  ["CNY", "Chinese Yuan"], ["COP", "Colombian Peso"], ["CRC", "Costa Rican Colón"], ["CUP", "Cuban Peso"],
  ["CVE", "Cape Verdean Escudo"], ["CZK", "Czech Koruna"], ["DJF", "Djiboutian Franc"], ["DKK", "Danish Krone"],
  ["DOP", "Dominican Peso"], ["DZD", "Algerian Dinar"], ["EGP", "Egyptian Pound"], ["ERN", "Eritrean Nakfa"],
  ["ETB", "Ethiopian Birr"], ["EUR", "Euro"], ["FJD", "Fijian Dollar"], ["FKP", "Falkland Islands Pound"],
  ["FOK", "Faroese Króna"], ["GBP", "British Pound"], ["GEL", "Georgian Lari"], ["GGP", "Guernsey Pound"],
  ["GHS", "Ghanaian Cedi"], ["GIP", "Gibraltar Pound"], ["GMD", "Gambian Dalasi"], ["GNF", "Guinean Franc"],
  ["GTQ", "Guatemalan Quetzal"], ["GYD", "Guyanaese Dollar"], ["HKD", "Hong Kong Dollar"], ["HNL", "Honduran Lempira"],
  ["HRK", "Croatian Kuna"], ["HTG", "Haitian Gourde"], ["HUF", "Hungarian Forint"], ["IDR", "Indonesian Rupiah"],
  ["ILS", "Israeli New Shekel"], ["IMP", "Isle of Man Pound"], ["INR", "Indian Rupee"], ["IQD", "Iraqi Dinar"],
  ["IRR", "Iranian Rial"], ["ISK", "Icelandic Króna"], ["JEP", "Jersey Pound"], ["JMD", "Jamaican Dollar"],
  ["JOD", "Jordanian Dinar"], ["JPY", "Japanese Yen"], ["KES", "Kenyan Shilling"], ["KGS", "Kyrgystani Som"],
  ["KHR", "Cambodian Riel"], ["KID", "Kiribati Dollar"], ["KMF", "Comorian Franc"], ["KRW", "South Korean Won"],
  ["KWD", "Kuwaiti Dinar"], ["KYD", "Cayman Islands Dollar"], ["KZT", "Kazakhstani Tenge"], ["LAK", "Laotian Kip"],
  ["LBP", "Lebanese Pound"], ["LKR", "Sri Lankan Rupee"], ["LRD", "Liberian Dollar"], ["LSL", "Lesotho Loti"],
  ["LYD", "Libyan Dinar"], ["MAD", "Moroccan Dirham"], ["MDL", "Moldovan Leu"], ["MGA", "Malagasy Ariary"],
  ["MKD", "Macedonian Denar"], ["MMK", "Myanmar Kyat"], ["MNT", "Mongolian Tugrik"], ["MOP", "Macanese Pataca"],
  ["MRU", "Mauritanian Ouguiya"], ["MUR", "Mauritian Rupee"], ["MVR", "Maldivian Rufiyaa"], ["MWK", "Malawian Kwacha"],
  ["MXN", "Mexican Peso"], ["MYR", "Malaysian Ringgit"], ["MZN", "Mozambican Metical"], ["NAD", "Namibian Dollar"],
  ["NGN", "Nigerian Naira"], ["NIO", "Nicaraguan Córdoba"], ["NOK", "Norwegian Krone"], ["NPR", "Nepalese Rupee"],
  ["NZD", "New Zealand Dollar"], ["OMR", "Omani Rial"], ["PAB", "Panamanian Balboa"], ["PEN", "Peruvian Sol"],
  ["PGK", "Papua New Guinean Kina"], ["PHP", "Philippine Peso"], ["PKR", "Pakistani Rupee"], ["PLN", "Polish Złoty"],
  ["PYG", "Paraguayan Guarani"], ["QAR", "Qatari Rial"], ["RON", "Romanian Leu"], ["RSD", "Serbian Dinar"],
  ["RUB", "Russian Ruble"], ["RWF", "Rwandan Franc"], ["SAR", "Saudi Riyal"], ["SBD", "Solomon Islands Dollar"],
  ["SCR", "Seychellois Rupee"], ["SDG", "Sudanese Pound"], ["SEK", "Swedish Krona"], ["SGD", "Singapore Dollar"],
  ["SHP", "St. Helena Pound"], ["SLE", "Sierra Leonean Leone"], ["SOS", "Somali Shilling"], ["SRD", "Surinamese Dollar"],
  ["SSP", "South Sudanese Pound"], ["STN", "São Tomé & Príncipe Dobra"], ["SYP", "Syrian Pound"], ["SZL", "Eswatini Lilangeni"],
  ["THB", "Thai Baht"], ["TJS", "Tajikistani Somoni"], ["TMT", "Turkmenistani Manat"], ["TND", "Tunisian Dinar"],
  ["TOP", "Tongan Paʻanga"], ["TRY", "Turkish Lira"], ["TTD", "Trinidad & Tobago Dollar"], ["TVD", "Tuvaluan Dollar"],
  ["TWD", "New Taiwan Dollar"], ["TZS", "Tanzanian Shilling"], ["UAH", "Ukrainian Hryvnia"], ["UGX", "Ugandan Shilling"],
  ["USD", "US Dollar"], ["UYU", "Uruguayan Peso"], ["UZS", "Uzbekistani Som"], ["VES", "Venezuelan Bolívar"],
  ["VND", "Vietnamese Đồng"], ["VUV", "Vanuatu Vatu"], ["WST", "Samoan Tala"], ["XAF", "Central African CFA Franc"],
  ["XCD", "East Caribbean Dollar"], ["XDR", "IMF Special Drawing Rights"], ["XOF", "West African CFA Franc"],
  ["XPF", "CFP Franc"], ["YER", "Yemeni Rial"], ["ZAR", "South African Rand"], ["ZMW", "Zambian Kwacha"],
  ["ZWL", "Zimbabwean Dollar"],
];

// Currencies covered by Frankfurter (ECB) for historical trend.
const HIST_SUPPORTED = new Set([
  "AUD","BGN","BRL","CAD","CHF","CNY","CZK","DKK","EUR","GBP","HKD","HUF","IDR","ILS","INR","ISK",
  "JPY","KRW","MXN","MYR","NOK","NZD","PHP","PLN","RON","SEK","SGD","THB","TRY","USD","ZAR",
]);

function CurrencyConverterPage() {
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("EUR");
  const [amount, setAmount] = useState("100");
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [rate, setRate] = useState<number | null>(null);
  const [date, setDate] = useState<string>("");
  const [history, setHistory] = useState<{ date: string; rate: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const historyAvailable = HIST_SUPPORTED.has(from) && HIST_SUPPORTED.has(to);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(null);
      if (from === to) {
        setRate(1);
        setHistory([]);
        setDate(new Date().toISOString().slice(0, 10));
        return;
      }
      setLoading(true);
      try {
        // Live rate — worldwide coverage via open.er-api.com
        const cur = await fetch(`${LIVE_API}/${from}`).then((r) => r.json());
        if (cancelled) return;
        const r = cur?.rates?.[to];
        if (typeof r !== "number") throw new Error(`No rate for ${from}→${to}`);
        setRate(r);
        setDate((cur.time_last_update_utc as string | undefined)?.slice(5, 16) ?? "");

        // Historical chart — only when both codes are supported by ECB
        if (HIST_SUPPORTED.has(from) && HIST_SUPPORTED.has(to)) {
          const end = new Date();
          const start = new Date();
          start.setDate(end.getDate() - range);
          const fmt = (d: Date) => d.toISOString().slice(0, 10);
          const hist = await fetch(`${HIST_API}/${fmt(start)}..${fmt(end)}?base=${from}&symbols=${to}`).then((res) => res.json());
          if (cancelled) return;
          const rows = Object.entries(hist.rates as Record<string, Record<string, number>>)
            .map(([d, rr]) => ({ date: d.slice(5), rate: Number(rr[to]?.toFixed(4) ?? 0) }))
            .sort((a, b) => a.date.localeCompare(b.date));
          setHistory(rows);
        } else {
          setHistory([]);
        }
      } catch (e) {
        if (!cancelled) {
          setRate(null);
          setError(e instanceof Error ? e.message : "Failed to load rate");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [from, to, range]);

  const converted = useMemo(() => {
    const n = parseFloat(amount);
    if (!rate || isNaN(n)) return "—";
    return (n * rate).toLocaleString(undefined, { maximumFractionDigits: 4 });
  }, [amount, rate]);

  const trend = useMemo(() => {
    if (history.length < 2) return 0;
    const first = history[0].rate;
    const last = history[history.length - 1].rate;
    return ((last - first) / first) * 100;
  }, [history]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-10">
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-primary" /> Currency Converter
          </h1>
          <p className="mt-2 text-muted-foreground">
            Live mid-market rates across {CURRENCIES.length}+ world currencies, with historical trend for majors.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1.5 text-lg font-medium"
              />
            </div>
            <div className="grid grid-cols-[1fr,auto,1fr] items-end gap-2">
              <div>
                <Label>From</Label>
                <Select value={from} onValueChange={setFrom}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-80">
                    {CURRENCIES.map(([c, n]) => <SelectItem key={c} value={c}>{c} — {n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => { setFrom(to); setTo(from); }}
                aria-label="Swap currencies"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
              <div>
                <Label>To</Label>
                <Select value={to} onValueChange={setTo}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-80">
                    {CURRENCIES.map(([c, n]) => <SelectItem key={c} value={c}>{c} — {n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-xl bg-surface border border-border/60 p-5 mt-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Converted</div>
              <div className="mt-1 text-3xl font-bold flex items-center gap-2">
                {loading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : converted}
                <span className="text-base font-medium text-muted-foreground">{to}</span>
              </div>
              {rate && (
                <div className="text-sm text-muted-foreground mt-2">
                  1 {from} = {rate.toFixed(4)} {to} {date && <>· as of {date}</>}
                </div>
              )}
              {error && <div className="text-sm text-destructive mt-2">{error}</div>}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4" /> {range}-day trend</h2>
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-md border border-border overflow-hidden">
                  {([7, 30, 90] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={`px-2.5 py-1 text-xs font-medium ${range === r ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
                    >
                      {r}d
                    </button>
                  ))}
                </div>
                {history.length > 1 && (
                  <span className={`text-sm font-medium ${trend >= 0 ? "text-success" : "text-destructive"}`}>
                    {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
            <div className="h-64 mt-4">
              {history.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    />
                    <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-center text-sm text-muted-foreground px-6">
                  {loading
                    ? "Loading chart…"
                    : !historyAvailable
                      ? "Historical charts are available for major currencies (USD, EUR, GBP, JPY, INR, CNY, and other ECB majors). Live rate is shown for all other pairs."
                      : "Pick two different currencies"}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
