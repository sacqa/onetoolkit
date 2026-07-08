import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Upload, Download, Loader2, FileMinus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/tools/compress-pdf")({
  head: () => ({
    meta: [
      { title: `Compress PDF — Free, In-Browser | ${SITE_NAME}` },
      { name: "description", content: "Shrink PDF file size in your browser. Choose between light, balanced or aggressive compression. Free, private, no signup." },
      { property: "og:title", content: `Compress PDF — ${SITE_NAME}` },
      { property: "og:description", content: "Reduce PDF size while keeping pages readable. Runs 100% locally." },
    ],
    links: [{ rel: "canonical", href: "/tools/compress-pdf" }],
  }),
  component: CompressPdfPage,
});

type Mode = "light" | "balanced" | "aggressive";

function humanSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function CompressPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [outUrl, setOutUrl] = useState<string | null>(null);
  const [outSize, setOutSize] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>("balanced");
  const [quality, setQuality] = useState(70);
  const fileRef = useRef<HTMLInputElement>(null);

  function pick(f: File | null) {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please select a PDF file");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      toast.error("PDF must be under 50MB");
      return;
    }
    setFile(f);
    setOutUrl(null);
    setOutSize(null);
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setOutUrl(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = new Uint8Array(await file.arrayBuffer());

      let outBytes: Uint8Array;

      if (mode === "light") {
        // Just re-save with object streams — quick metadata dedupe
        const pdf = await PDFDocument.load(bytes);
        outBytes = await pdf.save({ useObjectStreams: true });
      } else {
        // Rasterize each page to JPEG at a target scale/quality, then embed
        const pdfjs = await import("pdfjs-dist");
        const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

        const scale = mode === "aggressive" ? 1.1 : 1.5;
        const q = Math.max(0.3, Math.min(0.95, quality / 100));

        const src = await pdfjs.getDocument({ data: bytes.slice() }).promise;
        const out = await PDFDocument.create();
        for (let i = 1; i <= src.numPages; i++) {
          const page = await src.getPage(i);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          const dataUrl = canvas.toDataURL("image/jpeg", q);
          const jpg = await out.embedJpg(dataUrl);
          const p = out.addPage([viewport.width, viewport.height]);
          p.drawImage(jpg, { x: 0, y: 0, width: viewport.width, height: viewport.height });
        }
        outBytes = await out.save({ useObjectStreams: true });
      }

      const buf = new ArrayBuffer(outBytes.byteLength);
      new Uint8Array(buf).set(outBytes);
      const blob = new Blob([buf], { type: "application/pdf" });
      setOutUrl(URL.createObjectURL(blob));
      setOutSize(blob.size);

      const saved = file.size - blob.size;
      if (saved > 0) toast.success(`Compressed — saved ${humanSize(saved)}`);
      else toast.info("Already highly optimized — try a stronger mode");

      supabase.auth.getUser().then(({ data: u }) => {
        supabase.from("tool_usage").insert({ tool: "compress-pdf", user_id: u.user?.id ?? null, metadata: { mode, quality } }).then();
      });
    } catch (e) {
      toast.error((e as Error).message || "Compression failed");
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!outUrl || !file) return;
    const a = document.createElement("a");
    a.href = outUrl;
    a.download = file.name.replace(/\.pdf$/i, "") + "-compressed.pdf";
    a.click();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-10">
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
            <FileMinus className="h-8 w-8 text-primary" /> Compress PDF
          </h1>
          <p className="mt-2 text-muted-foreground">
            Shrink PDF file size without uploading anywhere. Runs entirely in your browser.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="space-y-4">
            {!file ? (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0] ?? null); }}
                className="border-2 border-dashed border-border rounded-2xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-surface transition-colors"
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="mt-3 font-medium">Drop a PDF or click to upload</p>
                <p className="text-sm text-muted-foreground">Up to 50MB</p>
                <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden"
                  onChange={(e) => { pick(e.target.files?.[0] ?? null); e.target.value = ""; }} />
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{file.name}</div>
                    <div className="text-xs text-muted-foreground">Original: {humanSize(file.size)}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { setFile(null); setOutUrl(null); setOutSize(null); }}>
                    <Trash2 className="h-4 w-4 mr-1" /> Reset
                  </Button>
                </div>
                {outSize !== null && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm">
                    <div className="font-medium text-emerald-900">
                      Compressed: {humanSize(outSize)}
                      {file.size > outSize && (
                        <span className="ml-2 text-emerald-700">
                          (−{Math.round(((file.size - outSize) / file.size) * 100)}%)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="space-y-5 rounded-2xl border border-border bg-card p-5 h-fit lg:sticky lg:top-20">
            <div>
              <Label>Compression mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light — lossless re-save</SelectItem>
                  <SelectItem value="balanced">Balanced — recommended</SelectItem>
                  <SelectItem value="aggressive">Aggressive — smallest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mode !== "light" && (
              <div>
                <Label>Image quality — {quality}%</Label>
                <Slider min={30} max={95} step={5} value={[quality]} onValueChange={(v) => setQuality(v[0])} className="mt-3" />
              </div>
            )}
            <Button className="w-full" disabled={!file || busy} onClick={run}>
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Compressing…</> : <><FileMinus className="h-4 w-4 mr-2" />Compress PDF</>}
            </Button>
            <Button className="w-full" variant="outline" disabled={!outUrl} onClick={download}>
              <Download className="h-4 w-4 mr-2" /> Download result
            </Button>
            <p className="text-xs text-muted-foreground">
              Balanced and Aggressive modes rasterize pages to images — text becomes non-selectable but file size drops sharply.
            </p>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
