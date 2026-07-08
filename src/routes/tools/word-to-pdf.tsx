import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Upload, Download, Loader2, FileType2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/tools/word-to-pdf")({
  head: () => ({
    meta: [
      { title: `Word to PDF — Free DOCX Converter | ${SITE_NAME}` },
      { name: "description", content: "Convert DOCX documents to a clean PDF in your browser. Free, private, no signup required." },
      { property: "og:title", content: `Word to PDF — ${SITE_NAME}` },
      { property: "og:description", content: "DOCX to PDF conversion that runs entirely in your browser." },
    ],
    links: [{ rel: "canonical", href: "/tools/word-to-pdf" }],
  }),
  component: WordToPdfPage,
});

type Paper = "a4" | "letter";

function WordToPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [html, setHtml] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [paper, setPaper] = useState<Paper>("a4");
  const previewRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pick(f: File | null) {
    if (!f) return;
    if (!/\.docx$/i.test(f.name)) {
      toast.error("Please select a .docx file");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      toast.error("File must be under 25MB");
      return;
    }
    setBusy(true);
    setFile(f);
    setHtml("");
    try {
      const mammoth = await import("mammoth");
      const buf = await f.arrayBuffer();
      const { value } = await mammoth.convertToHtml({ arrayBuffer: buf });
      setHtml(value || "<p><em>No text extracted from document.</em></p>");
    } catch (e) {
      toast.error((e as Error).message || "Failed to read document");
      setFile(null);
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    if (!previewRef.current || !file) return;
    setBusy(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);

      const dims = paper === "a4"
        ? { w: 595.28, h: 841.89 } // pts
        : { w: 612, h: 792 };

      const pdf = new jsPDF({ unit: "pt", format: paper });
      const margin = 36; // 0.5in
      const contentW = dims.w - margin * 2;

      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        windowWidth: previewRef.current.scrollWidth,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.9);
      const imgH = (canvas.height * contentW) / canvas.width;
      const pageContentH = dims.h - margin * 2;

      let y = 0;
      let page = 0;
      while (y < imgH) {
        if (page > 0) pdf.addPage();
        // Draw the full-height image but position it so the current slice is visible;
        // clip via addImage's negative y offset trick
        pdf.addImage(imgData, "JPEG", margin, margin - y, contentW, imgH);
        // Cover overflow above/below with white rectangles
        pdf.setFillColor(255, 255, 255);
        if (margin > 0) {
          pdf.rect(0, 0, dims.w, margin, "F"); // top band
          pdf.rect(0, dims.h - margin, dims.w, margin, "F"); // bottom band
          pdf.rect(0, 0, margin, dims.h, "F"); // left band
          pdf.rect(dims.w - margin, 0, margin, dims.h, "F"); // right band
        }
        y += pageContentH;
        page += 1;
        if (page > 200) break; // safety
      }

      pdf.save(file.name.replace(/\.docx$/i, "") + ".pdf");
      toast.success("PDF ready");

      supabase.auth.getUser().then(({ data: u }) => {
        supabase.from("tool_usage").insert({ tool: "word-to-pdf", user_id: u.user?.id ?? null, metadata: { paper } }).then();
      });
    } catch (e) {
      toast.error((e as Error).message || "Failed to export PDF");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-10">
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
            <FileType2 className="h-8 w-8 text-primary" /> Word to PDF
          </h1>
          <p className="mt-2 text-muted-foreground">
            Convert .docx documents to PDF. Everything runs locally in your browser — your file never leaves your device.
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
                <p className="mt-3 font-medium">Drop a .docx file or click to upload</p>
                <p className="text-sm text-muted-foreground">Up to 25MB</p>
                <input ref={fileRef} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden"
                  onChange={(e) => { pick(e.target.files?.[0] ?? null); e.target.value = ""; }} />
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="p-3 flex items-center justify-between border-b border-border">
                  <span className="text-sm font-medium truncate">{file.name}</span>
                  <Button size="sm" variant="ghost" onClick={() => { setFile(null); setHtml(""); }}>
                    <Trash2 className="h-4 w-4 mr-1" /> Reset
                  </Button>
                </div>
                <div className="p-6 bg-white max-h-[70vh] overflow-auto">
                  <div
                    ref={previewRef}
                    className="docx-preview prose prose-slate max-w-none text-slate-900"
                    style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 14, lineHeight: 1.6 }}
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-5 rounded-2xl border border-border bg-card p-5 h-fit lg:sticky lg:top-20">
            <div>
              <Label>Paper size</Label>
              <Select value={paper} onValueChange={(v) => setPaper(v as Paper)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">A4</SelectItem>
                  <SelectItem value="letter">US Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={!file || busy || !html} onClick={download}>
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Working…</> : <><Download className="h-4 w-4 mr-2" />Download PDF</>}
            </Button>
            <p className="text-xs text-muted-foreground">
              Preview shows how the PDF will look. Complex layouts (tables, columns, embedded shapes) may render as a simplified layout.
            </p>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
