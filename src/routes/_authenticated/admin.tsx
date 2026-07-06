import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Shield, Users, FileText, Settings as SettingsIcon, DollarSign, Loader2, Home, Wrench, Megaphone, BarChart3, Plus, Trash2, ExternalLink, LayoutDashboard, ChevronRight, type LucideIcon } from "lucide-react";
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

type SectionKey =
  | "dashboard"
  | "homepage"
  | "tools"
  | "features"
  | "content"
  | "users"
  | "integrations"
  | "adsense"
  | "settings";

type SectionDef = { key: SectionKey; label: string; icon: LucideIcon; desc: string };

const SECTION_GROUPS: { label: string; items: SectionDef[] }[] = [
  {
    label: "Overview",
    items: [
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "At a glance" },
    ],
  },
  {
    label: "Content",
    items: [
      { key: "homepage", label: "Homepage", icon: Home, desc: "Branding, hero banner and CTAs" },
      { key: "tools", label: "Tools", icon: Wrench, desc: "Tiles shown on the homepage grid" },
      { key: "features", label: "Features", icon: Megaphone, desc: "Three feature highlights" },
      { key: "content", label: "Pages", icon: FileText, desc: "About, Privacy, Terms…" },
    ],
  },
  {
    label: "People",
    items: [
      { key: "users", label: "Users", icon: Users, desc: "Manage roles and accounts" },
    ],
  },
  {
    label: "Integrations",
    items: [
      { key: "integrations", label: "SEO & Analytics", icon: BarChart3, desc: "GA4 + Search Console" },
      { key: "adsense", label: "AdSense", icon: DollarSign, desc: "Publisher ID and ad slots" },
    ],
  },
  {
    label: "System",
    items: [
      { key: "settings", label: "Limits & Settings", icon: SettingsIcon, desc: "Per-tool usage caps" },
    ],
  },
];

const ALL_SECTIONS: SectionDef[] = SECTION_GROUPS.flatMap((g) => g.items);

function AdminPage() {
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin();
  const [active, setActive] = useState<SectionKey>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  if (roleLoading) {
    return <Shell active="dashboard" setActive={setActive} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}>
      <div className="text-muted-foreground">Checking permissions…</div>
    </Shell>;
  }

  if (!isAdmin) {
    return (
      <Shell active="dashboard" setActive={setActive} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} hideSidebar>
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

  const current = ALL_SECTIONS.find((s) => s.key === active) ?? ALL_SECTIONS[0];

  return (
    <Shell active={active} setActive={setActive} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}>
      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
          <span>Admin</span>
          <ChevronRight className="h-3 w-3" />
          <span>{current.label}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{current.label}</h2>
            <p className="text-sm text-muted-foreground">{current.desc}</p>
          </div>
        </div>
      </div>

      {active === "dashboard" && <DashboardTab setActive={setActive} />}
      {active === "homepage" && <HomepageTab />}
      {active === "tools" && <ToolsTab />}
      {active === "features" && <FeaturesTab />}
      {active === "integrations" && <IntegrationsTab />}
      {active === "users" && <UsersTab />}
      {active === "content" && <ContentTab />}
      {active === "settings" && <SettingsTab />}
      {active === "adsense" && <AdSenseTab />}
    </Shell>
  );
}

function Shell({
  children,
  active,
  setActive,
  mobileOpen,
  setMobileOpen,
  hideSidebar,
}: {
  children: React.ReactNode;
  active: SectionKey;
  setActive: (k: SectionKey) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  hideSidebar?: boolean;
}) {
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top admin bar */}
      <header className="sticky top-0 z-30 h-14 border-b border-border/70 bg-[oklch(0.22_0.03_270)] text-white/90 flex items-center gap-3 px-4">
        <button
          type="button"
          className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle sidebar"
        >
          <LayoutDashboard className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow">
            <Shield className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">{SITE_NAME} · Admin</span>
          <span className="sm:hidden">Admin</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <Link
            to="/"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 hover:bg-white/10"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Visit site
          </Link>
          <Link to="/dashboard" className="rounded-md px-2.5 py-1.5 hover:bg-white/10">
            Account
          </Link>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        {!hideSidebar && (
          <>
            <aside
              className={`fixed inset-y-14 left-0 z-20 w-64 shrink-0 bg-[oklch(0.24_0.03_270)] text-white/85 overflow-y-auto transition-transform lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:translate-x-0 ${
                mobileOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <nav className="p-3 space-y-5">
                {SECTION_GROUPS.map((group) => (
                  <div key={group.label}>
                    <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                      {group.label}
                    </div>
                    <div className="space-y-0.5">
                      {group.items.map((s) => {
                        const Icon = s.icon;
                        const isActive = active === s.key;
                        return (
                          <button
                            key={s.key}
                            onClick={() => { setActive(s.key); setMobileOpen(false); }}
                            className={`w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-left transition-colors ${
                              isActive
                                ? "bg-white/15 text-white shadow-inner"
                                : "text-white/75 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{s.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </aside>
            {mobileOpen && (
              <button
                type="button"
                aria-label="Close menu"
                className="fixed inset-0 top-14 z-10 bg-black/40 lg:hidden"
                onClick={() => setMobileOpen(false)}
              />
            )}
          </>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

function DashboardTab({ setActive }: { setActive: (k: SectionKey) => void }) {
  const stats = useDashboardStats();
  const cards: { key: SectionKey; label: string; value: string | number; icon: LucideIcon; hint: string }[] = [
    { key: "users", label: "Users", value: stats.users ?? "—", icon: Users, hint: "Registered accounts" },
    { key: "tools", label: "Tools live", value: stats.toolsLive ?? "—", icon: Wrench, hint: "Cards visible on home" },
    { key: "content", label: "Pages", value: stats.pages ?? "—", icon: FileText, hint: "Custom page overrides" },
    { key: "integrations", label: "GA4", value: stats.gaConfigured ? "On" : "Off", icon: BarChart3, hint: "Analytics status" },
  ];

  const shortcuts = ALL_SECTIONS.filter((s) => s.key !== "dashboard");

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              onClick={() => setActive(c.key)}
              className="text-left rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-1 text-2xl font-bold">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.hint}</div>
            </button>
          );
        })}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Manage</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className="text-left group rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{s.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.desc}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-foreground" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function useDashboardStats() {
  const users = useQuery({
    queryKey: ["admin-stats-users"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      return count ?? 0;
    },
  });
  const tools = useQuery({
    queryKey: ["cms", "homepage_tools"],
    queryFn: () => loadSetting<ToolCard[]>("homepage_tools", DEFAULT_TOOLS),
  });
  const pages = useQuery({
    queryKey: ["admin-stats-pages"],
    queryFn: async () => {
      const { count } = await supabase.from("page_content").select("slug", { count: "exact", head: true });
      return count ?? 0;
    },
  });
  const integ = useQuery({
    queryKey: ["cms", "integrations"],
    queryFn: () => loadSetting<Integrations>("integrations", DEFAULT_INTEGRATIONS),
  });

  return {
    users: users.data,
    toolsLive: (tools.data ?? []).filter((t) => t.live).length,
    pages: pages.data,
    gaConfigured: Boolean(integ.data?.ga_measurement_id),
  };
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
