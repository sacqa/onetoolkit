import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Shield, Users, FileText, Settings as SettingsIcon, DollarSign, Loader2, Home, Wrench, Megaphone, BarChart3, Plus, Trash2, type LucideIcon } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-role";
import { updateUserRole } from "@/lib/admin.functions";
import {
  DEFAULT_ADSENSE, DEFAULT_LIMITS, getSetting, setSetting,
  type AdSenseSettings, type LimitsSettings,
} from "@/lib/app-settings";
import {
  DEFAULT_BRANDING, DEFAULT_FEATURES, DEFAULT_HERO, DEFAULT_INTEGRATIONS, DEFAULT_TOOLS,
  loadSetting, saveSetting,
  type FeatureItem, type HeroContent, type Integrations, type SiteBranding, type ToolCard,
} from "@/lib/homepage-content";
import { SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: `Admin — ${SITE_NAME}` },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

type SectionKey = "homepage" | "tools" | "features" | "integrations" | "users" | "content" | "settings" | "adsense";

const SECTIONS: { key: SectionKey; label: string; icon: LucideIcon; desc: string }[] = [
  { key: "homepage", label: "Homepage", icon: Home, desc: "Branding, hero banner and CTAs" },
  { key: "tools", label: "Tool cards", icon: Wrench, desc: "Tiles shown on the homepage grid" },
  { key: "features", label: "Features", icon: Megaphone, desc: "Three feature highlights" },
  { key: "integrations", label: "SEO & Analytics", icon: BarChart3, desc: "GA4 + Search Console" },
  { key: "users", label: "Users", icon: Users, desc: "Manage roles and accounts" },
  { key: "content", label: "Pages", icon: FileText, desc: "About, Privacy, Terms…" },
  { key: "settings", label: "Limits", icon: SettingsIcon, desc: "Per-tool usage caps" },
  { key: "adsense", label: "AdSense", icon: DollarSign, desc: "Publisher ID and ad slots" },
];

function AdminPage() {
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin();
  const [active, setActive] = useState<SectionKey>("homepage");

  if (roleLoading) {
    return <Shell><div className="text-muted-foreground">Checking permissions…</div></Shell>;
  }

  if (!isAdmin) {
    return (
      <Shell>
        <div className="max-w-md rounded-2xl border border-border bg-card p-6">
          <Shield className="h-6 w-6 text-primary mb-3" />
          <h2 className="font-semibold">Admin access required</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This area is restricted to administrators. Please contact an existing admin to be granted access.
          </p>
        </div>
      </Shell>
    );
  }

  const current = SECTIONS.find((s) => s.key === active)!;

  return (
    <Shell>
      <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-20 self-start">
          <nav className="rounded-2xl border border-border bg-card p-2 space-y-0.5">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const isActive = active === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setActive(s.key)}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-left transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground/80 hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{s.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <section className="min-w-0">
          <div className="mb-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              <span>Admin</span>
              <span>›</span>
              <span>{current.label}</span>
            </div>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">{current.label}</h2>
            <p className="text-sm text-muted-foreground">{current.desc}</p>
          </div>

          {active === "homepage" && <HomepageTab />}
          {active === "tools" && <ToolsTab />}
          {active === "features" && <FeaturesTab />}
          {active === "integrations" && <IntegrationsTab />}
          {active === "users" && <UsersTab />}
          {active === "content" && <ContentTab />}
          {active === "settings" && <SettingsTab />}
          {active === "adsense" && <AdSenseTab />}
        </section>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <SiteHeader />
      <main className="flex-1 container-page py-8 sm:py-10">
        <div className="flex items-center gap-3 mb-8">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-md">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin dashboard</h1>
            <p className="text-sm text-muted-foreground">Everything you need to run One Tool Kit.</p>
          </div>
        </div>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

/* -------- Users -------- */
function UsersTab() {
  const qc = useQueryClient();
  const updateRole = useServerFn(updateUserRole);
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name, created_at, plan").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      const roles = new Map((rolesRes.data ?? []).map((r) => [r.user_id, r.role]));
      return (profilesRes.data ?? []).map((p) => ({ ...p, role: roles.get(p.id) ?? "user" }));
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: "admin" | "user" }) => {
      await updateRole({ data: { id, role } });
    },
    onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading users…</div>;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="grid grid-cols-[1fr,1fr,auto,auto] gap-3 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground border-b border-border">
        <div>Name</div>
        <div className="hidden sm:block">Email</div>
        <div>Role</div>
        <div></div>
      </div>
      {users?.map((u) => (
        <div key={u.id} className="grid grid-cols-[1fr,1fr,auto,auto] items-center gap-3 px-4 py-3 border-b border-border/60 last:border-0">
          <div className="text-sm font-medium truncate">{u.full_name ?? "—"}</div>
          <div className="text-sm text-muted-foreground truncate hidden sm:block">{u.email}</div>
          <div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
              {u.role}
            </span>
          </div>
          <div>
            <Select
              value={u.role}
              onValueChange={(v) => setRole.mutate({ id: u.id, role: v as "admin" | "user" })}
            >
              <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">user</SelectItem>
                <SelectItem value="admin">admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------- Content -------- */
const PAGE_SLUGS = ["about", "contact", "privacy", "terms", "cookies"] as const;

function ContentTab() {
  const [slug, setSlug] = useState<(typeof PAGE_SLUGS)[number]>("about");
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["page-content", slug],
    queryFn: async () => {
      const { data } = await supabase.from("page_content").select("*").eq("slug", slug).maybeSingle();
      return data ?? { slug, title: "", description: "", body: "", faq: [] };
    },
  });

  const [draft, setDraft] = useState({ title: "", description: "", body: "" });
  useEffect(() => {
    if (data) setDraft({ title: data.title ?? "", description: data.description ?? "", body: data.body ?? "" });
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("page_content").upsert({
        slug,
        title: draft.title,
        description: draft.description,
        body: draft.body,
        updated_at: new Date().toISOString(),
      }, { onConflict: "slug" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(`/${slug} saved`); qc.invalidateQueries({ queryKey: ["page-content", slug] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Page</Label>
          <Select value={slug} onValueChange={(v) => setSlug(v as typeof slug)}>
            <SelectTrigger className="mt-1.5 w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SLUGS.map((s) => <SelectItem key={s} value={s}>/{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending || isLoading}>
          {save.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save page
        </Button>
        <span className="text-xs text-muted-foreground">Body supports Markdown.</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <Label>Title (used as &lt;title&gt; and H1)</Label>
            <Input className="mt-1.5" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
          </div>
          <div>
            <Label>Meta description</Label>
            <Textarea className="mt-1.5" rows={2} value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
          </div>
          <div>
            <Label>Body (Markdown)</Label>
            <Textarea className="mt-1.5 font-mono text-sm" rows={18} value={draft.body} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <Label>Preview</Label>
          <article className="prose prose-slate dark:prose-invert max-w-none mt-3">
            <h1>{draft.title || "Untitled"}</h1>
            <ReactMarkdown>{draft.body || "_No content yet._"}</ReactMarkdown>
          </article>
        </div>
      </div>
    </div>
  );
}

/* -------- Settings -------- */
function SettingsTab() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings-limits"],
    queryFn: () => getSetting<LimitsSettings>("limits", DEFAULT_LIMITS),
  });
  const [draft, setDraft] = useState<LimitsSettings>(DEFAULT_LIMITS);
  useEffect(() => { if (data) setDraft(data); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await setSetting("limits", draft);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Limits saved"); qc.invalidateQueries({ queryKey: ["settings-limits"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-xl rounded-2xl border border-border bg-card p-6 space-y-4">
      <h2 className="font-semibold">Tool limits</h2>
      <div>
        <Label>Daily AI upscale limit (per user)</Label>
        <Input type="number" min={0} className="mt-1.5" value={draft.daily_upscale_limit}
          onChange={(e) => setDraft({ ...draft, daily_upscale_limit: Number(e.target.value) })} />
      </div>
      <div>
        <Label>Max upload size (MB)</Label>
        <Input type="number" min={1} className="mt-1.5" value={draft.max_file_mb}
          onChange={(e) => setDraft({ ...draft, max_file_mb: Number(e.target.value) })} />
      </div>
      <div>
        <Label>File auto-delete after (minutes)</Label>
        <Input type="number" min={5} className="mt-1.5" value={draft.file_ttl_minutes}
          onChange={(e) => setDraft({ ...draft, file_ttl_minutes: Number(e.target.value) })} />
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
      </Button>
    </div>
  );
}

/* -------- AdSense -------- */
function AdSenseTab() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings-adsense"],
    queryFn: () => getSetting<AdSenseSettings>("adsense", DEFAULT_ADSENSE),
  });
  const [draft, setDraft] = useState<AdSenseSettings>(DEFAULT_ADSENSE);
  useEffect(() => { if (data) setDraft(data); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await setSetting("adsense", draft);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("AdSense settings saved"); qc.invalidateQueries({ queryKey: ["settings-adsense"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const adsTxt = useMemo(() => {
    if (!draft.publisher_id) return "# Set Publisher ID to generate ads.txt content";
    const pub = draft.publisher_id.replace(/^ca-/, "");
    return `google.com, ${pub}, DIRECT, f08c47fec0942fa0`;
  }, [draft.publisher_id]);

  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Google AdSense</h2>
            <p className="text-sm text-muted-foreground">Ads are only loaded after cookie consent is granted.</p>
          </div>
          <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
        </div>
        <div>
          <Label>Publisher ID (e.g. ca-pub-1234567890123456)</Label>
          <Input className="mt-1.5" value={draft.publisher_id}
            onChange={(e) => setDraft({ ...draft, publisher_id: e.target.value })} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Header slot ID</Label>
            <Input className="mt-1.5" value={draft.slot_header} onChange={(e) => setDraft({ ...draft, slot_header: e.target.value })} />
          </div>
          <div>
            <Label>In-content slot ID</Label>
            <Input className="mt-1.5" value={draft.slot_in_content} onChange={(e) => setDraft({ ...draft, slot_in_content: e.target.value })} />
          </div>
          <div>
            <Label>Sidebar slot ID</Label>
            <Input className="mt-1.5" value={draft.slot_sidebar} onChange={(e) => setDraft({ ...draft, slot_sidebar: e.target.value })} />
          </div>
          <div>
            <Label>Footer slot ID</Label>
            <Input className="mt-1.5" value={draft.slot_footer} onChange={(e) => setDraft({ ...draft, slot_footer: e.target.value })} />
          </div>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold">ads.txt</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Copy this into <a href="/ads.txt" className="underline">/ads.txt</a> on your host once your publisher ID is set.
        </p>
        <pre className="mt-3 rounded-lg bg-surface border border-border/60 p-3 text-xs overflow-x-auto">{adsTxt}</pre>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Homepage / Branding / Hero                                          */
/* ------------------------------------------------------------------ */

function useCmsSetting<T>(key: string, fallback: T) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["cms", key],
    queryFn: () => loadSetting<T>(key, fallback),
  });
  const m = useMutation({
    mutationFn: async (value: T) => {
      const { error } = await saveSetting(key, value);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["cms", key] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return { data: q.data ?? fallback, isLoading: q.isLoading, save: m };
}

function HomepageTab() {
  const hero = useCmsSetting<HeroContent>("homepage_hero", DEFAULT_HERO);
  const brand = useCmsSetting<SiteBranding>("site_branding", DEFAULT_BRANDING);
  const [h, setH] = useState<HeroContent>(hero.data);
  const [b, setB] = useState<SiteBranding>(brand.data);
  useEffect(() => setH(hero.data), [hero.data]);
  useEffect(() => setB(brand.data), [brand.data]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Site branding</h2>
        <Field label="Site name" value={b.site_name} onChange={(v) => setB({ ...b, site_name: v })} />
        <Field label="Tagline" value={b.tagline} onChange={(v) => setB({ ...b, tagline: v })} />
        <Field label="Meta description" value={b.description} onChange={(v) => setB({ ...b, description: v })} textarea />
        <Field label="Footer tagline" value={b.footer_text} onChange={(v) => setB({ ...b, footer_text: v })} textarea />
        <Button onClick={() => brand.save.mutate(b)} disabled={brand.save.isPending}>
          {brand.save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save branding
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Hero banner</h2>
        <Field label="Badge" value={h.badge} onChange={(v) => setH({ ...h, badge: v })} />
        <Field label="Title" value={h.title} onChange={(v) => setH({ ...h, title: v })} textarea />
        <Field label="Subtitle" value={h.subtitle} onChange={(v) => setH({ ...h, subtitle: v })} textarea />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Primary CTA label" value={h.cta_primary_label} onChange={(v) => setH({ ...h, cta_primary_label: v })} />
          <Field label="Primary CTA link" value={h.cta_primary_href} onChange={(v) => setH({ ...h, cta_primary_href: v })} />
          <Field label="Secondary CTA label" value={h.cta_secondary_label} onChange={(v) => setH({ ...h, cta_secondary_label: v })} />
          <Field label="Secondary CTA link" value={h.cta_secondary_href} onChange={(v) => setH({ ...h, cta_secondary_href: v })} />
        </div>
        <Button onClick={() => hero.save.mutate(h)} disabled={hero.save.isPending}>
          {hero.save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save hero
        </Button>
      </div>
    </div>
  );
}

function ToolsTab() {
  const { data, save } = useCmsSetting<ToolCard[]>("homepage_tools", DEFAULT_TOOLS);
  const [items, setItems] = useState<ToolCard[]>(data);
  useEffect(() => setItems(data), [data]);

  const update = (i: number, patch: Partial<ToolCard>) =>
    setItems(items.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Tool cards ({items.length})</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setItems([
                ...items,
                { slug: `new-${Date.now()}`, name: "New tool", blurb: "Describe this tool.", category: "Other", href: "/", icon: "Star", live: false, order: items.length + 1 },
              ])
            }
          >
            <Plus className="h-4 w-4 mr-1" />Add
          </Button>
          <Button size="sm" onClick={() => save.mutate(items)} disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save all
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        {items.map((t, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 grid gap-3 md:grid-cols-12 items-end">
            <Field className="md:col-span-3" label="Name" value={t.name} onChange={(v) => update(i, { name: v })} />
            <Field className="md:col-span-4" label="Blurb" value={t.blurb} onChange={(v) => update(i, { blurb: v })} />
            <Field className="md:col-span-2" label="Category" value={t.category} onChange={(v) => update(i, { category: v })} />
            <Field className="md:col-span-2" label="Href" value={t.href} onChange={(v) => update(i, { href: v })} />
            <Field className="md:col-span-1" label="Icon" value={t.icon} onChange={(v) => update(i, { icon: v })} />
            <div className="md:col-span-12 flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={t.live} onCheckedChange={(v) => update(i, { live: v })} /> Live
              </label>
              <label className="flex items-center gap-2 text-sm">
                Order
                <Input
                  type="number"
                  value={t.order}
                  onChange={(e) => update(i, { order: Number(e.target.value) })}
                  className="w-20"
                />
              </label>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-destructive"
                onClick={() => setItems(items.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4 mr-1" />Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturesTab() {
  const { data, save } = useCmsSetting<FeatureItem[]>("homepage_features", DEFAULT_FEATURES);
  const [items, setItems] = useState<FeatureItem[]>(data);
  useEffect(() => setItems(data), [data]);
  const update = (i: number, patch: Partial<FeatureItem>) =>
    setItems(items.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Feature highlights</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setItems([...items, { icon: "Star", title: "New", body: "Describe." }])}>
            <Plus className="h-4 w-4 mr-1" />Add
          </Button>
          <Button size="sm" onClick={() => save.mutate(items)} disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save all
          </Button>
        </div>
      </div>
      <div className="grid gap-3">
        {items.map((f, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 grid gap-3 md:grid-cols-12 items-end">
            <Field className="md:col-span-2" label="Icon" value={f.icon} onChange={(v) => update(i, { icon: v })} />
            <Field className="md:col-span-3" label="Title" value={f.title} onChange={(v) => update(i, { title: v })} />
            <Field className="md:col-span-6" label="Body" value={f.body} onChange={(v) => update(i, { body: v })} textarea />
            <Button size="sm" variant="ghost" className="md:col-span-1 text-destructive" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function IntegrationsTab() {
  const { data, save } = useCmsSetting<Integrations>("integrations", DEFAULT_INTEGRATIONS);
  const [v, setV] = useState<Integrations>(data);
  useEffect(() => setV(data), [data]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div>
          <h2 className="font-semibold">Google Analytics 4</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste your Measurement ID (e.g. <code className="text-xs">G-XXXXXXXXXX</code>). GA only loads after a visitor accepts cookies.
          </p>
        </div>
        <Field label="GA4 Measurement ID" value={v.ga_measurement_id} onChange={(x) => setV({ ...v, ga_measurement_id: x })} placeholder="G-XXXXXXXXXX" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div>
          <h2 className="font-semibold">Google Search Console</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste the <code className="text-xs">content</code> value from Google's HTML-tag verification method.
          </p>
        </div>
        <Field label="Verification token" value={v.gsc_verification} onChange={(x) => setV({ ...v, gsc_verification: x })} placeholder="abc123…" />
        <p className="text-xs text-muted-foreground">
          Sitemap: <a href="/sitemap.xml" className="underline">/sitemap.xml</a> · Robots: <a href="/robots.txt" className="underline">/robots.txt</a>
        </p>
      </div>

      <div className="lg:col-span-2">
        <Button onClick={() => save.mutate(v)} disabled={save.isPending}>
          {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save integrations
        </Button>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, textarea, placeholder, className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {textarea ? (
        <Textarea className="mt-1.5" rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <Input className="mt-1.5" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}
