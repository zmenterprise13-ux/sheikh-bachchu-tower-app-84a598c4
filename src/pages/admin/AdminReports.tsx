import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney, formatNumber, TKey } from "@/i18n/translations";
import { StatCard } from "@/components/StatCard";
import { TrendingUp, TrendingDown, Scale, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

type Bill = {
  service_charge: number;
  gas_bill: number;
  parking: number;
  eid_bonus: number;
  other_charge: number;
  total: number;
  paid_amount: number;
  status: "paid" | "partial" | "unpaid";
};
type Expense = { category: string; amount: number };

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function AdminReports() {
  const { t, lang } = useLang();
  const month = currentMonth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [flatCount, setFlatCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const monthStart = `${month}-01`;
      const next = new Date(monthStart);
      next.setMonth(next.getMonth() + 1);
      const monthEnd = next.toISOString().slice(0, 10);

      const [billsRes, expRes, flatsRes] = await Promise.all([
        supabase.from("bills")
          .select("service_charge, gas_bill, parking, total, paid_amount, status")
          .eq("month", month),
        supabase.from("expenses")
          .select("category, amount")
          .gte("date", monthStart)
          .lt("date", monthEnd),
        supabase.from("flats").select("id", { count: "exact", head: true }),
      ]);
      if (billsRes.error) toast.error(billsRes.error.message);
      if (expRes.error) toast.error(expRes.error.message);
      setBills((billsRes.data ?? []) as Bill[]);
      setExpenses((expRes.data ?? []) as Expense[]);
      setFlatCount(flatsRes.count ?? 0);
      setLoading(false);
    })();
  }, [month]);

  const totalIncome = bills.reduce((s, b) => s + Number(b.paid_amount), 0);
  const totalBilled = bills.reduce((s, b) => s + Number(b.total), 0);
  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const balance = totalIncome - totalExpense;
  const collectionRate = totalBilled > 0 ? Math.round((totalIncome / totalBilled) * 100) : 0;

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});
  const maxCat = Math.max(1, ...Object.values(byCategory));

  const monthLabel = new Date(month + "-01").toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", {
    year: "numeric", month: "long",
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("monthlyReport")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{monthLabel}</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => toast.info(lang === "bn" ? "PDF এক্সপোর্ট শীঘ্রই" : "PDF export coming soon")}>
            <Download className="h-4 w-4" /> {t("download")}
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label={t("income")} value={formatMoney(totalIncome, lang)} hint={`${formatNumber(collectionRate, lang)}% ${t("collectionRate")}`} icon={TrendingUp} variant="success" />
            <StatCard label={t("expense")} value={formatMoney(totalExpense, lang)} hint={`${formatNumber(expenses.length, lang)} ${lang === "bn" ? "টি এন্ট্রি" : "entries"}`} icon={TrendingDown} variant="warning" />
            <StatCard label={t("balance")} value={formatMoney(balance, lang)} hint={balance >= 0 ? (lang === "bn" ? "লাভ" : "Surplus") : (lang === "bn" ? "ঘাটতি" : "Deficit")} icon={Scale} variant={balance >= 0 ? "primary" : "destructive"} />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-card border border-border p-6 shadow-soft">
            <h2 className="font-semibold text-foreground mb-4">{t("income")}</h2>
            <div className="space-y-3">
              {[
                { label: t("serviceCharge"), value: bills.reduce((s, b) => s + (b.status === "paid" ? Number(b.service_charge) : b.status === "partial" && Number(b.total) ? Number(b.paid_amount) * Number(b.service_charge) / Number(b.total) : 0), 0) },
                { label: t("gasBill"),       value: bills.reduce((s, b) => s + (b.status === "paid" ? Number(b.gas_bill) : 0), 0) },
                { label: t("parking"),       value: bills.reduce((s, b) => s + (b.status === "paid" ? Number(b.parking) : 0), 0) },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className="font-semibold text-foreground">{formatMoney(row.value, lang)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t-2 border-foreground/20">
                <span className="font-semibold">{t("total")}</span>
                <span className="font-bold text-success text-lg">{formatMoney(totalIncome, lang)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-card border border-border p-6 shadow-soft">
            <h2 className="font-semibold text-foreground mb-4">{t("expense")}</h2>
            <div className="space-y-3">
              {Object.entries(byCategory).length === 0 && (
                <div className="text-sm text-muted-foreground">{t("noData")}</div>
              )}
              {Object.entries(byCategory).map(([cat, amt]) => (
                <div key={cat}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{t(cat as TKey) || cat}</span>
                    <span className="font-semibold text-foreground">{formatMoney(amt, lang)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full gradient-primary" style={{ width: `${(amt / maxCat) * 100}%` }} />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 border-t-2 border-foreground/20">
                <span className="font-semibold">{t("total")}</span>
                <span className="font-bold text-warning text-lg">{formatMoney(totalExpense, lang)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl gradient-hero text-primary-foreground p-6 sm:p-8 shadow-elevated">
          <div className="grid gap-4 sm:grid-cols-3 text-center sm:text-left">
            <div>
              <div className="text-xs uppercase opacity-80">{t("totalFlats")}</div>
              <div className="text-2xl font-bold mt-1">{formatNumber(flatCount, lang)}</div>
            </div>
            <div>
              <div className="text-xs uppercase opacity-80">{t("collectionRate")}</div>
              <div className="text-2xl font-bold mt-1">{formatNumber(collectionRate, lang)}%</div>
            </div>
            <div>
              <div className="text-xs uppercase opacity-80">{t("netBalance")}</div>
              <div className="text-2xl font-bold mt-1">{formatMoney(balance, lang)}</div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
