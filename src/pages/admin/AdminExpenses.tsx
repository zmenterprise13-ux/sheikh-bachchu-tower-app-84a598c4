import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Wallet, Pencil, Trash2 } from "lucide-react";
import { TKey } from "@/i18n/translations";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES: TKey[] = ["caretakerSalary", "security", "cleaning", "electricity", "waterPump", "liftMaintenance", "repair", "others"];

type Expense = {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
};

export default function AdminExpenses() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "cleaning" as TKey,
    description: "",
    amount: "",
  });

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().slice(0, 10),
      category: "cleaning" as TKey,
      description: "",
      amount: "",
    });
    setEditingId(null);
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("id, date, category, description, amount")
      .order("date", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as Expense[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const total = items.reduce((s, e) => s + Number(e.amount), 0);

  const openEdit = (e: Expense) => {
    setEditingId(e.id);
    setForm({
      date: e.date,
      category: e.category as TKey,
      description: e.description,
      amount: String(e.amount),
    });
    setOpen(true);
  };

  const submit = async () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0 || !form.description.trim()) {
      toast.error(lang === "bn" ? "সঠিক তথ্য দিন" : "Please enter valid details");
      return;
    }
    setSubmitting(true);
    let error;
    if (editingId) {
      ({ error } = await supabase.from("expenses").update({
        date: form.date,
        category: form.category,
        description: form.description.trim(),
        amount: amt,
      }).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("expenses").insert({
        date: form.date,
        category: form.category,
        description: form.description.trim(),
        amount: amt,
        created_by: user?.id ?? null,
      }));
    }
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingId ? (lang === "bn" ? "আপডেট হয়েছে" : "Updated") : (lang === "bn" ? "খরচ যোগ হয়েছে" : "Expense added"));
    resetForm();
    setOpen(false);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("expenses").delete().eq("id", deleteId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(lang === "bn" ? "মুছে ফেলা হয়েছে" : "Deleted");
      load();
    }
    setDeleteId(null);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("expenses")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("total")}: <span className="font-bold text-foreground">{formatMoney(total, lang)}</span>
            </p>
          </div>

          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground gap-2 shadow-elegant">
                <Plus className="h-4 w-4" /> {t("addExpense")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? t("edit") + " - " + t("expenses") : t("addExpense")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t("date")}</Label>
                    <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("amount")}</Label>
                    <Input type="number" min="0" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("category")}</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as TKey })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{t(c)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("description")}</Label>
                  <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={200} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }} disabled={submitting}>{t("cancel")}</Button>
                <Button className="gradient-primary text-primary-foreground" onClick={submit} disabled={submitting}>
                  {submitting ? "..." : t("save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 text-xs font-semibold text-muted-foreground uppercase border-b border-border bg-secondary/40">
            <div className="col-span-2">{t("date")}</div>
            <div className="col-span-3">{t("category")}</div>
            <div className="col-span-4">{t("description")}</div>
            <div className="col-span-2 text-right">{t("amount")}</div>
            <div className="col-span-1 text-right"></div>
          </div>
          <div className="divide-y divide-border">
            {loading && (
              <div className="p-5 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            )}
            {!loading && items.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">{t("noData")}</div>
            )}
            {!loading && items.map((e) => (
              <div key={e.id} className="grid grid-cols-2 md:grid-cols-12 gap-3 px-5 py-3 items-center">
                <div className="md:col-span-2 text-sm text-muted-foreground">{e.date}</div>
                <div className="md:col-span-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                    <Wallet className="h-3 w-3" /> {t(e.category as TKey) || e.category}
                  </span>
                </div>
                <div className="md:col-span-4 text-sm text-foreground">{e.description}</div>
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
            ))}
          </div>
          <div className="flex justify-between items-center px-5 py-4 border-t border-border bg-secondary/40">
            <div className="text-sm font-semibold text-foreground">{t("total")}</div>
            <div className="text-lg font-bold text-primary">{formatMoney(total, lang)}</div>
          </div>
        </div>

        <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{lang === "bn" ? "মুছে ফেলবেন?" : "Delete expense?"}</AlertDialogTitle>
              <AlertDialogDescription>
                {lang === "bn" ? "এই খরচটি স্থায়ীভাবে মুছে যাবে।" : "This expense will be permanently deleted."}
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
    </AppShell>
  );
}
