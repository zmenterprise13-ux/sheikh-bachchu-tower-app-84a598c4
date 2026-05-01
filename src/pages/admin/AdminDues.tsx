import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge, FlatStatus } from "@/components/StatusBadge";
import { Search, CheckCircle2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

type Filter = "all" | FlatStatus;

type Bill = {
  id: string;
  flat_id: string;
  month: string;
  service_charge: number;
  gas_bill: number;
  parking: number;
  eid_bonus: number;
  other_charge: number;
  other_note: string | null;
  total: number;
  paid_amount: number;
  status: FlatStatus;
};

type Flat = {
  id: string;
  flat_no: string;
  owner_name: string | null;
  owner_name_bn: string | null;
  phone: string | null;
};

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function AdminDues() {
  const { t, lang } = useLang();
  const [bills, setBills] = useState<Bill[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Bill | null>(null);
  const month = currentMonth();

  const load = async () => {
    setLoading(true);
    const [billsRes, flatsRes] = await Promise.all([
      supabase
        .from("bills")
        .select("id, flat_id, month, service_charge, gas_bill, parking, eid_bonus, other_charge, other_note, total, paid_amount, status")
        .eq("month", month),
      supabase.from("flats").select("id, flat_no, owner_name, owner_name_bn, phone"),
    ]);
    if (billsRes.error) toast.error(billsRes.error.message);
    if (flatsRes.error) toast.error(flatsRes.error.message);
    setBills((billsRes.data ?? []) as Bill[]);
    setFlats((flatsRes.data ?? []) as Flat[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const visible = bills.filter((b) => {
    const flat = flats.find((f) => f.id === b.flat_id);
    if (!flat) return false;
    if (filter !== "all" && b.status !== filter) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return flat.flat_no.toLowerCase().includes(s)
      || (flat.owner_name ?? "").toLowerCase().includes(s)
      || (flat.owner_name_bn ?? "").includes(q);
  });

  const markPaid = async (b: Bill) => {
    const { error } = await supabase
      .from("bills")
      .update({
        status: "paid",
        paid_amount: Number(b.total),
        paid_at: new Date().toISOString().slice(0, 10),
      })
      .eq("id", b.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(lang === "bn" ? "Paid মার্ক করা হয়েছে" : "Marked as paid");
    setBills((prev) => prev.map((x) => x.id === b.id
      ? { ...x, status: "paid", paid_amount: Number(b.total) }
      : x));
  };

  const filterChips: { key: Filter; label: string }[] = [
    { key: "all",     label: lang === "bn" ? "সব" : "All" },
    { key: "unpaid",  label: t("unpaid") },
    { key: "partial", label: t("partial") },
    { key: "paid",    label: t("paid") },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("dues")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "bn" ? "এ মাসের ফ্ল্যাট ভিত্তিক বিল" : "This month's flat-wise bills"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex flex-wrap gap-1.5">
            {filterChips.map((c) => (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-base border",
                  filter === c.key
                    ? "gradient-primary text-primary-foreground border-transparent shadow-soft"
                    : "bg-card text-muted-foreground border-border hover:text-foreground"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={lang === "bn" ? "ফ্ল্যাট/নাম..." : "Flat/name..."} className="pl-9" />
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 text-xs font-semibold text-muted-foreground uppercase border-b border-border bg-secondary/40">
            <div className="col-span-1">{t("flatNo")}</div>
            <div className="col-span-3">{t("ownerName")}</div>
            <div className="col-span-2 text-right">{t("serviceCharge")}</div>
            <div className="col-span-2 text-right">{t("gasBill")}+{t("parking")}</div>
            <div className="col-span-2 text-right">{t("total")}</div>
            <div className="col-span-2 text-right">{t("action")}</div>
          </div>

          <div className="divide-y divide-border">
            {loading && (
              <div className="p-5 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            )}
            {!loading && visible.map((b) => {
              const flat = flats.find((f) => f.id === b.flat_id)!;
              const due = Number(b.total) - Number(b.paid_amount);
              return (
                <div key={b.id} className="grid grid-cols-2 md:grid-cols-12 gap-3 px-5 py-3 items-center hover:bg-secondary/40 transition-base">
                  <div className="md:col-span-1 font-bold text-primary">{flat.flat_no}</div>
                  <div className="md:col-span-3 min-w-0">
                    <div className="font-medium text-foreground truncate">{(lang === "bn" ? flat.owner_name_bn : flat.owner_name) || "—"}</div>
                    <div className="text-xs text-muted-foreground">{flat.phone || ""}</div>
                  </div>
                  <div className="md:col-span-2 md:text-right text-sm">{formatMoney(Number(b.service_charge), lang)}</div>
                  <div className="md:col-span-2 md:text-right text-sm">{formatMoney(Number(b.gas_bill) + Number(b.parking), lang)}</div>
                  <div className="md:col-span-2 md:text-right">
                    <div className="font-bold text-foreground">{formatMoney(Number(b.total), lang)}</div>
                    {due > 0 && <div className="text-xs text-destructive">{t("due")}: {formatMoney(due, lang)}</div>}
                  </div>
                  <div className="md:col-span-2 flex items-center justify-end gap-2 col-span-2">
                    <StatusBadge status={b.status} />
                    {b.status !== "paid" && (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => markPaid(b)}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t("markPaid")}</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {!loading && visible.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">{t("noData")}</div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
