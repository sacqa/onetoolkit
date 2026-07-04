import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import JSZip from "jszip";
import { Upload, Download, Trash2, ImageDown, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/tools/image-compressor")({
  head: () => ({
    meta: [
      { title: `Image Compressor — Shrink JPG, PNG, WEBP in browser | ${SITE_NAME}` },
      { name: "description", content: "Compress images in your browser. JPG, PNG and WEBP. Nothing leaves your device. Free and unlimited." },
      { property: "og:title", content: "Free Image Compressor — Private, In-Browser" },
      { property: "og:description", content: "Shrink images instantly without uploading. Bulk compress and download as ZIP." },
    ],
    links: [{ rel: "canonical", href: "/tools/image-compressor" }],
  }),
  component: ImageCompressorPage,
});

type Item = {
  id: string;
  file: File;
  originalUrl: string;
  originalSize: number;
  blob?: Blob;
  outUrl?: string;
  outName?: string;
  outSize?: number;
  status: "pending" | "working" | "done" | "error";
  error?: string;
};

const fmt = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(2)} MB`);

function ImageCompressorPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quality, setQuality] = useState(75);
  const [maxWidth, setMaxWidth] = useState(2048);
  const [format, setFormat] = useState<"keep" | "image/jpeg" | "image/webp" | "image/png">("keep");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const totals = useMemo(() => {
    const o = items.reduce((s, i) => s + i.originalSize, 0);
    const n = items.reduce((s, i) => s + (i.outSize ?? 0), 0);
    return { o, n, saved: o > 0 && n > 0 ? Math.max(0, Math.round((1 - n / o) * 100)) : 0 };
  }, [items]);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const next: Item[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      next.push({ id: crypto.randomUUID(), file: f, originalSize: f.size, status: "pending" });
    }
    setItems((p) => [...p, ...next]);
  }, []);

  const compressAll = async () => {
    if (items.length === 0) return;
    setBusy(true);
    try {
      const updated = [...items];
      for (let i = 0; i < updated.length; i++) {
        if (updated[i].status === "done") continue;
        updated[i] = { ...updated[i], status: "working" };
        setItems([...updated]);
        try {
          const outType = format === "keep" ? updated[i].file.type : format;
          const blob = await imageCompression(updated[i].file, {
            maxSizeMB: 20,
            maxWidthOrHeight: maxWidth,
            useWebWorker: true,
            initialQuality: quality / 100,
            fileType: outType,
          });
          const ext = outType.split("/")[1].replace("jpeg", "jpg");
          const base = updated[i].file.name.replace(/\.[^.]+$/, "");
          updated[i] = {
            ...updated[i],
            status: "done",
            blob,
            outSize: blob.size,
            outName: `${base}-min.${ext}`,
          };
          setItems([...updated]);
        } catch (e) {
          updated[i] = { ...updated[i], status: "error", error: (e as Error).message };
          setItems([...updated]);
        }
      }
      toast.success("Compression complete");
    } finally {
      setBusy(false);
    }
  };

  const downloadOne = (it: Item) => {
    if (!it.blob || !it.outName) return;
    const url = URL.createObjectURL(it.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = it.outName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadZip = async () => {
    const done = items.filter((i) => i.blob && i.outName);
    if (done.length === 0) return;
    const zip = new JSZip();
    done.forEach((i) => zip.file(i.outName!, i.blob!));
    const out = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(out);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compressed-images.zip";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-10">
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
            <ImageDown className="h-8 w-8 text-primary" /> Image Compressor
          </h1>
          <p className="mt-2 text-muted-foreground">
            Bulk-compress JPG, PNG and WEBP in your browser. Files never leave your device.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="space-y-4">
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
              className="border-2 border-dashed border-border rounded-2xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-surface transition-colors"
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="mt-3 font-medium">Drop images here or click to select</p>
              <p className="text-sm text-muted-foreground">JPG, PNG, WEBP — multiple files OK</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
              />
            </div>

            {items.length > 0 && (
              <div className="rounded-2xl border border-border bg-card divide-y divide-border">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium text-sm">{it.file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {fmt(it.originalSize)}
                        {it.outSize != null && (
                          <> → <span className="text-success">{fmt(it.outSize)}</span> ({Math.max(0, Math.round((1 - it.outSize / it.originalSize) * 100))}% saved)</>
                        )}
                        {it.error && <span className="text-destructive"> · {it.error}</span>}
                      </div>
                    </div>
                    {it.status === "working" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {it.status === "done" && (
                      <Button size="sm" variant="outline" onClick={() => downloadOne(it)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-5 rounded-2xl border border-border bg-card p-5 h-fit lg:sticky lg:top-20">
            <div>
              <Label>Quality: {quality}%</Label>
              <Slider value={[quality]} min={20} max={95} step={5} onValueChange={(v) => setQuality(v[0])} className="mt-2" />
            </div>
            <div>
              <Label>Max width/height: {maxWidth}px</Label>
              <Slider value={[maxWidth]} min={512} max={4096} step={128} onValueChange={(v) => setMaxWidth(v[0])} className="mt-2" />
            </div>
            <div>
              <Label>Output format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">Keep original</SelectItem>
                  <SelectItem value="image/jpeg">JPEG</SelectItem>
                  <SelectItem value="image/webp">WEBP</SelectItem>
                  <SelectItem value="image/png">PNG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {items.length > 0 && (
              <div className="text-sm text-muted-foreground space-y-1 border-t border-border pt-4">
                <div>Files: <span className="text-foreground font-medium">{items.length}</span></div>
                <div>Original: <span className="text-foreground font-medium">{fmt(totals.o)}</span></div>
                {totals.n > 0 && <div>Compressed: <span className="text-success font-medium">{fmt(totals.n)} ({totals.saved}% saved)</span></div>}
              </div>
            )}
            <Button className="w-full" disabled={busy || items.length === 0} onClick={compressAll}>
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Compressing…</> : "Compress all"}
            </Button>
            <Button className="w-full" variant="outline" disabled={items.filter((i) => i.blob).length < 2} onClick={downloadZip}>
              <Download className="h-4 w-4 mr-2" /> Download all as ZIP
            </Button>
            {items.length > 0 && (
              <Button className="w-full" variant="ghost" onClick={() => setItems([])}>Clear</Button>
            )}
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
