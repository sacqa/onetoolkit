import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Shield, Users, FileText, Settings as SettingsIcon, DollarSign, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-role";
import { updateUserRole } from "@/lib/admin.functions";
import {
  DEFAULT_ADSENSE, DEFAULT_LIMITS, getSetting, setSetting,
  type AdSenseSettings, type LimitsSettings,
} from "@/lib/app-settings";
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

function AdminPage() {
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin();

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

  return (
    <Shell>
      <Tabs defaultValue="users">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-2" />Users</TabsTrigger>
          <TabsTrigger value="content"><FileText className="h-4 w-4 mr-2" />Content</TabsTrigger>
          <TabsTrigger value="settings"><SettingsIcon className="h-4 w-4 mr-2" />Settings</TabsTrigger>
          <TabsTrigger value="adsense"><DollarSign className="h-4 w-4 mr-2" />AdSense</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-6"><UsersTab /></TabsContent>
        <TabsContent value="content" className="mt-6"><ContentTab /></TabsContent>
        <TabsContent value="settings" className="mt-6"><SettingsTab /></TabsContent>
        <TabsContent value="adsense" className="mt-6"><AdSenseTab /></TabsContent>
      </Tabs>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-10">
        <div className="flex items-center gap-3 mb-8">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin</h1>
            <p className="text-sm text-muted-foreground">Manage users, content, limits and ad slots.</p>
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
          Copy this into <Link to="/ads.txt" className="underline">/ads.txt</Link> on your host once your publisher ID is set.
        </p>
        <pre className="mt-3 rounded-lg bg-surface border border-border/60 p-3 text-xs overflow-x-auto">{adsTxt}</pre>
      </div>
    </div>
  );
}
