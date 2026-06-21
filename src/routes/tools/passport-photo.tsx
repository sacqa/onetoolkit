import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { Upload, Download, IdCard, Loader2, Wand2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/tools/passport-photo")({
  head: () => ({
    meta: [
      { title: `Passport Photo Maker — Crop & arrange ID photos | ${SITE_NAME}` },
      { name: "description", content: "Crop your photo to passport / visa / ID size for 20+ countries. Print-ready 4x6 sheets in PDF." },
      { property: "og:title", content: "Free Passport Photo Maker — Print-Ready PDFs" },
      { property: "og:description", content: "Country-specific passport, visa and ID sizes. Crop, white background, multi-photo sheet." },
    ],
    links: [{ rel: "canonical", href: "/tools/passport-photo" }],
  }),
  component: PassportPhotoPage,
});

type PhotoSpec = { id: string; label: string; widthMm: number; heightMm: number };

const SPECS: PhotoSpec[] = [
  { id: "us-passport", label: "USA Passport (2×2 in)", widthMm: 51, heightMm: 51 },
  { id: "uk-passport", label: "UK Passport (35×45 mm)", widthMm: 35, heightMm: 45 },
  { id: "schengen", label: "EU / Schengen Visa (35×45 mm)", widthMm: 35, heightMm: 45 },
  { id: "india-passport", label: "India Passport (35×45 mm)", widthMm: 35, heightMm: 45 },
  { id: "canada-passport", label: "Canada Passport (50×70 mm)", widthMm: 50, heightMm: 70 },
  { id: "australia", label: "Australia Passport (35×45 mm)", widthMm: 35, heightMm: 45 },
  { id: "china", label: "China Visa (33×48 mm)", widthMm: 33, heightMm: 48 },
  { id: "japan", label: "Japan Passport (35×45 mm)", widthMm: 35, heightMm: 45 },
  { id: "mexico", label: "Mexico Passport (35×45 mm)", widthMm: 35, heightMm: 45 },
  { id: "brazil", label: "Brazil Passport (50×70 mm)", widthMm: 50, heightMm: 70 },
];

const PRINT_W = 152.4; // 6 inch
const PRINT_H: number = 101.6; // 4 inch
const DPI = 300;

function PassportPhotoPage() {
  const [src, setSrc] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [originalImg, setOriginalImg] = useState<HTMLImageElement | null>(null);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [specId, setSpecId] = useState("us-passport");
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [bg, setBg] = useState<"white" | "off-white" | "light-blue" | "keep">("white");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const spec = SPECS.find((s) => s.id === specId)!;

  const onFile = useCallback((files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setSrc(url);
    setBgRemoved(false);
    const im = new Image();
    im.onload = () => {
      setImg(im);
      setOriginalImg(im);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
    };
    im.src = url;
  }, []);

  const removeBg = useCallback(async () => {
    if (!originalImg || !src) return;
    setRemoving(true);
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      toast.info("Loading AI model (one-time, ~30 MB)…", { id: "bgrm" });
      const blob = await removeBackground(src);
      const url = URL.createObjectURL(blob);
      const im = new Image();
      im.onload = () => {
        setImg(im);
        setBgRemoved(true);
        setRemoving(false);
        toast.success("Background removed", { id: "bgrm" });
      };
      im.src = url;
    } catch (e) {
      setRemoving(false);
      toast.error("Background removal failed: " + (e as Error).message, { id: "bgrm" });
    }
  }, [originalImg, src]);

  const restoreOriginal = () => {
    if (originalImg) { setImg(originalImg); setBgRemoved(false); }
  };

  const renderCrop = useCallback((scale = 4) => {
    if (!img) return null;
    const cw = Math.round(spec.widthMm * scale * (DPI / 25.4) / 4); // preview scale 4 = 75dpi
    const ch = Math.round(spec.heightMm * scale * (DPI / 25.4) / 4);
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d")!;
    const bgFill = bg === "white" ? "#ffffff" : bg === "off-white" ? "#f7f6f1" : bg === "light-blue" ? "#dbeafe" : null;
    if (bgFill) {
      ctx.fillStyle = bgFill;
      ctx.fillRect(0, 0, cw, ch);
    }
    // cover-fit base, then user zoom and offset
    const baseScale = Math.max(cw / img.width, ch / img.height);
    const s = baseScale * zoom;
    const dw = img.width * s;
    const dh = img.height * s;
    const dx = (cw - dw) / 2 + offsetX * cw;
    const dy = (ch - dh) / 2 + offsetY * ch;
    ctx.drawImage(img, dx, dy, dw, dh);
    return canvas;
  }, [img, spec, zoom, offsetX, offsetY, bg]);

  useEffect(() => {
    if (!previewRef.current || !img) return;
    const target = previewRef.current;
    const c = renderCrop(4);
    if (!c) return;
    target.width = c.width;
    target.height = c.height;
    target.getContext("2d")!.drawImage(c, 0, 0);
  }, [img, renderCrop]);

  const downloadSingle = () => {
    const c = renderCrop(16); // ~300dpi
    if (!c) return;
    c.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `passport-${spec.id}.png`;
      a.click();
    }, "image/png");
  };

  const downloadSheet = async () => {
    if (!img) return;
    setBusy(true);
    try {
      const c = renderCrop(16);
      if (!c) return;
      const photoData = c.toDataURL("image/jpeg", 0.92);

      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [PRINT_W, PRINT_H] });
      const gap = 3;
      const margin = 4;
      const cols = Math.floor((PRINT_W - margin * 2 + gap) / (spec.widthMm + gap));
      const rows = Math.floor((PRINT_H - margin * 2 + gap) / (spec.heightMm + gap));
      pdf.setDrawColor(220);
      pdf.setLineDashPattern([1, 1], 0);
      for (let r = 0; r < rows; r++) {
        for (let c2 = 0; c2 < cols; c2++) {
          const x = margin + c2 * (spec.widthMm + gap);
          const y = margin + r * (spec.heightMm + gap);
          pdf.addImage(photoData, "JPEG", x, y, spec.widthMm, spec.heightMm);
          pdf.rect(x, y, spec.widthMm, spec.heightMm);
        }
      }
      pdf.save(`passport-sheet-${spec.id}.pdf`);
      toast.success(`Sheet ready: ${cols * rows} photos on 4×6"`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-10">
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
            <IdCard className="h-8 w-8 text-primary" /> Passport Photo Maker
          </h1>
          <p className="mt-2 text-muted-foreground">
            Crop your photo to country-specific passport, visa or ID size — then download a print-ready 4×6" sheet.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr,340px]">
          <div className="space-y-4">
            {!src ? (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files); }}
                className="border-2 border-dashed border-border rounded-2xl p-16 text-center cursor-pointer hover:border-primary/40 hover:bg-surface transition-colors"
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="mt-3 font-medium">Drop your photo here or click to select</p>
                <p className="text-sm text-muted-foreground">JPG or PNG, front-facing portrait works best</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="text-sm font-medium mb-3">Preview — {spec.widthMm}×{spec.heightMm} mm</div>
                <div className="flex justify-center bg-checker rounded-lg p-4" style={{ background: "repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%) 50% / 16px 16px" }}>
                  <canvas
                    ref={previewRef}
                    className="border border-border shadow-[var(--shadow-soft)] bg-white"
                    style={{ maxWidth: "100%", aspectRatio: `${spec.widthMm} / ${spec.heightMm}`, width: 280 }}
                  />
                </div>
                <Button variant="ghost" size="sm" className="mt-4" onClick={() => { setSrc(null); setImg(null); }}>
                  Choose different photo
                </Button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files)} />
          </div>

          <aside className="space-y-5 rounded-2xl border border-border bg-card p-5 h-fit lg:sticky lg:top-20">
            <div>
              <Label>Format</Label>
              <Select value={specId} onValueChange={setSpecId}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPECS.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Background</Label>
              <Select value={bg} onValueChange={(v) => setBg(v as typeof bg)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="off-white">Off-white</SelectItem>
                  <SelectItem value="light-blue">Light blue</SelectItem>
                  <SelectItem value="keep">Keep original</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                For best results upload a photo with a plain background, or use AI removal below.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-surface p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-sm">AI background removal</Label>
                  <p className="text-xs text-muted-foreground">Runs in your browser. First use downloads a ~30 MB model.</p>
                </div>
                <Switch
                  checked={bgRemoved}
                  disabled={!originalImg || removing}
                  onCheckedChange={(v) => v ? removeBg() : restoreOriginal()}
                />
              </div>
              {removing && (
                <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing…
                </div>
              )}
              {!removing && !bgRemoved && originalImg && (
                <Button size="sm" variant="ghost" className="mt-2 w-full" onClick={removeBg}>
                  <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Remove background now
                </Button>
              )}
            </div>
            <div>
              <Label>Zoom: {zoom.toFixed(2)}×</Label>
              <Slider value={[zoom]} min={1} max={3} step={0.05} onValueChange={(v) => setZoom(v[0])} className="mt-2" />
            </div>
            <div>
              <Label>Horizontal: {(offsetX * 100).toFixed(0)}%</Label>
              <Slider value={[offsetX]} min={-0.5} max={0.5} step={0.01} onValueChange={(v) => setOffsetX(v[0])} className="mt-2" />
            </div>
            <div>
              <Label>Vertical: {(offsetY * 100).toFixed(0)}%</Label>
              <Slider value={[offsetY]} min={-0.5} max={0.5} step={0.01} onValueChange={(v) => setOffsetY(v[0])} className="mt-2" />
            </div>
            <div className="border-t border-border pt-4 space-y-2">
              <Button className="w-full" disabled={!img} onClick={downloadSingle}>
                <Download className="h-4 w-4 mr-2" /> Download single photo (PNG)
              </Button>
              <Button className="w-full" variant="outline" disabled={!img || busy} onClick={downloadSheet}>
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Download 4×6" print sheet (PDF)
              </Button>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
