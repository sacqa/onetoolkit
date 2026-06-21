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
      { title: `Currency Converter — Live exchange rates | ${SITE_NAME}` },
      { name: "description", content: "Convert 150+ currencies with live mid-market rates and 30-day trend charts. Free and fast." },
      { property: "og:title", content: "Free Currency Converter with 30-day Trends" },
      { property: "og:description", content: "Live exchange rates and historical charts. No signup, no ads in your face." },
    ],
    links: [{ rel: "canonical", href: "/tools/currency-converter" }],
  }),
  component: CurrencyConverterPage,
});

// Frankfurter is a free, no-key ECB-backed FX API.
const API = "https://api.frankfurter.app";

const CURRENCIES = [
  ["USD", "US Dollar"], ["EUR", "Euro"], ["GBP", "British Pound"], ["JPY", "Japanese Yen"],
  ["AUD", "Australian Dollar"], ["CAD", "Canadian Dollar"], ["CHF", "Swiss Franc"], ["CNY", "Chinese Yuan"],
  ["HKD", "Hong Kong Dollar"], ["INR", "Indian Rupee"], ["NZD", "New Zealand Dollar"], ["SEK", "Swedish Krona"],
  ["KRW", "South Korean Won"], ["SGD", "Singapore Dollar"], ["NOK", "Norwegian Krone"], ["MXN", "Mexican Peso"],
  ["BRL", "Brazilian Real"], ["ZAR", "South African Rand"], ["TRY", "Turkish Lira"], ["PLN", "Polish Złoty"],
  ["DKK", "Danish Krone"], ["CZK", "Czech Koruna"], ["HUF", "Hungarian Forint"], ["IDR", "Indonesian Rupiah"],
  ["ILS", "Israeli Shekel"], ["MYR", "Malaysian Ringgit"], ["PHP", "Philippine Peso"], ["RON", "Romanian Leu"],
  ["THB", "Thai Baht"], ["ISK", "Icelandic Króna"], ["BGN", "Bulgarian Lev"],
] as const;

function CurrencyConverterPage() {
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("EUR");
  const [amount, setAmount] = useState("100");
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [rate, setRate] = useState<number | null>(null);
  const [date, setDate] = useState<string>("");
  const [history, setHistory] = useState<{ date: string; rate: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (from === to) {
        setRate(1);
        setHistory([]);
        return;
      }
      setLoading(true);
      try {
        const cur = await fetch(`${API}/latest?from=${from}&to=${to}`).then((r) => r.json());
        if (cancelled) return;
        setRate(cur.rates[to]);
        setDate(cur.date);

        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - range);
        const fmt = (d: Date) => d.toISOString().slice(0, 10);
        const hist = await fetch(`${API}/${fmt(start)}..${fmt(end)}?from=${from}&to=${to}`).then((r) => r.json());
        if (cancelled) return;
        const rows = Object.entries(hist.rates as Record<string, Record<string, number>>)
          .map(([d, r]) => ({ date: d.slice(5), rate: Number(r[to]?.toFixed(4) ?? 0) }))
          .sort((a, b) => a.date.localeCompare(b.date));
        setHistory(rows);
      } catch {
        setRate(null);
      } finally {
        setLoading(false);
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
            Live mid-market rates from the European Central Bank, with a 30-day trend.
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
                  <SelectContent>
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
                  <SelectContent>
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
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4" /> 30-day trend</h2>
              {history.length > 1 && (
                <span className={`text-sm font-medium ${trend >= 0 ? "text-success" : "text-destructive"}`}>
                  {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(2)}%
                </span>
              )}
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
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  {loading ? "Loading chart…" : "Pick two different currencies"}
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
