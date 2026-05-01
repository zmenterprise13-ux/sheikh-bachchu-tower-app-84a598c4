import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { BILLS, EXPENSES, FLATS, CURRENT_MONTH } from "@/data/mockData";
import { formatMoney, formatNumber } from "@/i18n/translations";
import { StatCard } from "@/components/StatCard";
import { TrendingUp, TrendingDown, Scale } from "lucide-react";

export default function OwnerReports() {
  const { t, lang } = useLang();
  const income = BILLS.reduce((s,b)=>s+b.paidAmount,0);
  const expense = EXPENSES.reduce((s,e)=>s+e.amount,0);
  const balance = income - expense;
  const monthLabel = new Date(CURRENT_MONTH + "-01").toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", { year: "numeric", month: "long" });

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("monthlyReport")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{monthLabel}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label={t("income")} value={formatMoney(income, lang)} icon={TrendingUp} variant="success" />
          <StatCard label={t("expense")} value={formatMoney(expense, lang)} icon={TrendingDown} variant="warning" />
          <StatCard label={t("balance")} value={formatMoney(balance, lang)} icon={Scale} variant="primary" />
        </div>
        <div className="rounded-2xl bg-card border border-border p-6 shadow-soft">
          <h2 className="font-semibold text-foreground mb-4">{t("expense")}</h2>
          <div className="space-y-2">
            {EXPENSES.map(e => (
              <div key={e.id} className="flex justify-between text-sm border-b border-border pb-2">
                <span className="text-muted-foreground">{t(e.category as any)} — <span className="text-foreground">{e.description}</span></span>
                <span className="font-semibold">{formatMoney(e.amount, lang)}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {lang === "bn" ? `মোট ${formatNumber(FLATS.length, lang)}টি ফ্ল্যাটের হিসাব` : `Account for ${formatNumber(FLATS.length, lang)} flats total`}
        </p>
      </div>
    </AppShell>
  );
}
