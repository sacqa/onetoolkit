import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import JSZip from "jszip";
import { Upload, Download, Loader2, FileImage, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/tools/pdf-to-jpg")({
  head: () => ({
    meta: [
      { title: `PDF to JPG Converter — Free, In-Browser | ${SITE_NAME}` },
      { name: "description", content: "Convert every page of a PDF into high-quality JPG or PNG images. Runs 100% in your browser — no uploads." },
      { property: "og:title", content: `PDF to JPG — ${SITE_NAME}` },
      { property: "og:description", content: "Convert PDF pages to JPG or PNG in seconds. Free, private, no signup." },
    ],
    links: [{ rel: "canonical", href: "/tools/pdf-to-jpg" }],
  }),
  component: PdfToJpgPage,
});

type PageImage = { page: number; dataUrl: string; blob: Blob };

function PdfToJpgPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [dpi, setDpi] = useState(150);
  const [format, setFormat] = useState<"image/jpeg" | "image/png">("image/jpeg");
  const [quality, setQuality] = useState(90);
  const fileRef = useRef<HTMLInputElement>(null);

  const convert = useCallback(async (f: File) => {
    setBusy(true);
    setPages([]);
    try {
      // Dynamically import pdfjs-dist to avoid SSR issues
      const pdfjs = await import("pdfjs-dist");
      // Use the mjs worker file bundled with pdfjs-dist v6
      const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

      const buf = await f.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buf }).promise;
      const scale = dpi / 72;
      const out: PageImage[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext("2d")!;
        // White background for JPG (PDF pages can be transparent)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, canvas, viewport }).promise;
        const dataUrl = canvas.toDataURL(format, quality / 100);
        const blob = await (await fetch(dataUrl)).blob();
        out.push({ page: i, dataUrl, blob });
        setPages([...out]);
      }
      toast.success(`Converted ${out.length} page${out.length === 1 ? "" : "s"}`);
      supabase.auth.getUser().then(({ data }) => {
        supabase.from("tool_usage").insert({ tool: "pdf-to-jpg", user_id: data.user?.id ?? null, metadata: { pages: out.length } }).then();
      });
    } catch (e) {
      toast.error((e as Error).message || "Failed to convert PDF");
    } finally {
      setBusy(false);
    }
  }, [dpi, format, quality]);

  function onPick(f: File | null) {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) return toast.error("Please choose a PDF file");
    if (f.size > 50 * 1024 * 1024) return toast.error("PDF must be under 50MB");
    setFile(f);
    convert(f);
  }

  function downloadOne(p: PageImage) {
    const ext = format === "image/png" ? "png" : "jpg";
    const url = URL.createObjectURL(p.blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${file?.name.replace(/\.pdf$/i, "")}-page-${p.page}.${ext}`; a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadZip() {
    if (!pages.length || !file) return;
    const ext = format === "image/png" ? "png" : "jpg";
    const zip = new JSZip();
    const base = file.name.replace(/\.pdf$/i, "");
    pages.forEach((p) => zip.file(`${base}-page-${p.page}.${ext}`, p.blob));
    const out = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(out);
    const a = document.createElement("a"); a.href = url; a.download = `${base}-images.zip`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-10">
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
            <FileImage className="h-8 w-8 text-primary" /> PDF to JPG Converter
          </h1>
          <p className="mt-2 text-muted-foreground">
            Turn every page of your PDF into a JPG or PNG image. Runs in your browser — nothing is uploaded.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="space-y-4">
            {!file && (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); onPick(e.dataTransfer.files?.[0] ?? null); }}
                className="border-2 border-dashed border-border rounded-2xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-surface transition-colors"
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="mt-3 font-medium">Drop a PDF here or click to select</p>
                <p className="text-sm text-muted-foreground">Up to 50MB</p>
                <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden"
                  onChange={(e) => { onPick(e.target.files?.[0] ?? null); e.target.value = ""; }} />
              </div>
            )}

            {file && (
              <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
                <FileImage className="h-6 w-6 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium text-sm">{file.name}</div>
                  <div className="text-xs text-muted-foreground">{(file.size / 1048576).toFixed(2)} MB · {pages.length} pages converted</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setFile(null); setPages([]); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}

            {busy && (
              <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Rendering pages…
              </div>
            )}

            {pages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {pages.map((p) => (
                  <div key={p.page} className="rounded-xl border border-border bg-card overflow-hidden group">
                    <div className="aspect-[3/4] bg-surface flex items-center justify-center">
                      <img src={p.dataUrl} alt={`Page ${p.page}`} className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="p-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Page {p.page}</span>
                      <Button size="sm" variant="ghost" onClick={() => downloadOne(p)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-5 rounded-2xl border border-border bg-card p-5 h-fit lg:sticky lg:top-20">
            <div>
              <Label>Resolution: {dpi} DPI</Label>
              <Slider value={[dpi]} min={72} max={300} step={12} onValueChange={(v) => setDpi(v[0])} className="mt-2" />
            </div>
            <div>
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as "image/jpeg" | "image/png")}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image/jpeg">JPG (smaller)</SelectItem>
                  <SelectItem value="image/png">PNG (lossless)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {format === "image/jpeg" && (
              <div>
                <Label>JPG quality: {quality}%</Label>
                <Slider value={[quality]} min={40} max={100} step={5} onValueChange={(v) => setQuality(v[0])} className="mt-2" />
              </div>
            )}
            <Button className="w-full" disabled={!file || busy} onClick={() => file && convert(file)}>
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Converting…</> : "Re-render with settings"}
            </Button>
            <Button className="w-full" variant="outline" disabled={pages.length < 2} onClick={downloadZip}>
              <Download className="h-4 w-4 mr-2" /> Download all as ZIP
            </Button>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
