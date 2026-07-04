import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { Download, Link2, Wifi, Mail, Phone, User as UserIcon, Type, Upload, X } from "lucide-react";
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
      { title: `QR Code Generator — Custom Logo, Colors, Frames | ${SITE_NAME}` },
      { name: "description", content: "Free professional QR code generator. Add your logo, custom colors, rounded frames and export PNG / SVG / PDF." },
      { property: "og:title", content: `QR Code Generator — ${SITE_NAME}` },
      { property: "og:description", content: "Create custom QR codes with your logo, colors and frames. Free, no signup." },
    ],
    links: [{ rel: "canonical", href: "/tools/qr-code-generator" }],
  }),
  component: QRTool,
});

type Mode = "url" | "text" | "wifi" | "vcard" | "email" | "phone";
type FrameStyle = "none" | "rounded" | "scan-me" | "shadow";

function QRTool() {
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("https://onetoolkit.lovable.app");
  const [text, setText] = useState("Hello from One Tool Kit");
  const [wifi, setWifi] = useState({ ssid: "", password: "", auth: "WPA" });
  const [vcard, setVcard] = useState({ name: "", phone: "", email: "", org: "" });
  const [email, setEmail] = useState({ to: "", subject: "", body: "" });
  const [phone, setPhone] = useState("+1234567890");
  const [fg, setFg] = useState("#0b1020");
  const [bg, setBg] = useState("#ffffff");
  const [size, setSize] = useState(512);
  const [ec, setEc] = useState<"L" | "M" | "Q" | "H">("H");
  const [margin, setMargin] = useState(2);
  const [frame, setFrame] = useState<FrameStyle>("none");
  const [frameLabel, setFrameLabel] = useState("SCAN ME");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoScale, setLogoScale] = useState(22); // % of QR
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

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

  // Draw the QR + frame + logo to canvas (perfect square)
  const render = useCallback(async () => {
    if (!canvasRef.current || !payload) return;
    const canvas = canvasRef.current;
    const framePad = frame === "none" ? 0 : Math.round(size * 0.09);
    const labelPad = frame === "scan-me" ? Math.round(size * 0.11) : 0;
    const total = size + framePad * 2 + labelPad;
    canvas.width = total;
    canvas.height = total;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background (frame + label area)
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, total, total);

    // Draw QR on an offscreen canvas
    const off = document.createElement("canvas");
    await QRCode.toCanvas(off, payload, {
      width: size,
      errorCorrectionLevel: ec,
      margin,
      color: { dark: fg, light: bg },
    });

    // Frame styling
    if (frame === "rounded" || frame === "scan-me" || frame === "shadow") {
      ctx.save();
      if (frame === "shadow") {
        ctx.shadowColor = "rgba(0,0,0,0.18)";
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 6;
      }
      const r = Math.round(size * 0.08);
      roundRect(ctx, framePad / 2, framePad / 2, total - framePad - (frame === "scan-me" ? labelPad : 0), total - framePad - labelPad, r);
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.restore();
      // Border
      ctx.strokeStyle = fg;
      ctx.lineWidth = Math.max(2, Math.round(size * 0.008));
      roundRect(ctx, framePad / 2, framePad / 2, total - framePad - (frame === "scan-me" ? labelPad : 0) * 0, total - framePad - labelPad, Math.round(size * 0.08));
      // frame stroke handled below via a fresh path to avoid double-fill glitch
    }

    ctx.drawImage(off, framePad, framePad);

    if (frame === "scan-me") {
      ctx.fillStyle = fg;
      ctx.font = `bold ${Math.round(size * 0.055)}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(frameLabel, total / 2, total - labelPad / 2 - framePad / 2);
    }

    // Logo overlay
    if (logoUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const lw = Math.round((size * logoScale) / 100);
        const lx = framePad + (size - lw) / 2;
        const ly = framePad + (size - lw) / 2;
        // White padded background for scanability
        const pad = Math.round(lw * 0.12);
        ctx.fillStyle = bg;
        roundRect(ctx, lx - pad, ly - pad, lw + pad * 2, lw + pad * 2, Math.round(lw * 0.18));
        ctx.fill();
        ctx.save();
        roundRect(ctx, lx, ly, lw, lw, Math.round(lw * 0.15));
        ctx.clip();
        ctx.drawImage(img, lx, ly, lw, lw);
        ctx.restore();
      };
      img.src = logoUrl;
    }
  }, [payload, size, ec, fg, bg, margin, frame, frameLabel, logoUrl, logoScale]);

  useEffect(() => { render(); }, [render]);

  function onLogoPick(f: File | null) {
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) return toast.error("Logo must be under 4MB");
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(reader.result as string);
    reader.readAsDataURL(f);
    // Auto-bump error correction so QR still scans with logo overlay
    setEc("H");
  }

  async function logUsage() {
    const { data } = await supabase.auth.getUser();
    await supabase.from("tool_usage").insert({
      tool: "qr-code-generator",
      user_id: data.user?.id ?? null,
      metadata: { mode, frame, has_logo: !!logoUrl },
    });
  }

  function downloadPng() {
    if (!canvasRef.current) return;
    triggerDownload(canvasRef.current.toDataURL("image/png"), "qr-code.png");
    logUsage();
    toast.success("PNG downloaded");
  }
  async function downloadSvg() {
    // Simple SVG export without logo/frame (raw QR)
    const svg = await QRCode.toString(payload!, { type: "svg", errorCorrectionLevel: ec, margin, color: { dark: fg, light: bg } });
    const blob = new Blob([svg], { type: "image/svg+xml" });
    triggerDownload(URL.createObjectURL(blob), "qr-code.svg");
    logUsage();
    toast.success("SVG downloaded");
  }
  function downloadPdf() {
    if (!canvasRef.current) return;
    const png = canvasRef.current.toDataURL("image/png");
    const s = canvasRef.current.width;
    const pdf = new jsPDF({ unit: "pt", format: [s + 80, s + 80] });
    pdf.addImage(png, "PNG", 40, 40, s, s);
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
              Design professional square QR codes with your logo, brand colors and stylish frames. Runs entirely in your browser.
            </p>
          </header>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
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

              <div className="mt-6 space-y-6">
                <div>
                  <Label className="mb-2 block">Frame style</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["none", "rounded", "shadow", "scan-me"] as FrameStyle[]).map((f) => (
                      <button key={f} onClick={() => setFrame(f)}
                        className={`rounded-lg border p-2 text-xs capitalize transition ${frame === f ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"}`}>
                        {f.replace("-", " ")}
                      </button>
                    ))}
                  </div>
                  {frame === "scan-me" && (
                    <div className="mt-3">
                      <Label className="text-xs">Frame label</Label>
                      <Input value={frameLabel} onChange={(e) => setFrameLabel(e.target.value.slice(0, 24))} className="mt-1" />
                    </div>
                  )}
                </div>

                <div>
                  <Label className="mb-2 block">Center logo</Label>
                  {logoUrl ? (
                    <div className="flex items-center gap-3">
                      <img src={logoUrl} alt="Logo" className="h-14 w-14 rounded-lg border border-border object-contain bg-white" />
                      <div className="flex-1">
                        <Label className="text-xs">Size: {logoScale}% of QR</Label>
                        <Slider value={[logoScale]} min={12} max={32} step={1} onValueChange={(v) => setLogoScale(v[0])} className="mt-2" />
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setLogoUrl(null)}><X className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <button onClick={() => logoInputRef.current?.click()}
                      className="w-full rounded-lg border-2 border-dashed border-border hover:border-primary/50 p-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
                      <Upload className="h-4 w-4" /> Upload logo (PNG/JPG/SVG)
                    </button>
                  )}
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { onLogoPick(e.target.files?.[0] ?? null); e.target.value = ""; }} />
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
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
                    <Slider value={[size]} min={256} max={1200} step={32} onValueChange={(v) => setSize(v[0])} className="mt-3" />
                  </div>
                  <div>
                    <Label>Quiet margin: {margin}</Label>
                    <Slider value={[margin]} min={0} max={8} step={1} onValueChange={(v) => setMargin(v[0])} className="mt-3" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Error correction</Label>
                    <Select value={ec} onValueChange={(v) => setEc(v as "L" | "M" | "Q" | "H")}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L">Low (7%)</SelectItem>
                        <SelectItem value="M">Medium (15%)</SelectItem>
                        <SelectItem value="Q">Quartile (25%)</SelectItem>
                        <SelectItem value="H">High (30%) — required with logo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <aside className="rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-20 h-fit">
              <div className="flex items-center justify-center rounded-xl bg-surface p-4 aspect-square">
                <canvas ref={canvasRef} className="max-w-full h-auto" style={{ imageRendering: "pixelated" }} />
              </div>
              <div className="mt-4 grid gap-2">
                <Button onClick={downloadPng}><Download className="mr-2 h-4 w-4" />Download PNG</Button>
                <Button onClick={downloadSvg} variant="outline">Download SVG</Button>
                <Button onClick={downloadPdf} variant="outline">Download PDF</Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Tip: keep contrast high and use error correction "High" when adding a logo.
              </p>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
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
