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
import { Plus, Wallet } from "lucide-react";
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

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "cleaning" as TKey,
    description: "",
    amount: "",
  });

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

  const submit = async () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0 || !form.description.trim()) {
      toast.error(lang === "bn" ? "সঠিক তথ্য দিন" : "Please enter valid details");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("expenses").insert({
      date: form.date,
      category: form.category,
      description: form.description.trim(),
      amount: amt,
      created_by: user?.id ?? null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(lang === "bn" ? "খরচ যোগ হয়েছে" : "Expense added");
    setForm({ ...form, description: "", amount: "" });
    setOpen(false);
    load();
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

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground gap-2 shadow-elegant">
                <Plus className="h-4 w-4" /> {t("addExpense")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("addExpense")}</DialogTitle>
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
                <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>{t("cancel")}</Button>
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
            <div className="col-span-5">{t("description")}</div>
            <div className="col-span-2 text-right">{t("amount")}</div>
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
                <div className="md:col-span-5 text-sm text-foreground">{e.description}</div>
                <div className="md:col-span-2 md:text-right font-bold text-foreground">{formatMoney(Number(e.amount), lang)}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center px-5 py-4 border-t border-border bg-secondary/40">
            <div className="text-sm font-semibold text-foreground">{t("total")}</div>
            <div className="text-lg font-bold text-primary">{formatMoney(total, lang)}</div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
