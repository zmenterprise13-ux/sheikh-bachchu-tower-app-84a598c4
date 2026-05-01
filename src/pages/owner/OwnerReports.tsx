import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney, TKey } from "@/i18n/translations";
import { StatCard } from "@/components/StatCard";
import { TrendingUp, TrendingDown, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Bill = { paid_amount: number };
type Expense = { id: string; date: string; category: string; description: string; amount: number };

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function OwnerReports() {
  const { t, lang } = useLang();
  const month = currentMonth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const monthStart = `${month}-01`;
      const next = new Date(monthStart);
      next.setMonth(next.getMonth() + 1);
      const monthEnd = next.toISOString().slice(0, 10);
      const [bRes, eRes] = await Promise.all([
        supabase.from("bills").select("paid_amount").eq("month", month),
        supabase.from("expenses")
          .select("id, date, category, description, amount")
          .gte("date", monthStart).lt("date", monthEnd)
          .order("date", { ascending: false }),
      ]);
      if (bRes.error) toast.error(bRes.error.message);
      if (eRes.error) toast.error(eRes.error.message);
      setBills((bRes.data ?? []) as Bill[]);
      setExpenses((eRes.data ?? []) as Expense[]);
      setLoading(false);
    })();
  }, [month]);

  const income = bills.reduce((s, b) => s + Number(b.paid_amount), 0);
  const expense = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const balance = income - expense;
  const monthLabel = new Date(month + "-01").toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", { year: "numeric", month: "long" });

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("monthlyReport")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{monthLabel}</p>
        </div>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label={t("income")} value={formatMoney(income, lang)} icon={TrendingUp} variant="success" />
            <StatCard label={t("expense")} value={formatMoney(expense, lang)} icon={TrendingDown} variant="warning" />
            <StatCard label={t("balance")} value={formatMoney(balance, lang)} icon={Scale} variant="primary" />
          </div>
        )}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-soft">
          <h2 className="font-semibold text-foreground mb-4">{t("expense")}</h2>
          <div className="space-y-2">
            {!loading && expenses.length === 0 && (
              <div className="text-sm text-muted-foreground">{t("noData")}</div>
            )}
            {expenses.map((e) => (
              <div key={e.id} className="flex justify-between text-sm border-b border-border pb-2">
                <span className="text-muted-foreground">{t(e.category as TKey) || e.category} — <span className="text-foreground">{e.description}</span></span>
                <span className="font-semibold">{formatMoney(Number(e.amount), lang)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
