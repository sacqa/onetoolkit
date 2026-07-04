import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Upload, Download, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/tools/image-upscaler")({
  head: () => ({
    meta: [
      { title: `AI Image Upscaler — Enhance & Upscale Photos | ${SITE_NAME}` },
      { name: "description", content: "AI-powered image upscaler. Enhance photo detail, sharpness and clarity with one click. Free to try." },
      { property: "og:title", content: `AI Image Upscaler — ${SITE_NAME}` },
      { property: "og:description", content: "Enhance and upscale photos with AI. Sharper, cleaner, crisper results." },
    ],
    links: [{ rel: "canonical", href: "/tools/image-upscaler" }],
  }),
  component: UpscalerPage,
});

function UpscalerPage() {
  const [srcFile, setSrcFile] = useState<File | null>(null);
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [outUrl, setOutUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scale, setScale] = useState<"2" | "4">("2");
  const [prompt, setPrompt] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function pick(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Please select an image");
    if (f.size > 8 * 1024 * 1024) return toast.error("Image must be under 8MB");
    setSrcFile(f);
    setOutUrl(null);
    const r = new FileReader();
    r.onload = () => setSrcUrl(r.result as string);
    r.readAsDataURL(f);
  }

  async function run() {
    if (!srcUrl) return;
    setBusy(true);
    setOutUrl(null);
    try {
      const res = await fetch("/api/upscale-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: srcUrl, scale: Number(scale), prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upscale failed");
      setOutUrl(data.image);
      toast.success("Image enhanced");
      supabase.auth.getUser().then(({ data: u }) => {
        supabase.from("tool_usage").insert({ tool: "image-upscaler", user_id: u.user?.id ?? null, metadata: { scale } }).then();
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!outUrl) return;
    const a = document.createElement("a");
    a.href = outUrl;
    a.download = `upscaled-${Date.now()}.png`;
    a.click();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-10">
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" /> AI Image Upscaler
          </h1>
          <p className="mt-2 text-muted-foreground">
            Enhance photo detail, sharpen edges and remove noise with AI. Great for old photos, product shots and headshots.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="space-y-4">
            {!srcUrl ? (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0] ?? null); }}
                className="border-2 border-dashed border-border rounded-2xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-surface transition-colors"
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="mt-3 font-medium">Drop an image or click to upload</p>
                <p className="text-sm text-muted-foreground">JPG, PNG or WEBP — up to 8MB</p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { pick(e.target.files?.[0] ?? null); e.target.value = ""; }} />
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-x divide-border">
                  <div className="p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Original</div>
                    <div className="aspect-square bg-surface rounded-lg overflow-hidden flex items-center justify-center">
                      <img src={srcUrl} alt="Original" className="max-h-full max-w-full object-contain" />
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Enhanced</div>
                    <div className="aspect-square bg-surface rounded-lg overflow-hidden flex items-center justify-center relative">
                      {busy && <Loader2 className="h-6 w-6 animate-spin text-primary absolute" />}
                      {outUrl ? (
                        <img src={outUrl} alt="Enhanced" className="max-h-full max-w-full object-contain" />
                      ) : (
                        !busy && <span className="text-xs text-muted-foreground">Click "Enhance" →</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-3 flex items-center justify-between border-t border-border">
                  <span className="text-xs text-muted-foreground truncate">{srcFile?.name}</span>
                  <Button size="sm" variant="ghost" onClick={() => { setSrcFile(null); setSrcUrl(null); setOutUrl(null); }}>
                    <Trash2 className="h-4 w-4 mr-1" /> Reset
                  </Button>
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-5 rounded-2xl border border-border bg-card p-5 h-fit lg:sticky lg:top-20">
            <div>
              <Label>Upscale factor</Label>
              <Select value={scale} onValueChange={(v) => setScale(v as "2" | "4")}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2× (recommended)</SelectItem>
                  <SelectItem value="4">4× (slower)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Custom instruction (optional)</Label>
              <Textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. restore old photo, remove scratches" className="mt-1.5" />
            </div>
            <Button className="w-full" disabled={!srcUrl || busy} onClick={run}>
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enhancing…</> : <><Sparkles className="h-4 w-4 mr-2" />Enhance image</>}
            </Button>
            <Button className="w-full" variant="outline" disabled={!outUrl} onClick={download}>
              <Download className="h-4 w-4 mr-2" /> Download result
            </Button>
            <p className="text-xs text-muted-foreground">
              Powered by Lovable AI. Rate limits and quality depend on model availability.
            </p>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
