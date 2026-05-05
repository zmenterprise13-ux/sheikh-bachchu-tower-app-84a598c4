import { useEffect, useState } from "react";
import { useLang } from "@/i18n/LangContext";
import { formatMoney } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight, Calendar,
  HandCoins, HeartHandshake, Banknote, Landmark, MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { ApprovalBadge, approvalFieldsForInsert } from "@/components/ApprovalBadge";

type Income = {
  id: string;
  date: string;
  category: string;
  amount: number;
  source_name: string | null;
  description: string | null;
  reference: string | null;
  approval_status?: string | null;
  reject_reason?: string | null;
};

const CATEGORIES = [
  { key: "donation", en: "Donation", bn: "অনুদান", icon: HeartHandshake },
  { key: "dues_recovery", en: "Old Dues Recovery", bn: "পাওনা আদায় (পুরনো বকেয়া)", icon: HandCoins },
  { key: "external_rent", en: "Other Rent (non-shop/parking)", bn: "অন্যান্য ভাড়া (দোকান/পার্কিং বহির্ভূত)", icon: Banknote },
  { key: "bank_interest_other", en: "Bank Interest / Others", bn: "ব্যাংক ইন্টারেস্ট / অন্যান্য", icon: Landmark },
] as const;

const catLabel = (key: string, lang: "bn" | "en") => {
  const c = CATEGORIES.find((x) => x.key === key);
  if (!c) return key;
  return lang === "bn" ? c.bn : c.en;
};
const catIcon = (key: string) => CATEGORIES.find((x) => x.key === key)?.icon ?? MoreHorizontal;

export default function OtherIncomeSection() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const [items, setItems] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: CATEGORIES[0].key as string,
    amount: "",
    source_name: "",
    description: "",
    reference: "",
  });

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().slice(0, 10),
      category: CATEGORIES[0].key,
      amount: "",
      source_name: "",
      description: "",
      reference: "",
    });
    setEditingId(null);
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("other_incomes")
      .select("id, date, category, amount, source_name, description, reference")
      .order("date", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as Income[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const total = items.reduce((s, e) => s + Number(e.amount), 0);

  const grouped = items.reduce<Record<string, Income[]>>((acc, e) => {
    const key = (e.date || "").slice(0, 7);
    (acc[key] ||= []).push(e);
    return acc;
  }, {});
  const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const monthLabel = (ym: string) => {
    if (!ym) return "—";
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, (m || 1) - 1, 1).toLocaleDateString(
      lang === "bn" ? "bn-BD" : "en-US",
      { year: "numeric", month: "long" }
    );
  };
  const toggleMonth = (ym: string) =>
    setCollapsedMonths((s) => ({ ...s, [ym]: !s[ym] }));

  const openEdit = (e: Income) => {
    setEditingId(e.id);
    setForm({
      date: e.date,
      category: e.category,
      amount: String(e.amount),
      source_name: e.source_name ?? "",
      description: e.description ?? "",
      reference: e.reference ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0 || !form.category) {
      toast.error(lang === "bn" ? "সঠিক তথ্য দিন" : "Please enter valid details");
      return;
    }
    setSubmitting(true);
    const payload = {
      date: form.date,
      category: form.category,
      amount: amt,
      source_name: form.source_name.trim() || null,
      description: form.description.trim() || null,
      reference: form.reference.trim() || null,
    };
    let error;
    if (editingId) {
      ({ error } = await supabase.from("other_incomes").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase
        .from("other_incomes")
        .insert({ ...payload, created_by: user?.id ?? null }));
    }
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingId
      ? (lang === "bn" ? "আপডেট হয়েছে" : "Updated")
      : (lang === "bn" ? "আয় যোগ হয়েছে" : "Income added"));
    resetForm();
    setOpen(false);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("other_incomes").delete().eq("id", deleteId);
    if (error) toast.error(error.message);
    else { toast.success(lang === "bn" ? "মুছে ফেলা হয়েছে" : "Deleted"); load(); }
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {lang === "bn" ? "অন্যান্য আয়" : "Other Income"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "bn"
              ? "ফ্ল্যাট সার্ভিস চার্জের বাইরে আয় (অনুদান, পাওনা আদায়, অন্যান্য)।"
              : "Income outside flat service charges (donation, dues recovery, others)."}
            {" · "}{t("total")}: <span className="font-bold text-foreground">{formatMoney(total, lang)}</span>
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground gap-2 shadow-elegant">
              <Plus className="h-4 w-4" /> {lang === "bn" ? "আয় যোগ করুন" : "Add Income"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId
                  ? (lang === "bn" ? "আয় এডিট" : "Edit Income")
                  : (lang === "bn" ? "নতুন আয় যোগ" : "Add Income")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("date")}</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("amount")}</Label>
                  <Input type="number" min="0" placeholder="0" value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("category")}</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {lang === "bn" ? c.bn : c.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{lang === "bn" ? "দাতা/উৎসের নাম" : "Source / Donor name"}</Label>
                  <Input value={form.source_name}
                    onChange={(e) => setForm({ ...form, source_name: e.target.value })}
                    placeholder={lang === "bn" ? "যেমন: ফ্ল্যাট ৪বি" : "e.g. Flat 4B"} />
                </div>
                <div className="space-y-1.5">
                  <Label>{lang === "bn" ? "রেফারেন্স/রসিদ নং" : "Reference / Receipt no."}</Label>
                  <Input value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("description")}</Label>
                <Textarea rows={3} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  maxLength={300} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }} disabled={submitting}>
                {t("cancel")}
              </Button>
              <Button className="gradient-primary text-primary-foreground" onClick={submit} disabled={submitting}>
                {submitting ? "..." : t("save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        )}
        {!loading && sortedMonths.length === 0 && (
          <div className="rounded-2xl bg-card border border-border p-12 text-center text-muted-foreground">
            {t("noData")}
          </div>
        )}
        {!loading && sortedMonths.map((ym) => {
          const monthItems = grouped[ym];
          const monthTotal = monthItems.reduce((s, e) => s + Number(e.amount), 0);
          const collapsed = !!collapsedMonths[ym];
          return (
            <div key={ym} className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMonth(ym)}
                className="w-full flex items-center justify-between gap-3 px-5 py-3.5 bg-gradient-to-r from-success/10 to-success/5 border-b border-border hover:from-success/20 transition-base text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {collapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <Calendar className="h-4 w-4 text-success shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-foreground truncate">{monthLabel(ym)}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {monthItems.length} {lang === "bn" ? "টি আয়" : "incomes"}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t("total")}</div>
                  <div className="text-base font-bold text-success">{formatMoney(monthTotal, lang)}</div>
                </div>
              </button>
              {!collapsed && (
                <div className="divide-y divide-border">
                  {monthItems.map((e) => {
                    const Icon = catIcon(e.category);
                    return (
                      <div key={e.id} className="grid grid-cols-2 md:grid-cols-12 gap-3 px-5 py-3 items-center hover:bg-secondary/30 transition-base">
                        <div className="md:col-span-2 text-sm text-muted-foreground">{e.date}</div>
                        <div className="md:col-span-3">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 text-success px-2.5 py-1 text-xs font-semibold border border-success/20">
                            <Icon className="h-3 w-3" /> {catLabel(e.category, lang)}
                          </span>
                        </div>
                        <div className="md:col-span-4 text-sm text-foreground">
                          {e.source_name && <span className="font-semibold">{e.source_name}</span>}
                          {e.source_name && e.description && <span className="text-muted-foreground"> · </span>}
                          {e.description}
                          {e.reference && (
                            <span className="ml-1 text-[11px] text-muted-foreground">#{e.reference}</span>
                          )}
                        </div>
                        <div className="md:col-span-2 md:text-right font-bold text-foreground">{formatMoney(Number(e.amount), lang)}</div>
                        <div className="md:col-span-1 flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(e.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {!loading && sortedMonths.length > 0 && (
          <div className="rounded-2xl bg-gradient-to-r from-success/10 to-success/5 border border-border px-5 py-4 flex justify-between items-center">
            <div className="text-sm font-semibold text-foreground">
              {lang === "bn" ? "সর্বমোট অন্যান্য আয়" : "Grand Total Other Income"}
            </div>
            <div className="text-xl font-bold text-success">{formatMoney(total, lang)}</div>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{lang === "bn" ? "মুছে ফেলবেন?" : "Delete income?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "bn" ? "এই আয়টি স্থায়ীভাবে মুছে যাবে।" : "This income will be permanently deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {lang === "bn" ? "মুছুন" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
