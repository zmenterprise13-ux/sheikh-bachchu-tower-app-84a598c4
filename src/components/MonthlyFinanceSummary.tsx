import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangContext";
import { formatMoney, TKey } from "@/i18n/translations";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, Receipt, FileBarChart } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type Props = {
  /** YYYY-MM, e.g. "2026-03" */
  month: string;
  /** owner = read-only summary, admin = link to full report */
  variant?: "owner" | "admin";
  /** Custom heading override */
  title?: string;
};

type CatRow = { category: string; amount: number };

export function MonthlyFinanceSummary({ month, variant = "owner", title }: Props) {
  const { t, lang } = useLang();
  const [billed, setBilled] = useState(0);
  const [collected, setCollected] = useState(0);
  const [expense, setExpense] = useState(0);
  const [byCategory, setByCategory] = useState<CatRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("monthly_finance_summary", { _month: month });
      if (cancelled) return;
      if (error || !data) {
        setBilled(0); setCollected(0); setExpense(0); setByCategory([]);
      } else {
        const d = data as any;
        setBilled(Number(d.billed) || 0);
        setCollected(Number(d.collected) || 0);
        setExpense(Number(d.expense) || 0);
        setByCategory(((d.by_category ?? []) as any[]).map((r) => ({ category: r.category, amount: Number(r.amount) || 0 })));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [month]);

  const monthLabel = useMemo(
    () => new Date(month + "-01").toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", { year: "numeric", month: "long" }),
    [month, lang],
  );

  const net = collected - expense;
  const sortedByCategory = byCategory;

  const heading = title ?? (lang === "bn" ? "আয়-ব্যয়ের হিসাব" : "Income & Expense Summary");
  const reportLink = variant === "admin" ? "/admin/reports" : "/owner/reports";

  return (
    <div className="rounded-2xl bg-card border border-border p-5 sm:p-6 shadow-soft">
      <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
        <div>
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <FileBarChart className="h-4 w-4 text-primary" />
            {heading}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{monthLabel}</p>
        </div>
        <Link to={reportLink}>
          <Button variant="ghost" size="sm">{lang === "bn" ? "বিস্তারিত" : "View details"}</Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Tile
              icon={TrendingUp}
              label={lang === "bn" ? "আয় (আদায়)" : "Income (Collected)"}
              value={formatMoney(collected, lang)}
              hint={billed > 0 ? `${lang === "bn" ? "বিল" : "Billed"}: ${formatMoney(billed, lang)}` : undefined}
              tone="success"
            />
            <Tile
              icon={TrendingDown}
              label={lang === "bn" ? "ব্যয় (খরচ)" : "Expense"}
              value={formatMoney(expense, lang)}
              hint={`${byCategory.length} ${lang === "bn" ? "খাত" : "categories"}`}
              tone="warning"
            />
            <Tile
              icon={Wallet}
              label={lang === "bn" ? "নিট ব্যালেন্স" : "Net Balance"}
              value={formatMoney(net, lang)}
              hint={net >= 0 ? (lang === "bn" ? "উদ্বৃত্ত" : "Surplus") : (lang === "bn" ? "ঘাটতি" : "Deficit")}
              tone={net >= 0 ? "success" : "destructive"}
            />
          </div>

          {byCategory.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {lang === "bn" ? "খাতওয়ারি ব্যয়" : "Expenses by Category"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {lang === "bn" ? "মোট" : "Total"}: <span className="font-semibold text-foreground">{formatMoney(expense, lang)}</span>
                </div>
              </div>
              <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {byCategory.map(([cat, amt]) => {
                  const pct = expense > 0 ? Math.round((amt / expense) * 100) : 0;
                  const label = (t(cat as TKey) as string) || cat;
                  return (
                    <li key={cat} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <Receipt className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="flex-1 min-w-0 truncate">{label}</span>
                      <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{pct}%</span>
                      <span className="font-semibold tabular-nums">{formatMoney(amt, lang)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {billed === 0 && expense === 0 && (
            <div className="mt-3 text-xs text-muted-foreground text-center">
              {lang === "bn" ? "এ মাসের কোনো ডেটা নেই।" : "No data for this month."}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Tile({
  icon: Icon, label, value, hint, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone: "success" | "warning" | "destructive";
}) {
  const toneCls = {
    success: "bg-success/10 border-success/30 text-success",
    warning: "bg-warning/10 border-warning/30 text-warning",
    destructive: "bg-destructive/10 border-destructive/30 text-destructive",
  }[tone];
  return (
    <div className={`rounded-xl border p-3 ${toneCls}`}>
      <div className="flex items-center gap-2 text-xs font-medium opacity-90">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-xl font-bold text-foreground truncate">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}
