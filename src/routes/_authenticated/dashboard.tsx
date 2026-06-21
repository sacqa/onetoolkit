import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, QrCode, ArrowUpRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: `Dashboard — ${SITE_NAME}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();

  const { data: invoices, refetch } = useQuery({
    queryKey: ["invoices", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: usage } = useQuery({
    queryKey: ["usage", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tool_usage")
        .select("tool", { count: "exact" });
      if (error) throw error;
      return data;
    },
  });

  const totalRevenue = (invoices ?? [])
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(i.total ?? 0), 0);

  async function del(id: string) {
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Invoice deleted");
    refetch();
  }

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("invoices").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    refetch();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-10">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-muted-foreground">Welcome back, {user.email}.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link to="/tools/qr-code-generator"><QrCode className="mr-2 h-4 w-4" />New QR</Link></Button>
            <Button asChild><Link to="/tools/invoice-generator"><FileText className="mr-2 h-4 w-4" />New invoice</Link></Button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Stat label="Invoices" value={invoices?.length ?? 0} />
          <Stat label="Tool usage events" value={usage?.length ?? 0} />
          <Stat label="Revenue (paid)" value={totalRevenue.toLocaleString(undefined, { style: "currency", currency: "USD" })} />
        </div>

        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent invoices</h2>
          </div>
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {invoices && invoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="text-left p-3">#</th>
                      <th className="text-left p-3">Client</th>
                      <th className="text-left p-3">Issued</th>
                      <th className="text-right p-3">Total</th>
                      <th className="text-left p-3">Status</th>
                      <th className="p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((i) => {
                      const client = (i.client as { name?: string })?.name ?? "—";
                      return (
                        <tr key={i.id} className="border-t border-border">
                          <td className="p-3 font-medium">{i.invoice_number}</td>
                          <td className="p-3">{client}</td>
                          <td className="p-3 text-muted-foreground">{i.issue_date}</td>
                          <td className="p-3 text-right tabular-nums">
                            {Number(i.total).toLocaleString(undefined, { style: "currency", currency: i.currency })}
                          </td>
                          <td className="p-3">
                            <select
                              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                              value={i.status}
                              onChange={(e) => setStatus(i.id, e.target.value)}
                            >
                              <option value="unpaid">Unpaid</option>
                              <option value="paid">Paid</option>
                              <option value="overdue">Overdue</option>
                            </select>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => del(i.id)}
                              className="text-muted-foreground hover:text-destructive"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <p className="text-muted-foreground">No invoices yet.</p>
                <Button asChild className="mt-4">
                  <Link to="/tools/invoice-generator">
                    Create your first invoice <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}
