import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Plus, Trash2, Download, Save } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/tools/invoice-generator")({
  head: () => ({
    meta: [
      { title: `Invoice Generator — ${SITE_NAME}` },
      { name: "description", content: "Free invoice generator with live preview, multiple templates and instant PDF download. Create professional invoices in under a minute." },
      { property: "og:title", content: `Invoice Generator — ${SITE_NAME}` },
      { property: "og:description", content: "Create a polished invoice with live preview and one-click PDF export." },
      { property: "og:url", content: "/tools/invoice-generator" },
    ],
    links: [{ rel: "canonical", href: "/tools/invoice-generator" }],
  }),
  component: InvoiceTool,
});

type Item = { description: string; qty: number; price: number; tax: number };
type Template = "minimal" | "modern" | "classic";

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "AUD", "CAD", "CHF", "CNY", "BRL"];

const TEMPLATE_ACCENTS: Record<Template, string> = {
  minimal: "#0b1020",
  modern: "#2563eb",
  classic: "#7c3aed",
};

function InvoiceTool() {
  const { user } = useAuth();
  const [template, setTemplate] = useState<Template>("modern");
  const [number, setNumber] = useState(`INV-${new Date().getFullYear()}-001`);
  const [currency, setCurrency] = useState("USD");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [business, setBusiness] = useState({ name: "Acme Studio", email: "hello@acme.com", address: "123 Main St", phone: "" });
  const [client, setClient] = useState({ name: "Client Co.", email: "billing@client.com", address: "" });
  const [items, setItems] = useState<Item[]>([
    { description: "Website design", qty: 1, price: 1500, tax: 0 },
    { description: "Hosting (1 year)", qty: 1, price: 120, tax: 10 },
  ]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("Thank you for your business!");
  const [saving, setSaving] = useState(false);

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
    const taxTotal = items.reduce((s, i) => s + (i.qty * i.price * i.tax) / 100, 0);
    const total = Math.max(0, subtotal + taxTotal - discount);
    return { subtotal, taxTotal, total };
  }, [items, discount]);

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addItem() { setItems([...items, { description: "", qty: 1, price: 0, tax: 0 }]); }
  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)); }

  const fmt = (n: number) => n.toLocaleString(undefined, { style: "currency", currency });

  function downloadPdf() {
    const accent = TEMPLATE_ACCENTS[template];
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFontSize(22).setTextColor(accent).text("INVOICE", 40, 60);
    doc.setFontSize(10).setTextColor("#111").text(number, 40, 80);

    doc.setFontSize(10).setTextColor("#555");
    doc.text(business.name, 555, 60, { align: "right" });
    doc.text(business.email, 555, 75, { align: "right" });
    if (business.phone) doc.text(business.phone, 555, 90, { align: "right" });

    doc.setTextColor("#111").setFontSize(11).text("Bill to", 40, 130);
    doc.setFontSize(10).setTextColor("#555")
      .text(client.name, 40, 148)
      .text(client.email, 40, 162)
      .text(client.address, 40, 176);

    doc.text(`Issue date: ${issueDate}`, 555, 148, { align: "right" });
    if (dueDate) doc.text(`Due date: ${dueDate}`, 555, 162, { align: "right" });

    autoTable(doc, {
      startY: 210,
      head: [["Description", "Qty", "Price", "Tax %", "Amount"]],
      body: items.map((i) => [
        i.description, String(i.qty), fmt(i.price), `${i.tax}%`,
        fmt(i.qty * i.price * (1 + i.tax / 100)),
      ]),
      headStyles: { fillColor: accent },
      styles: { fontSize: 10 },
    });

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
    doc.setFontSize(10).setTextColor("#555");
    doc.text(`Subtotal: ${fmt(totals.subtotal)}`, 555, finalY, { align: "right" });
    doc.text(`Tax: ${fmt(totals.taxTotal)}`, 555, finalY + 16, { align: "right" });
    if (discount) doc.text(`Discount: -${fmt(discount)}`, 555, finalY + 32, { align: "right" });
    doc.setFontSize(12).setTextColor(accent).text(`Total: ${fmt(totals.total)}`, 555, finalY + 56, { align: "right" });

    if (notes) {
      doc.setFontSize(9).setTextColor("#666").text(notes, 40, finalY + 100, { maxWidth: 400 });
    }

    doc.save(`${number}.pdf`);
    toast.success("Invoice PDF downloaded");
    supabase.from("tool_usage").insert({ tool: "invoice-generator", user_id: user?.id ?? null }).then();
  }

  async function save() {
    if (!user) {
      toast.error("Sign in to save invoices");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("invoices").insert({
      user_id: user.id,
      invoice_number: number,
      currency,
      issue_date: issueDate,
      due_date: dueDate || null,
      template,
      business,
      client,
      line_items: items,
      discount,
      subtotal: totals.subtotal,
      tax_total: totals.taxTotal,
      total: totals.total,
      notes,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Invoice saved to your dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container-page py-10">
          <header className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Invoice Generator</h1>
            <p className="mt-2 text-muted-foreground">
              Build a polished invoice in your browser with live preview. Pick a template, download the PDF, or save it to your dashboard.
            </p>
          </header>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {/* FORM */}
            <div className="space-y-6">
              <section className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-4">Invoice details</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <F label="Invoice #" value={number} onChange={setNumber} />
                  <div>
                    <Label>Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <F label="Issue date" type="date" value={issueDate} onChange={setIssueDate} />
                  <F label="Due date" type="date" value={dueDate} onChange={setDueDate} />
                  <div className="sm:col-span-2">
                    <Label>Template</Label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {(["minimal", "modern", "classic"] as Template[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTemplate(t)}
                          className={`rounded-lg border p-3 text-sm capitalize ${template === t ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
                        >
                          <div className="h-1.5 w-full rounded-full mb-2" style={{ background: TEMPLATE_ACCENTS[t] }} />
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-4">From</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <F label="Business name" value={business.name} onChange={(v) => setBusiness({ ...business, name: v })} />
                  <F label="Email" value={business.email} onChange={(v) => setBusiness({ ...business, email: v })} />
                  <F label="Phone" value={business.phone} onChange={(v) => setBusiness({ ...business, phone: v })} />
                  <F label="Address" value={business.address} onChange={(v) => setBusiness({ ...business, address: v })} />
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-4">Bill to</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <F label="Client name" value={client.name} onChange={(v) => setClient({ ...client, name: v })} />
                  <F label="Email" value={client.email} onChange={(v) => setClient({ ...client, email: v })} />
                  <div className="sm:col-span-2">
                    <F label="Address" value={client.address} onChange={(v) => setClient({ ...client, address: v })} />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Line items</h2>
                  <Button size="sm" variant="outline" onClick={addItem}><Plus className="mr-1.5 h-3.5 w-3.5" />Add row</Button>
                </div>
                <div className="space-y-3">
                  {items.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-12 sm:col-span-5">
                        <Label className="text-xs">Description</Label>
                        <Input value={it.description} onChange={(e) => updateItem(idx, { description: e.target.value })} />
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        <Label className="text-xs">Qty</Label>
                        <Input type="number" min={0} value={it.qty} onChange={(e) => updateItem(idx, { qty: +e.target.value })} />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <Label className="text-xs">Price</Label>
                        <Input type="number" min={0} step="0.01" value={it.price} onChange={(e) => updateItem(idx, { price: +e.target.value })} />
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        <Label className="text-xs">Tax %</Label>
                        <Input type="number" min={0} value={it.tax} onChange={(e) => updateItem(idx, { tax: +e.target.value })} />
                      </div>
                      <div className="col-span-2 sm:col-span-1 flex justify-end">
                        <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive p-2" aria-label="Remove">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid sm:grid-cols-2 gap-3">
                  <F label="Discount" type="number" value={String(discount)} onChange={(v) => setDiscount(+v || 0)} />
                </div>
                <div className="mt-3">
                  <Label>Notes / terms</Label>
                  <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
              </section>

              <div className="flex flex-wrap gap-2">
                <Button onClick={downloadPdf}><Download className="mr-2 h-4 w-4" />Download PDF</Button>
                {user ? (
                  <Button variant="outline" onClick={save} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save to dashboard"}
                  </Button>
                ) : (
                  <Button variant="outline" asChild>
                    <Link to="/auth" search={{ mode: "signup" }}>Sign up to save</Link>
                  </Button>
                )}
              </div>
            </div>

            {/* PREVIEW */}
            <aside className="lg:sticky lg:top-20 h-fit">
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="p-8" style={{ borderTop: `4px solid ${TEMPLATE_ACCENTS[template]}` }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-2xl font-bold" style={{ color: TEMPLATE_ACCENTS[template] }}>INVOICE</div>
                      <div className="text-sm text-muted-foreground mt-1">{number}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium">{business.name}</div>
                      <div className="text-muted-foreground">{business.email}</div>
                      <div className="text-muted-foreground">{business.phone}</div>
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Bill to</div>
                      <div className="text-muted-foreground">{client.name}</div>
                      <div className="text-muted-foreground">{client.email}</div>
                      <div className="text-muted-foreground">{client.address}</div>
                    </div>
                    <div className="text-right">
                      <div>Issue: <span className="text-muted-foreground">{issueDate}</span></div>
                      {dueDate && <div>Due: <span className="text-muted-foreground">{dueDate}</span></div>}
                    </div>
                  </div>

                  <table className="mt-6 w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-border">
                        <th className="py-2">Description</th>
                        <th className="py-2 text-right">Qty</th>
                        <th className="py-2 text-right">Price</th>
                        <th className="py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, i) => (
                        <tr key={i} className="border-b border-border/60">
                          <td className="py-2">{it.description || <span className="text-muted-foreground">—</span>}</td>
                          <td className="py-2 text-right tabular-nums">{it.qty}</td>
                          <td className="py-2 text-right tabular-nums">{fmt(it.price)}</td>
                          <td className="py-2 text-right tabular-nums">{fmt(it.qty * it.price * (1 + it.tax / 100))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-6 ml-auto w-full max-w-xs space-y-1 text-sm">
                    <Row label="Subtotal" value={fmt(totals.subtotal)} />
                    <Row label="Tax" value={fmt(totals.taxTotal)} />
                    {discount > 0 && <Row label="Discount" value={`-${fmt(discount)}`} />}
                    <div className="border-t border-border pt-2 mt-2">
                      <Row label="Total" value={fmt(totals.total)} bold accent={TEMPLATE_ACCENTS[template]} />
                    </div>
                  </div>

                  {notes && <p className="mt-8 text-xs text-muted-foreground border-t border-border pt-4 whitespace-pre-line">{notes}</p>}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function F({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input className="mt-1.5" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: string }) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-semibold" : "text-muted-foreground"}`} style={bold ? { color: accent } : undefined}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
