import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { Download, Sparkles, Upload, RefreshCw, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SITE_NAME } from "@/lib/site";
import { generateCompanyProfile } from "@/lib/company-profile.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tools/company-profile-generator")({
  head: () => ({
    meta: [
      { title: `AI Company Profile Generator — ${SITE_NAME}` },
      { name: "description", content: "Generate a professional, publication-quality company profile with AI. Multiple templates, live editing, and high-quality PDF export." },
      { property: "og:title", content: `AI Company Profile Generator — ${SITE_NAME}` },
      { property: "og:description", content: "Generate professional company profiles with AI. Preview, edit, export high-quality PDF." },
      { property: "og:url", content: "/tools/company-profile-generator" },
    ],
    links: [{ rel: "canonical", href: "/tools/company-profile-generator" }],
  }),
  component: CompanyProfileTool,
});

type ValueItem = { title: string; description: string };
type Product = { name: string; description: string };
type Milestone = { year: string; event: string };
type TeamMember = { name: string; role: string; bio: string };

type ProfileData = {
  tagline: string;
  overview: string;
  mission: string;
  vision: string;
  values: ValueItem[];
  products: Product[];
  history: Milestone[];
  team: TeamMember[];
  achievements: string[];
  targetAudience: string;
  advantages: string[];
  closing: string;
};

type FormInput = {
  companyName: string;
  industry: string;
  overview: string;
  mission: string;
  vision: string;
  values: string;
  products: string;
  history: string;
  team: string;
  achievements: string;
  audience: string;
  advantages: string;
  contact: string;
  socials: string;
  website: string;
  tone: string;
  extra: string;
};

const TEMPLATES = [
  { id: "corporate", name: "Corporate", primary: "#0f3d6e", accent: "#1e88e5", bg: "#ffffff", ink: "#0b1220", muted: "#5b6a7d", font: "'Inter', 'Helvetica Neue', sans-serif" },
  { id: "modern", name: "Modern", primary: "#111827", accent: "#f59e0b", bg: "#fafafa", ink: "#0b1220", muted: "#6b7280", font: "'Inter', sans-serif" },
  { id: "minimal", name: "Minimal", primary: "#111111", accent: "#111111", bg: "#ffffff", ink: "#111111", muted: "#666666", font: "'Georgia', serif" },
  { id: "creative", name: "Creative", primary: "#7c3aed", accent: "#ec4899", bg: "#fdf4ff", ink: "#1a1033", muted: "#6b5b8c", font: "'Poppins', 'Inter', sans-serif" },
  { id: "luxury", name: "Luxury", primary: "#0a0a0a", accent: "#c9a24a", bg: "#0a0a0a", ink: "#f5f2ea", muted: "#a89f88", font: "'Playfair Display', 'Georgia', serif" },
  { id: "startup", name: "Startup", primary: "#059669", accent: "#10b981", bg: "#f0fdf4", ink: "#052e1c", muted: "#3f6b57", font: "'Inter', sans-serif" },
] as const;

type TemplateId = typeof TEMPLATES[number]["id"];

const EMPTY: ProfileData = {
  tagline: "", overview: "", mission: "", vision: "",
  values: [], products: [], history: [], team: [],
  achievements: [], targetAudience: "", advantages: [], closing: "",
};

const DEFAULT_FORM: FormInput = {
  companyName: "", industry: "", overview: "", mission: "", vision: "",
  values: "", products: "", history: "", team: "", achievements: "",
  audience: "", advantages: "", contact: "", socials: "", website: "",
  tone: "Corporate", extra: "",
};

function CompanyProfileTool() {
  const generate = useServerFn(generateCompanyProfile);
  const [form, setForm] = useState<FormInput>(DEFAULT_FORM);
  const [profile, setProfile] = useState<ProfileData>(EMPTY);
  const [templateId, setTemplateId] = useState<TemplateId>("corporate");
  const [logo, setLogo] = useState<string | null>(null);
  const [customPrimary, setCustomPrimary] = useState<string>("");
  const [customAccent, setCustomAccent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [regenSection, setRegenSection] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const pagesRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const template = TEMPLATES.find((t) => t.id === templateId)!;
  const theme = useMemo(() => ({
    ...template,
    primary: customPrimary || template.primary,
    accent: customAccent || template.accent,
  }), [template, customPrimary, customAccent]);

  const set = <K extends keyof FormInput>(k: K, v: FormInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onLogoUpload(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogo(dataUrl);
      // Auto-extract dominant color for theme
      try {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const size = 32;
          canvas.width = size; canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, size, size);
          const { data } = ctx.getImageData(0, 0, size, size);
          let r = 0, g = 0, b = 0, n = 0;
          for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3];
            if (a < 120) continue;
            const rr = data[i], gg = data[i + 1], bb = data[i + 2];
            // skip near-white / near-black
            const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
            if (max > 240 && min > 240) continue;
            if (max < 25) continue;
            r += rr; g += gg; b += bb; n++;
          }
          if (n > 0) {
            const hex = "#" + [r, g, b].map((v) => Math.round(v / n).toString(16).padStart(2, "0")).join("");
            setCustomPrimary(hex);
          }
        };
        img.src = dataUrl;
      } catch {
        /* ignore color extract errors */
      }
    };
    reader.readAsDataURL(file);
  }

  async function onGenerate() {
    if (!form.companyName.trim()) {
      toast.error("Please enter a company name");
      return;
    }
    setLoading(true);
    try {
      const result = await generate({ data: { ...form, section: "all" } }) as Partial<ProfileData>;
      setProfile({
        tagline: result.tagline ?? "",
        overview: result.overview ?? "",
        mission: result.mission ?? "",
        vision: result.vision ?? "",
        values: Array.isArray(result.values) ? result.values : [],
        products: Array.isArray(result.products) ? result.products : [],
        history: Array.isArray(result.history) ? result.history : [],
        team: Array.isArray(result.team) ? result.team : [],
        achievements: Array.isArray(result.achievements) ? result.achievements : [],
        targetAudience: result.targetAudience ?? "",
        advantages: Array.isArray(result.advantages) ? result.advantages : [],
        closing: result.closing ?? "",
      });
      toast.success("Company profile generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate profile");
    } finally {
      setLoading(false);
    }
  }

  async function regenerate(section: keyof ProfileData) {
    setRegenSection(section);
    try {
      const result = await generate({ data: { ...form, section } }) as Partial<ProfileData>;
      setProfile((p) => ({ ...p, [section]: (result as Record<string, unknown>)[section] ?? p[section] } as ProfileData));
      toast.success(`Regenerated ${section}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to regenerate");
    } finally {
      setRegenSection(null);
    }
  }

  async function exportPdf() {
    if (!pagesRef.current) return;
    setExporting(true);
    try {
      const pages = Array.from(pagesRef.current.querySelectorAll<HTMLElement>(".profile-page"));
      if (pages.length === 0) return;
      const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      for (let i = 0; i < pages.length; i++) {
        const el = pages[i];
        const canvas = await html2canvas(el, {
          scale: 2,
          backgroundColor: theme.bg,
          useCORS: true,
          logging: false,
        });
        const img = canvas.toDataURL("image/jpeg", 0.92);
        if (i > 0) pdf.addPage();
        pdf.addImage(img, "JPEG", 0, 0, pageW, pageH, undefined, "FAST");
      }
      const safe = (form.companyName || "company").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      pdf.save(`${safe}-profile.pdf`);
      toast.success("PDF downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to export PDF");
    } finally {
      setExporting(false);
    }
  }

  const hasProfile = profile.overview || profile.mission || profile.values.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">AI Company Profile Generator</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Generate a professional, publication-quality company profile in seconds. Choose a template, edit any section, and export a high-quality PDF.
          </p>
        </div>

        <div className="grid lg:grid-cols-[420px_1fr] gap-6">
          {/* Input panel */}
          <div className="space-y-4">
            <Tabs defaultValue="basics">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="basics">Basics</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="brand">Brand</TabsTrigger>
                <TabsTrigger value="template">Style</TabsTrigger>
              </TabsList>

              <TabsContent value="basics" className="space-y-3 mt-4">
                <FormField label="Company name *">
                  <Input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Acme Inc." />
                </FormField>
                <FormField label="Industry">
                  <Input value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="SaaS, FinTech, Healthcare…" />
                </FormField>
                <FormField label="Website">
                  <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://acme.com" />
                </FormField>
                <FormField label="Contact (email, phone, address)">
                  <Textarea rows={3} value={form.contact} onChange={(e) => set("contact", e.target.value)} placeholder="hello@acme.com&#10;+1 555 000 0000&#10;123 Main St, San Francisco" />
                </FormField>
                <FormField label="Social links">
                  <Textarea rows={2} value={form.socials} onChange={(e) => set("socials", e.target.value)} placeholder="LinkedIn, X, Instagram URLs…" />
                </FormField>
                <FormField label="Tone / style">
                  <Select value={form.tone} onValueChange={(v) => set("tone", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Corporate", "Modern", "Minimal", "Creative", "Luxury", "Startup", "Formal", "Friendly"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </TabsContent>

              <TabsContent value="content" className="space-y-3 mt-4">
                <FormField label="Business overview">
                  <Textarea rows={3} value={form.overview} onChange={(e) => set("overview", e.target.value)} placeholder="What your company does. Leave blank to let AI infer." />
                </FormField>
                <FormField label="Mission">
                  <Textarea rows={2} value={form.mission} onChange={(e) => set("mission", e.target.value)} />
                </FormField>
                <FormField label="Vision">
                  <Textarea rows={2} value={form.vision} onChange={(e) => set("vision", e.target.value)} />
                </FormField>
                <FormField label="Core values">
                  <Textarea rows={2} value={form.values} onChange={(e) => set("values", e.target.value)} placeholder="Integrity, Innovation, Customer-first…" />
                </FormField>
                <FormField label="Products & services">
                  <Textarea rows={3} value={form.products} onChange={(e) => set("products", e.target.value)} />
                </FormField>
                <FormField label="Company history">
                  <Textarea rows={2} value={form.history} onChange={(e) => set("history", e.target.value)} placeholder="Founded 2018, launched X in 2020…" />
                </FormField>
                <FormField label="Team info">
                  <Textarea rows={2} value={form.team} onChange={(e) => set("team", e.target.value)} placeholder="Jane Doe – CEO; John Smith – CTO…" />
                </FormField>
                <FormField label="Achievements">
                  <Textarea rows={2} value={form.achievements} onChange={(e) => set("achievements", e.target.value)} />
                </FormField>
                <FormField label="Target audience">
                  <Textarea rows={2} value={form.audience} onChange={(e) => set("audience", e.target.value)} />
                </FormField>
                <FormField label="Competitive advantages">
                  <Textarea rows={2} value={form.advantages} onChange={(e) => set("advantages", e.target.value)} />
                </FormField>
                <FormField label="Additional requirements / custom sections">
                  <Textarea rows={2} value={form.extra} onChange={(e) => set("extra", e.target.value)} />
                </FormField>
              </TabsContent>

              <TabsContent value="brand" className="space-y-4 mt-4">
                <FormField label="Company logo">
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onLogoUpload(f); }} />
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-md border bg-muted flex items-center justify-center overflow-hidden">
                      {logo ? <img src={logo} alt="logo" className="max-w-full max-h-full object-contain" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" /> {logo ? "Replace logo" : "Upload logo"}
                    </Button>
                    {logo && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setLogo(null)}>Remove</Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">The primary color is auto-extracted from your logo.</p>
                </FormField>
                <FormField label="Primary brand color">
                  <div className="flex gap-2 items-center">
                    <Input type="color" className="h-10 w-16 p-1" value={customPrimary || template.primary} onChange={(e) => setCustomPrimary(e.target.value)} />
                    <Input value={customPrimary} onChange={(e) => setCustomPrimary(e.target.value)} placeholder={template.primary} />
                    {customPrimary && <Button variant="ghost" size="sm" onClick={() => setCustomPrimary("")}>Reset</Button>}
                  </div>
                </FormField>
                <FormField label="Accent color">
                  <div className="flex gap-2 items-center">
                    <Input type="color" className="h-10 w-16 p-1" value={customAccent || template.accent} onChange={(e) => setCustomAccent(e.target.value)} />
                    <Input value={customAccent} onChange={(e) => setCustomAccent(e.target.value)} placeholder={template.accent} />
                    {customAccent && <Button variant="ghost" size="sm" onClick={() => setCustomAccent("")}>Reset</Button>}
                  </div>
                </FormField>
              </TabsContent>

              <TabsContent value="template" className="mt-4">
                <div className="grid grid-cols-2 gap-3">
                  {TEMPLATES.map((t) => (
                    <button key={t.id} type="button" onClick={() => setTemplateId(t.id)} className={cn(
                      "text-left rounded-lg border-2 overflow-hidden transition-all",
                      templateId === t.id ? "border-primary shadow-md" : "border-border hover:border-muted-foreground",
                    )}>
                      <div className="h-20 flex flex-col justify-end p-2" style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.accent})` }}>
                        <span className="text-white text-xs font-semibold">{t.name}</span>
                      </div>
                      <div className="p-2 bg-card">
                        <div className="h-1.5 w-3/4 rounded" style={{ background: t.primary }} />
                        <div className="h-1 w-1/2 rounded mt-1 bg-muted" />
                      </div>
                    </button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            <Button onClick={onGenerate} disabled={loading} className="w-full" size="lg">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate profile with AI</>}
            </Button>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-sm text-muted-foreground">
                {hasProfile ? "Preview — you can edit any text directly" : "Fill in the form and click Generate to see your profile"}
              </div>
              <Button onClick={exportPdf} disabled={!hasProfile || exporting}>
                {exporting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Exporting…</> : <><Download className="w-4 h-4 mr-2" /> Download PDF</>}
              </Button>
            </div>

            <div ref={pagesRef} className="space-y-6 overflow-x-auto">
              {hasProfile ? (
                <ProfilePreview
                  profile={profile}
                  onChange={setProfile}
                  onRegenerate={regenerate}
                  regenSection={regenSection}
                  theme={theme}
                  logo={logo}
                  company={form}
                />
              ) : (
                <EmptyPreview theme={theme} />
              )}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

function EmptyPreview({ theme }: { theme: typeof TEMPLATES[number] }) {
  return (
    <div className="profile-page mx-auto shadow-lg border rounded-md" style={{
      width: 794, minHeight: 1123, background: theme.bg, color: theme.ink, fontFamily: theme.font,
    }}>
      <div className="h-full flex items-center justify-center text-center p-16" style={{ minHeight: 1123 }}>
        <div>
          <div className="text-6xl font-bold" style={{ color: theme.primary }}>Preview</div>
          <p className="mt-4 text-lg" style={{ color: theme.muted }}>Your generated company profile will appear here.</p>
        </div>
      </div>
    </div>
  );
}

type Theme = typeof TEMPLATES[number];

function ProfilePreview({
  profile, onChange, onRegenerate, regenSection, theme, logo, company,
}: {
  profile: ProfileData;
  onChange: (p: ProfileData) => void;
  onRegenerate: (s: keyof ProfileData) => void;
  regenSection: string | null;
  theme: Theme;
  logo: string | null;
  company: FormInput;
}) {
  const upd = <K extends keyof ProfileData>(k: K, v: ProfileData[K]) => onChange({ ...profile, [k]: v });

  const isDark = theme.bg === "#0a0a0a" || theme.ink === "#f5f2ea";

  const pageStyle: React.CSSProperties = {
    width: 794, minHeight: 1123, background: theme.bg, color: theme.ink,
    fontFamily: theme.font, position: "relative", overflow: "hidden",
  };

  return (
    <>
      {/* Page 1: Cover */}
      <div className="profile-page mx-auto shadow-lg rounded-md" style={pageStyle}>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.accent} 100%)`, opacity: isDark ? 1 : 0.06 }} />
        <div style={{ position: "relative", padding: 72, height: 1123, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            {logo && <img src={logo} alt="" style={{ maxHeight: 80, maxWidth: 200, objectFit: "contain" }} />}
          </div>
          <div>
            <div style={{ fontSize: 14, letterSpacing: 3, textTransform: "uppercase", color: isDark ? theme.accent : theme.primary, marginBottom: 12 }}>
              Company Profile
            </div>
            <EditableText value={company.companyName || "Your Company"} onChange={() => {}} readOnly
              style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05, color: isDark ? theme.ink : theme.primary, marginBottom: 20 }} />
            <EditableText value={profile.tagline} onChange={(v) => upd("tagline", v)}
              style={{ fontSize: 20, lineHeight: 1.4, color: isDark ? theme.muted : theme.muted, maxWidth: 550 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: isDark ? theme.muted : theme.muted }}>
            <div>{company.website}</div>
            <div>{new Date().getFullYear()}</div>
          </div>
        </div>
      </div>

      {/* Page 2: TOC + Overview */}
      <div className="profile-page mx-auto shadow-lg rounded-md" style={pageStyle}>
        <div style={{ padding: 60 }}>
          <SectionHeader title="Contents" theme={theme} />
          <ol style={{ fontSize: 15, lineHeight: 2, color: theme.ink, paddingLeft: 20, marginBottom: 40 }}>
            {["Overview", "Mission & Vision", "Core Values", "Products & Services", "Our Journey", "Team", "Achievements", "Target Audience", "Why Choose Us", "Contact"].map((s, i) => (
              <li key={s} style={{ display: "flex", justifyContent: "space-between", listStyle: "none", borderBottom: `1px dotted ${theme.muted}`, paddingBottom: 4 }}>
                <span>{i + 1}. {s}</span>
                <span style={{ color: theme.muted }}>{String(i + 3).padStart(2, "0")}</span>
              </li>
            ))}
          </ol>

          <SectionHeader title="Overview" theme={theme} onRegenerate={() => onRegenerate("overview")} loading={regenSection === "overview"} />
          <EditableText multiline value={profile.overview} onChange={(v) => upd("overview", v)}
            style={{ fontSize: 14.5, lineHeight: 1.7, color: theme.ink, whiteSpace: "pre-wrap" }} />
        </div>
      </div>

      {/* Page 3: Mission, Vision, Values */}
      <div className="profile-page mx-auto shadow-lg rounded-md" style={pageStyle}>
        <div style={{ padding: 60 }}>
          <SectionHeader title="Mission & Vision" theme={theme} onRegenerate={() => onRegenerate("mission")} loading={regenSection === "mission"} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 40 }}>
            <div style={{ padding: 24, borderLeft: `4px solid ${theme.primary}`, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
              <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: theme.accent, marginBottom: 8 }}>Mission</div>
              <EditableText multiline value={profile.mission} onChange={(v) => upd("mission", v)} style={{ fontSize: 14, lineHeight: 1.65 }} />
            </div>
            <div style={{ padding: 24, borderLeft: `4px solid ${theme.accent}`, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
              <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: theme.accent, marginBottom: 8 }}>Vision</div>
              <EditableText multiline value={profile.vision} onChange={(v) => upd("vision", v)} style={{ fontSize: 14, lineHeight: 1.65 }} />
            </div>
          </div>

          <SectionHeader title="Core Values" theme={theme} onRegenerate={() => onRegenerate("values")} loading={regenSection === "values"} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {profile.values.map((v, i) => (
              <div key={i} style={{ padding: 18, borderRadius: 8, background: isDark ? "rgba(255,255,255,0.04)" : "#f7f7f9" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: theme.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, marginBottom: 10 }}>{i + 1}</div>
                <EditableText value={v.title} onChange={(nv) => upd("values", profile.values.map((x, xi) => xi === i ? { ...x, title: nv } : x))}
                  style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }} />
                <EditableText multiline value={v.description} onChange={(nv) => upd("values", profile.values.map((x, xi) => xi === i ? { ...x, description: nv } : x))}
                  style={{ fontSize: 13, lineHeight: 1.5, color: theme.muted }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Page 4: Products & Services */}
      <div className="profile-page mx-auto shadow-lg rounded-md" style={pageStyle}>
        <div style={{ padding: 60 }}>
          <SectionHeader title="Products & Services" theme={theme} onRegenerate={() => onRegenerate("products")} loading={regenSection === "products"} />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {profile.products.map((p, i) => (
              <div key={i} style={{ display: "flex", gap: 20, padding: 20, borderRadius: 8, background: isDark ? "rgba(255,255,255,0.04)" : "#f7f7f9" }}>
                <div style={{ minWidth: 60, height: 60, borderRadius: 12, background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 22 }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div style={{ flex: 1 }}>
                  <EditableText value={p.name} onChange={(nv) => upd("products", profile.products.map((x, xi) => xi === i ? { ...x, name: nv } : x))}
                    style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }} />
                  <EditableText multiline value={p.description} onChange={(nv) => upd("products", profile.products.map((x, xi) => xi === i ? { ...x, description: nv } : x))}
                    style={{ fontSize: 13.5, lineHeight: 1.6, color: theme.muted }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Page 5: History timeline */}
      <div className="profile-page mx-auto shadow-lg rounded-md" style={pageStyle}>
        <div style={{ padding: 60 }}>
          <SectionHeader title="Our Journey" theme={theme} onRegenerate={() => onRegenerate("history")} loading={regenSection === "history"} />
          <div style={{ position: "relative", paddingLeft: 40 }}>
            <div style={{ position: "absolute", left: 12, top: 0, bottom: 0, width: 2, background: theme.primary, opacity: 0.3 }} />
            {profile.history.map((h, i) => (
              <div key={i} style={{ position: "relative", marginBottom: 28 }}>
                <div style={{ position: "absolute", left: -34, top: 4, width: 20, height: 20, borderRadius: "50%", background: theme.primary, border: `4px solid ${theme.bg}` }} />
                <div style={{ fontWeight: 800, fontSize: 20, color: theme.accent, marginBottom: 4 }}>{h.year}</div>
                <EditableText multiline value={h.event} onChange={(nv) => upd("history", profile.history.map((x, xi) => xi === i ? { ...x, event: nv } : x))}
                  style={{ fontSize: 14, lineHeight: 1.6 }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Page 6: Team */}
      <div className="profile-page mx-auto shadow-lg rounded-md" style={pageStyle}>
        <div style={{ padding: 60 }}>
          <SectionHeader title="Our Team" theme={theme} onRegenerate={() => onRegenerate("team")} loading={regenSection === "team"} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {profile.team.map((m, i) => (
              <div key={i} style={{ padding: 20, borderRadius: 10, background: isDark ? "rgba(255,255,255,0.04)" : "#f7f7f9", textAlign: "center" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`, color: "#fff", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700 }}>
                  {(m.name || "?").charAt(0).toUpperCase()}
                </div>
                <EditableText value={m.name} onChange={(nv) => upd("team", profile.team.map((x, xi) => xi === i ? { ...x, name: nv } : x))} style={{ fontWeight: 700, fontSize: 15 }} />
                <EditableText value={m.role} onChange={(nv) => upd("team", profile.team.map((x, xi) => xi === i ? { ...x, role: nv } : x))} style={{ fontSize: 12, color: theme.accent, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }} />
                <EditableText multiline value={m.bio} onChange={(nv) => upd("team", profile.team.map((x, xi) => xi === i ? { ...x, bio: nv } : x))} style={{ fontSize: 12.5, lineHeight: 1.5, color: theme.muted }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Page 7: Achievements + Audience + Advantages */}
      <div className="profile-page mx-auto shadow-lg rounded-md" style={pageStyle}>
        <div style={{ padding: 60 }}>
          <SectionHeader title="Achievements" theme={theme} onRegenerate={() => onRegenerate("achievements")} loading={regenSection === "achievements"} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 36 }}>
            {profile.achievements.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: 14, borderRadius: 8, background: isDark ? "rgba(255,255,255,0.04)" : "#f7f7f9" }}>
                <div style={{ minWidth: 24, height: 24, borderRadius: "50%", background: theme.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>★</div>
                <EditableText multiline value={a} onChange={(nv) => upd("achievements", profile.achievements.map((x, xi) => xi === i ? nv : x))} style={{ fontSize: 13, lineHeight: 1.5, flex: 1 }} />
              </div>
            ))}
          </div>

          <SectionHeader title="Target Audience" theme={theme} onRegenerate={() => onRegenerate("targetAudience")} loading={regenSection === "targetAudience"} />
          <EditableText multiline value={profile.targetAudience} onChange={(v) => upd("targetAudience", v)}
            style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 32 }} />

          <SectionHeader title="Why Choose Us" theme={theme} onRegenerate={() => onRegenerate("advantages")} loading={regenSection === "advantages"} />
          <ul style={{ padding: 0, listStyle: "none", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {profile.advantages.map((a, i) => (
              <li key={i} style={{ display: "flex", gap: 8, fontSize: 13.5, lineHeight: 1.5 }}>
                <span style={{ color: theme.accent, fontWeight: 700 }}>✓</span>
                <EditableText multiline value={a} onChange={(nv) => upd("advantages", profile.advantages.map((x, xi) => xi === i ? nv : x))} style={{ flex: 1 }} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Page 8: Contact */}
      <div className="profile-page mx-auto shadow-lg rounded-md" style={pageStyle}>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`, opacity: isDark ? 1 : 0.08 }} />
        <div style={{ position: "relative", padding: 72, height: 1123, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <SectionHeader title="Let's Work Together" theme={theme} />
          <EditableText multiline value={profile.closing} onChange={(v) => upd("closing", v)} style={{ fontSize: 17, lineHeight: 1.7, marginBottom: 40, maxWidth: 560 }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 20 }}>
            {company.contact && (
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 2, color: theme.accent, marginBottom: 8 }}>Contact</div>
                <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{company.contact}</div>
              </div>
            )}
            {(company.website || company.socials) && (
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 2, color: theme.accent, marginBottom: 8 }}>Online</div>
                <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {company.website && <div>{company.website}</div>}
                  {company.socials && <div>{company.socials}</div>}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 60, paddingTop: 20, borderTop: `1px solid ${theme.muted}`, fontSize: 11, color: theme.muted, textAlign: "center" }}>
            © {new Date().getFullYear()} {company.companyName || "Your Company"}. All rights reserved.
          </div>
        </div>
      </div>
    </>
  );
}

function SectionHeader({ title, theme, onRegenerate, loading }: { title: string; theme: Theme; onRegenerate?: () => void; loading?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <div>
        <div style={{ width: 40, height: 4, background: theme.accent, marginBottom: 10 }} />
        <h2 style={{ fontSize: 28, fontWeight: 800, color: theme.primary, margin: 0, letterSpacing: -0.5 }}>{title}</h2>
      </div>
      {onRegenerate && (
        <button
          type="button"
          data-html2canvas-ignore="true"
          onClick={onRegenerate}
          disabled={loading}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, padding: "6px 10px", borderRadius: 6, border: `1px solid ${theme.muted}`, background: "transparent", color: theme.muted, cursor: "pointer" }}
        >
          {loading ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> : <RefreshCw style={{ width: 12, height: 12 }} />}
          Regenerate
        </button>
      )}
    </div>
  );
}

function EditableText({
  value, onChange, style, multiline, readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  style?: React.CSSProperties;
  multiline?: boolean;
  readOnly?: boolean;
}) {
  const editableStyle: React.CSSProperties = {
    outline: "none",
    ...style,
  };
  return (
    <div
      contentEditable={!readOnly}
      suppressContentEditableWarning
      onBlur={(e) => onChange(e.currentTarget.textContent ?? "")}
      style={editableStyle}
      className={multiline ? "editable-multiline" : undefined}
    >
      {value}
    </div>
  );
}
