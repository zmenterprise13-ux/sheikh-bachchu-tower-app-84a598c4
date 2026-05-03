import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge, FlatStatus } from "@/components/StatusBadge";
import { Search, CheckCircle2, Pencil, ChevronLeft, ChevronRight, Layers, Wallet } from "lucide-react";
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
  arrears: number;
  other_note: string | null;
  other_due_date: string | null;
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

function shiftMonth(m: string, delta: number): string {
  const [y, mm] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mm - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(m: string, lang: "bn" | "en"): string {
  const [y, mm] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mm - 1, 1));
  return d.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", {
    year: "numeric", month: "long", timeZone: "UTC",
  });
}

export default function AdminDues() {
  const { t, lang } = useLang();
  const [bills, setBills] = useState<Bill[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Bill | null>(null);
  const [paying, setPaying] = useState<Bill | null>(null);
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [payAmount, setPayAmount] = useState<string>("");
  const [paySaving, setPaySaving] = useState(false);
  const [month, setMonth] = useState<string>(currentMonth());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkType, setBulkType] = useState<"eid_bonus" | "other_charge">("eid_bonus");
  const [bulkAmount, setBulkAmount] = useState<string>("");
  const [bulkNote, setBulkNote] = useState<string>("");
  const [bulkMode, setBulkMode] = useState<"add" | "set">("add");
  const [bulkScope, setBulkScope] = useState<"all" | "filtered">("all");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkPayOpen, setBulkPayOpen] = useState(false);
  const [bulkPayDate, setBulkPayDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [bulkPayScope, setBulkPayScope] = useState<"all" | "filtered">("filtered");
  const [bulkPaySaving, setBulkPaySaving] = useState(false);

  const load = async (targetMonth: string) => {
    setLoading(true);
    const [billsRes, flatsRes] = await Promise.all([
      supabase
        .from("bills")
        .select("id, flat_id, month, service_charge, gas_bill, parking, eid_bonus, other_charge, arrears, other_note, other_due_date, total, paid_amount, status")
        .eq("month", targetMonth),
      supabase.from("flats").select("id, flat_no, owner_name, owner_name_bn, phone"),
    ]);
    if (billsRes.error) toast.error(billsRes.error.message);
    if (flatsRes.error) toast.error(flatsRes.error.message);
    setBills((billsRes.data ?? []) as Bill[]);
    setFlats((flatsRes.data ?? []) as Flat[]);
    setLoading(false);
  };

  useEffect(() => { load(month); }, [month]);

  const isCurrent = month === currentMonth();

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

  const openPay = (b: Bill) => {
    setPaying(b);
    const due = Number(b.total) - Number(b.paid_amount);
    setPayAmount(String(due > 0 ? due : Number(b.total)));
    setPayDate(new Date().toISOString().slice(0, 10));
  };

  const confirmPay = async () => {
    if (!paying) return;
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(lang === "bn" ? "সঠিক টাকার পরিমাণ দিন" : "Enter a valid amount");
      return;
    }
    if (!payDate) {
      toast.error(lang === "bn" ? "পেমেন্ট তারিখ দিন" : "Pick a payment date");
      return;
    }
    setPaySaving(true);
    const newPaid = Number(paying.paid_amount) + amount;
    const total = Number(paying.total);
    const status: FlatStatus = newPaid >= total ? "paid" : newPaid > 0 ? "partial" : "unpaid";
    const { error } = await supabase
      .from("bills")
      .update({ status, paid_amount: newPaid, paid_at: payDate })
      .eq("id", paying.id);
    setPaySaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "পেমেন্ট রেকর্ড হয়েছে" : "Payment recorded");
    setBills((prev) => prev.map((x) => x.id === paying.id
      ? { ...x, status, paid_amount: newPaid }
      : x));
    setPaying(null);
  };

  const applyBulk = async () => {
    const amount = Number(bulkAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error(lang === "bn" ? "সঠিক টাকার পরিমাণ দিন" : "Enter a valid amount");
      return;
    }
    const targets = bulkScope === "filtered" ? visible : bills;
    if (targets.length === 0) {
      toast.error(lang === "bn" ? "কোনো বিল নেই" : "No bills to update");
      return;
    }
    setBulkSaving(true);

    // For other_charge: pre-compute due date once (today + offset) if any target needs it
    let otherDueDate: string | null = null;
    if (bulkType === "other_charge" && amount > 0) {
      const { data: settings } = await supabase
        .from("billing_settings")
        .select("other_due_offset_days")
        .maybeSingle();
      const offset = Number(settings?.other_due_offset_days ?? 15);
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + offset);
      otherDueDate = d.toISOString().slice(0, 10);
    }

    const updated: Bill[] = [];
    let failed = 0;
    for (const b of targets) {
      const currentVal = Number(b[bulkType] ?? 0);
      const newVal = bulkMode === "add" ? currentVal + amount : amount;
      const patch: {
        eid_bonus?: number;
        other_charge?: number;
        other_note?: string | null;
        other_due_date?: string | null;
      } = { [bulkType]: newVal };
      if (bulkType === "other_charge") {
        if (newVal > 0) {
          patch.other_note = bulkNote || b.other_note || null;
          patch.other_due_date = b.other_due_date ?? otherDueDate;
        } else {
          patch.other_due_date = null;
          patch.other_note = null;
        }
      }
      const { data, error } = await supabase
        .from("bills")
        .update(patch)
        .eq("id", b.id)
        .select("id, flat_id, month, service_charge, gas_bill, parking, eid_bonus, other_charge, arrears, other_note, other_due_date, total, paid_amount, status")
        .single();
      if (error || !data) { failed++; continue; }
      updated.push(data as Bill);
    }
    setBulkSaving(false);

    if (updated.length > 0) {
      setBills((prev) => prev.map((x) => updated.find((u) => u.id === x.id) ?? x));
    }
    if (failed === 0) {
      toast.success(lang === "bn"
        ? `${updated.length} টি বিল আপডেট হয়েছে`
        : `${updated.length} bills updated`);
      setBulkOpen(false);
      setBulkAmount("");
      setBulkNote("");
    } else {
      toast.error(lang === "bn"
        ? `${updated.length} সফল, ${failed} ব্যর্থ`
        : `${updated.length} succeeded, ${failed} failed`);
    }
  };

  const applyBulkPay = async () => {
    if (!bulkPayDate) {
      toast.error(lang === "bn" ? "তারিখ দিন" : "Pick a date");
      return;
    }
    const targets = (bulkPayScope === "filtered" ? visible : bills).filter(
      (b) => Number(b.total) - Number(b.paid_amount) > 0
    );
    if (targets.length === 0) {
      toast.error(lang === "bn" ? "কোনো বকেয়া বিল নেই" : "No unpaid bills");
      return;
    }
    setBulkPaySaving(true);
    const updated: Bill[] = [];
    let failed = 0;
    for (const b of targets) {
      const total = Number(b.total);
      const { data, error } = await supabase
        .from("bills")
        .update({ status: "paid", paid_amount: total, paid_at: bulkPayDate })
        .eq("id", b.id)
        .select("id, flat_id, month, service_charge, gas_bill, parking, eid_bonus, other_charge, arrears, other_note, other_due_date, total, paid_amount, status")
        .single();
      if (error || !data) { failed++; continue; }
      updated.push(data as Bill);
    }
    setBulkPaySaving(false);
    if (updated.length > 0) {
      setBills((prev) => prev.map((x) => updated.find((u) => u.id === x.id) ?? x));
    }
    if (failed === 0) {
      toast.success(lang === "bn"
        ? `${updated.length} টি বিল পরিশোধিত হিসেবে চিহ্নিত হয়েছে`
        : `${updated.length} bills marked paid`);
      setBulkPayOpen(false);
    } else {
      toast.error(lang === "bn"
        ? `${updated.length} সফল, ${failed} ব্যর্থ`
        : `${updated.length} succeeded, ${failed} failed`);
    }
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
            {lang === "bn" ? "নির্বাচিত মাসের ফ্ল্যাট ভিত্তিক বিল" : "Flat-wise bills for selected month"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1 rounded-xl bg-card border border-border p-1 shadow-soft">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              aria-label={lang === "bn" ? "আগের মাস" : "Previous month"}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="month"
              value={month}
              max={currentMonth()}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="h-8 w-[150px] border-0 shadow-none focus-visible:ring-0 px-2"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              disabled={isCurrent}
              aria-label={lang === "bn" ? "পরের মাস" : "Next month"}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isCurrent && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={() => setMonth(currentMonth())}
              >
                {lang === "bn" ? "এ মাস" : "This month"}
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground hidden sm:block">
            {formatMonthLabel(month, lang)}
          </div>

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
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setBulkOpen(true)}
            disabled={loading || bills.length === 0}
          >
            <Layers className="h-3.5 w-3.5" />
            {lang === "bn" ? "বাল্ক অ্যাড" : "Bulk add"}
          </Button>
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
            <div className="col-span-2 text-right">{t("gasBill")}+{t("parking")}+{t("eidBonus")}+{t("otherCharge")}</div>
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
                  <div className="md:col-span-2 md:text-right text-sm">
                    {formatMoney(Number(b.gas_bill) + Number(b.parking) + Number(b.eid_bonus) + Number(b.other_charge) + Number(b.arrears ?? 0), lang)}
                    {(Number(b.eid_bonus) > 0 || Number(b.other_charge) > 0 || Number(b.arrears ?? 0) > 0) && (
                      <div className="text-[10px] text-muted-foreground">
                        {Number(b.arrears ?? 0) > 0 && <span className="text-destructive">{lang === "bn" ? "বাকি" : "Arr"}: {formatMoney(Number(b.arrears), lang)} </span>}
                        {Number(b.eid_bonus) > 0 && <>ঈদ: {formatMoney(Number(b.eid_bonus), lang)} </>}
                        {Number(b.other_charge) > 0 && <>+ {b.other_note || t("otherCharge")}: {formatMoney(Number(b.other_charge), lang)}</>}
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2 md:text-right">
                    <div className="font-bold text-foreground">{formatMoney(Number(b.total), lang)}</div>
                    {due > 0 && <div className="text-xs text-destructive">{t("due")}: {formatMoney(due, lang)}</div>}
                  </div>
                  <div className="md:col-span-2 flex items-center justify-end gap-2 col-span-2">
                    <StatusBadge status={b.status} />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(b)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {b.status !== "paid" && (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => openPay(b)}>
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
      <BillEditDialog
        bill={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setEditing(null);
          setBills((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        }}
      />
      <Dialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {lang === "bn" ? "পেমেন্ট রেকর্ড" : "Record payment"} — {paying?.month}
            </DialogTitle>
          </DialogHeader>
          {paying && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                {t("total")}: <b>{formatMoney(Number(paying.total), lang)}</b>
                {" · "}
                {lang === "bn" ? "পরিশোধিত" : "Paid"}: <b>{formatMoney(Number(paying.paid_amount), lang)}</b>
                {" · "}
                {t("due")}: <b className="text-destructive">{formatMoney(Number(paying.total) - Number(paying.paid_amount), lang)}</b>
              </div>
              <div>
                <Label className="text-xs">{lang === "bn" ? "পেমেন্ট তারিখ" : "Payment date"}</Label>
                <Input type="date" value={payDate} max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setPayDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">{lang === "bn" ? "টাকার পরিমাণ" : "Amount"}</Label>
                <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaying(null)} disabled={paySaving}>{t("cancel")}</Button>
            <Button onClick={confirmPay} disabled={paySaving}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={(o) => !bulkSaving && setBulkOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {lang === "bn" ? "বাল্ক অ্যাড" : "Bulk add"} — {formatMonthLabel(month, lang)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs mb-1.5 block">
                {lang === "bn" ? "চার্জ টাইপ" : "Charge type"}
              </Label>
              <div className="flex gap-2">
                {([
                  { k: "eid_bonus" as const, label: t("eidBonus") },
                  { k: "other_charge" as const, label: t("otherCharge") },
                ]).map((o) => (
                  <button
                    key={o.k}
                    type="button"
                    onClick={() => setBulkType(o.k)}
                    className={cn(
                      "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-base",
                      bulkType === o.k
                        ? "gradient-primary text-primary-foreground border-transparent shadow-soft"
                        : "bg-card text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">
                {lang === "bn" ? "মোড" : "Mode"}
              </Label>
              <div className="flex gap-2">
                {([
                  { k: "add" as const, label: lang === "bn" ? "বিদ্যমান এর সাথে যোগ" : "Add to existing" },
                  { k: "set" as const, label: lang === "bn" ? "নির্দিষ্ট মান সেট" : "Set fixed value" },
                ]).map((o) => (
                  <button
                    key={o.k}
                    type="button"
                    onClick={() => setBulkMode(o.k)}
                    className={cn(
                      "flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-base",
                      bulkMode === o.k
                        ? "border-primary text-primary bg-primary/5"
                        : "bg-card text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">
                {lang === "bn" ? "প্রতি ফ্ল্যাটে টাকার পরিমাণ" : "Amount per flat"}
              </Label>
              <Input
                type="number"
                value={bulkAmount}
                onChange={(e) => setBulkAmount(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </div>

            {bulkType === "other_charge" && (
              <div>
                <Label className="text-xs">{t("otherNote")}</Label>
                <Input
                  value={bulkNote}
                  onChange={(e) => setBulkNote(e.target.value)}
                  placeholder={lang === "bn" ? "যেমন: লিফট মেরামত" : "e.g. Lift repair"}
                />
              </div>
            )}

            <div>
              <Label className="text-xs mb-1.5 block">
                {lang === "bn" ? "প্রযোজ্য" : "Apply to"}
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBulkScope("all")}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-base",
                    bulkScope === "all"
                      ? "border-primary text-primary bg-primary/5"
                      : "bg-card text-muted-foreground border-border hover:text-foreground"
                  )}
                >
                  {lang === "bn" ? `সব ফ্ল্যাট (${bills.length})` : `All flats (${bills.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => setBulkScope("filtered")}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-base",
                    bulkScope === "filtered"
                      ? "border-primary text-primary bg-primary/5"
                      : "bg-card text-muted-foreground border-border hover:text-foreground"
                  )}
                >
                  {lang === "bn" ? `ফিল্টারকৃত (${visible.length})` : `Filtered (${visible.length})`}
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-secondary/40 border border-border px-3 py-2 text-xs text-muted-foreground">
              {lang === "bn"
                ? `${bulkScope === "all" ? bills.length : visible.length} টি বিল-এ ${bulkMode === "add" ? "যোগ" : "সেট"} হবে।`
                : `Will ${bulkMode === "add" ? "add to" : "set on"} ${bulkScope === "all" ? bills.length : visible.length} bills.`}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkSaving}>{t("cancel")}</Button>
            <Button onClick={applyBulk} disabled={bulkSaving}>
              {bulkSaving ? (lang === "bn" ? "চলছে..." : "Applying...") : (lang === "bn" ? "প্রয়োগ করো" : "Apply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AppShell>
  );
}

function BillEditDialog({
  bill,
  onClose,
  onSaved,
}: {
  bill: Bill | null;
  onClose: () => void;
  onSaved: (b: Bill) => void;
}) {
  const { t, lang } = useLang();
  const [form, setForm] = useState<Bill | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(bill); }, [bill]);
  if (!form) return null;

  const set = <K extends keyof Bill>(k: K, v: Bill[K]) =>
    setForm((p) => (p ? { ...p, [k]: v } : p));

  const computedTotal =
    Number(form.service_charge) + Number(form.gas_bill) + Number(form.parking) +
    Number(form.eid_bonus) + Number(form.other_charge) + Number(form.arrears ?? 0);

  const save = async () => {
    setSaving(true);

    // Auto-compute other_due_date when other_charge is set:
    //  - If other_charge > 0 and there is no existing other_due_date,
    //    use today + other_due_offset_days from billing_settings.
    //  - If other_charge becomes 0, clear it.
    let otherDueDate: string | null = form.other_due_date;
    if (Number(form.other_charge) > 0) {
      if (!otherDueDate) {
        const { data: settings } = await supabase
          .from("billing_settings")
          .select("other_due_offset_days")
          .maybeSingle();
        const offset = Number(settings?.other_due_offset_days ?? 15);
        const d = new Date();
        d.setUTCDate(d.getUTCDate() + offset);
        otherDueDate = d.toISOString().slice(0, 10);
      }
    } else {
      otherDueDate = null;
    }

    const { data, error } = await supabase
      .from("bills")
      .update({
        service_charge: form.service_charge,
        gas_bill: form.gas_bill,
        parking: form.parking,
        eid_bonus: form.eid_bonus,
        other_charge: form.other_charge,
        arrears: form.arrears,
        other_note: form.other_note,
        other_due_date: otherDueDate,
      })
      .eq("id", form.id)
      .select("id, flat_id, month, service_charge, gas_bill, parking, eid_bonus, other_charge, arrears, other_note, other_due_date, total, paid_amount, status")
      .single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "সংরক্ষিত" : "Saved");
    onSaved(data as Bill);
  };

  return (
    <Dialog open={!!bill} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("month")}: {form.month}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">{t("serviceCharge")}</Label>
            <Input type="number" value={form.service_charge}
              onChange={(e) => set("service_charge", Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">{t("gasBill")}</Label>
            <Input type="number" value={form.gas_bill}
              onChange={(e) => set("gas_bill", Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">{t("parking")}</Label>
            <Input type="number" value={form.parking}
              onChange={(e) => set("parking", Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">{t("eidBonus")}</Label>
            <Input type="number" value={form.eid_bonus}
              onChange={(e) => set("eid_bonus", Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">{lang === "bn" ? "পূর্বের বাকি" : "Arrears"}</Label>
            <Input type="number" value={form.arrears ?? 0}
              onChange={(e) => set("arrears", Number(e.target.value))} />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">{t("otherCharge")}</Label>
            <Input type="number" value={form.other_charge}
              onChange={(e) => set("other_charge", Number(e.target.value))} />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">{t("otherNote")}</Label>
            <Input value={form.other_note ?? ""}
              onChange={(e) => set("other_note", e.target.value)}
              placeholder={lang === "bn" ? "যেমন: লিফট মেরামত" : "e.g. Lift repair"} />
          </div>
          {Number(form.other_charge) > 0 && form.other_due_date && (
            <div className="col-span-2 text-xs text-muted-foreground">
              {lang === "bn" ? "অন্যান্য আদায়ের ডিউ" : "Other charge due"}: {form.other_due_date}
            </div>
          )}
          {Number(form.other_charge) > 0 && !form.other_due_date && (
            <div className="col-span-2 text-xs text-muted-foreground">
              {lang === "bn"
                ? "ডিউ ডেট সেটিংস অনুযায়ী সেভ করার সময় সেট হবে।"
                : "Due date will be set on save based on Settings."}
            </div>
          )}
          <div className="col-span-2 text-right text-sm">
            {t("total")}: <span className="font-bold">{formatMoney(computedTotal, lang)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>{t("cancel")}</Button>
          <Button onClick={save} disabled={saving}>{t("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
