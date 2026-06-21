import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { Download, Link2, Wifi, Mail, Phone, User as UserIcon, Type } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/tools/qr-code-generator")({
  head: () => ({
    meta: [
      { title: `QR Code Generator — ${SITE_NAME}` },
      { name: "description", content: "Free QR code generator with customisable colors, error correction, and PNG / SVG / PDF export. Make QR codes for URLs, WiFi, contacts and more." },
      { property: "og:title", content: `QR Code Generator — ${SITE_NAME}` },
      { property: "og:description", content: "Create custom QR codes in seconds. Free, no signup, exports PNG, SVG and PDF." },
      { property: "og:url", content: "/tools/qr-code-generator" },
    ],
    links: [{ rel: "canonical", href: "/tools/qr-code-generator" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "QR Code Generator",
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Any",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      }),
    }],
  }),
  component: QRTool,
});

type Mode = "url" | "text" | "wifi" | "vcard" | "email" | "phone";

function QRTool() {
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("https://toolhub.app");
  const [text, setText] = useState("Hello from ToolHub");
  const [wifi, setWifi] = useState({ ssid: "", password: "", auth: "WPA" });
  const [vcard, setVcard] = useState({ name: "", phone: "", email: "", org: "" });
  const [email, setEmail] = useState({ to: "", subject: "", body: "" });
  const [phone, setPhone] = useState("+1234567890");
  const [fg, setFg] = useState("#0b1020");
  const [bg, setBg] = useState("#ffffff");
  const [size, setSize] = useState(320);
  const [ec, setEc] = useState<"L" | "M" | "Q" | "H">("M");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [svg, setSvg] = useState("");

  const payload = useMemo(() => {
    switch (mode) {
      case "url": return url;
      case "text": return text;
      case "wifi": return `WIFI:T:${wifi.auth};S:${wifi.ssid};P:${wifi.password};;`;
      case "vcard": return `BEGIN:VCARD\nVERSION:3.0\nFN:${vcard.name}\nTEL:${vcard.phone}\nEMAIL:${vcard.email}\nORG:${vcard.org}\nEND:VCARD`;
      case "email": return `mailto:${email.to}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
      case "phone": return `tel:${phone}`;
    }
  }, [mode, url, text, wifi, vcard, email, phone]);

  useEffect(() => {
    if (!payload || !canvasRef.current) return;
    const opts = { width: size, errorCorrectionLevel: ec, margin: 2, color: { dark: fg, light: bg } };
    QRCode.toCanvas(canvasRef.current, payload, opts).catch(() => {});
    QRCode.toString(payload, { ...opts, type: "svg" }).then(setSvg).catch(() => {});
  }, [payload, size, ec, fg, bg]);

  async function logUsage() {
    const { data } = await supabase.auth.getUser();
    await supabase.from("tool_usage").insert({
      tool: "qr-code-generator",
      user_id: data.user?.id ?? null,
      metadata: { mode },
    });
  }

  function downloadPng() {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL("image/png");
    triggerDownload(url, "qr-code.png");
    logUsage();
    toast.success("PNG downloaded");
  }
  function downloadSvg() {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    triggerDownload(URL.createObjectURL(blob), "qr-code.svg");
    logUsage();
    toast.success("SVG downloaded");
  }
  function downloadPdf() {
    if (!canvasRef.current) return;
    const png = canvasRef.current.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "pt", format: [size + 80, size + 80] });
    pdf.addImage(png, "PNG", 40, 40, size, size);
    pdf.save("qr-code.pdf");
    logUsage();
    toast.success("PDF downloaded");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container-page py-10">
          <header className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">QR Code Generator</h1>
            <p className="mt-2 text-muted-foreground">
              Create custom QR codes for URLs, WiFi, contacts, email and phone numbers. Style with your brand colors and export as PNG, SVG or PDF — all in your browser.
            </p>
          </header>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Builder */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <TabsList className="grid grid-cols-3 sm:grid-cols-6 mb-6">
                  <TabsTrigger value="url"><Link2 className="mr-1.5 h-3.5 w-3.5" />URL</TabsTrigger>
                  <TabsTrigger value="text"><Type className="mr-1.5 h-3.5 w-3.5" />Text</TabsTrigger>
                  <TabsTrigger value="wifi"><Wifi className="mr-1.5 h-3.5 w-3.5" />WiFi</TabsTrigger>
                  <TabsTrigger value="vcard"><UserIcon className="mr-1.5 h-3.5 w-3.5" />vCard</TabsTrigger>
                  <TabsTrigger value="email"><Mail className="mr-1.5 h-3.5 w-3.5" />Email</TabsTrigger>
                  <TabsTrigger value="phone"><Phone className="mr-1.5 h-3.5 w-3.5" />Phone</TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="space-y-3">
                  <Label htmlFor="url">URL</Label>
                  <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
                </TabsContent>
                <TabsContent value="text" className="space-y-3">
                  <Label htmlFor="text">Text</Label>
                  <textarea id="text" rows={4} value={text} onChange={(e) => setText(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </TabsContent>
                <TabsContent value="wifi" className="grid sm:grid-cols-2 gap-3">
                  <Field label="Network name (SSID)" value={wifi.ssid} onChange={(v) => setWifi({ ...wifi, ssid: v })} />
                  <Field label="Password" value={wifi.password} onChange={(v) => setWifi({ ...wifi, password: v })} />
                  <div className="sm:col-span-2">
                    <Label>Security</Label>
                    <Select value={wifi.auth} onValueChange={(v) => setWifi({ ...wifi, auth: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WPA">WPA / WPA2</SelectItem>
                        <SelectItem value="WEP">WEP</SelectItem>
                        <SelectItem value="nopass">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
                <TabsContent value="vcard" className="grid sm:grid-cols-2 gap-3">
                  <Field label="Full name" value={vcard.name} onChange={(v) => setVcard({ ...vcard, name: v })} />
                  <Field label="Organization" value={vcard.org} onChange={(v) => setVcard({ ...vcard, org: v })} />
                  <Field label="Phone" value={vcard.phone} onChange={(v) => setVcard({ ...vcard, phone: v })} />
                  <Field label="Email" value={vcard.email} onChange={(v) => setVcard({ ...vcard, email: v })} />
                </TabsContent>
                <TabsContent value="email" className="grid sm:grid-cols-2 gap-3">
                  <Field label="To" value={email.to} onChange={(v) => setEmail({ ...email, to: v })} />
                  <Field label="Subject" value={email.subject} onChange={(v) => setEmail({ ...email, subject: v })} />
                  <div className="sm:col-span-2">
                    <Label>Body</Label>
                    <textarea rows={3} value={email.body} onChange={(e) => setEmail({ ...email, body: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                </TabsContent>
                <TabsContent value="phone" className="space-y-3">
                  <Field label="Phone number" value={phone} onChange={setPhone} />
                </TabsContent>
              </Tabs>

              <div className="mt-6 grid sm:grid-cols-2 gap-5">
                <div>
                  <Label>Foreground</Label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <input type="color" value={fg} onChange={(e) => setFg(e.target.value)} className="h-9 w-12 rounded border border-input bg-transparent" />
                    <Input value={fg} onChange={(e) => setFg(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Background</Label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="h-9 w-12 rounded border border-input bg-transparent" />
                    <Input value={bg} onChange={(e) => setBg(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Size: {size}px</Label>
                  <Slider value={[size]} min={128} max={1024} step={32} onValueChange={(v) => setSize(v[0])} className="mt-3" />
                </div>
                <div>
                  <Label>Error correction</Label>
                  <Select value={ec} onValueChange={(v) => setEc(v as "L" | "M" | "Q" | "H")}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Low (7%)</SelectItem>
                      <SelectItem value="M">Medium (15%)</SelectItem>
                      <SelectItem value="Q">Quartile (25%)</SelectItem>
                      <SelectItem value="H">High (30%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Preview */}
            <aside className="rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-20 h-fit">
              <div className="flex items-center justify-center rounded-xl bg-surface p-4">
                <canvas ref={canvasRef} className="max-w-full h-auto" />
              </div>
              <div className="mt-4 grid gap-2">
                <Button onClick={downloadPng}><Download className="mr-2 h-4 w-4" />Download PNG</Button>
                <Button onClick={downloadSvg} variant="outline">Download SVG</Button>
                <Button onClick={downloadPdf} variant="outline">Download PDF</Button>
              </div>
            </aside>
          </div>

          {/* SEO copy */}
          <section className="prose prose-slate dark:prose-invert mt-16 max-w-3xl">
            <h2 className="text-2xl font-bold">About this QR code generator</h2>
            <p className="text-muted-foreground">
              A QR code is a two-dimensional barcode that any modern smartphone camera can read. Our generator runs entirely in your browser — your data is never uploaded to a server. Use it to share a website link, log guests onto your WiFi, hand out a digital business card, or kick off an email or phone call with one scan.
            </p>
            <h3 className="text-xl font-semibold mt-8">Tips for scannable QR codes</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Keep strong contrast between foreground and background.</li>
              <li>If you'll place a logo or print at small sizes, raise the error correction to High.</li>
              <li>Avoid inverted colors (light QR on dark background) for older scanners.</li>
            </ul>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input className="mt-1.5" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
