import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangContext";
import { formatMoney, TKey } from "@/i18n/translations";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, Receipt, FileBarChart, CheckCircle2, Send, Loader2, Lock, Landmark, HandCoins, Banknote } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  month: string;
  variant?: "owner" | "admin";
  title?: string;
};

type CatRow = { category: string; amount: number };

export function MonthlyFinanceSummary({ month, variant = "owner", title }: Props) {
  const { t, lang } = useLang();
  const [billed, setBilled] = useState(0);
  const [collected, setCollected] = useState(0);
  const [expense, setExpense] = useState(0);
  const [otherIncome, setOtherIncome] = useState(0);
  const [loanTaken, setLoanTaken] = useState(0);
  const [loanRepaid, setLoanRepaid] = useState(0);
  const [openingCash, setOpeningCash] = useState(0);
  const [byCategory, setByCategory] = useState<CatRow[]>([]);
  const [byIncomeCategory, setByIncomeCategory] = useState<CatRow[]>([]);
  const [catBnMap, setCatBnMap] = useState<Record<string, string>>({});
  const [published, setPublished] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("monthly_finance_summary", { _month: month });
    if (error || !data) {
      setBilled(0); setCollected(0); setExpense(0); setOtherIncome(0);
      setLoanTaken(0); setLoanRepaid(0);
      setByCategory([]); setByIncomeCategory([]);
      setPublished(false); setPublishedAt(null);
    } else {
      const d = data as any;
      setBilled(Number(d.billed) || 0);
      setCollected(Number(d.collected) || 0);
      setExpense(Number(d.expense) || 0);
      setOtherIncome(Number(d.other_income) || 0);
      setLoanTaken(Number(d.loan_taken) || 0);
      setLoanRepaid(Number(d.loan_repaid) || 0);
      setByCategory(((d.by_category ?? []) as any[]).map((r) => ({ category: r.category, amount: Number(r.amount) || 0 })));
      setByIncomeCategory(((d.by_income_category ?? []) as any[]).map((r) => ({ category: r.category, amount: Number(r.amount) || 0 })));
      setPublished(Boolean(d.published));
      setPublishedAt(d.published_at ?? null);
    }
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const monthLabel = useMemo(
    () => new Date(month + "-01").toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", { year: "numeric", month: "long" }),
    [month, lang],
  );

  const totalIncome = collected + otherIncome;
  const net = totalIncome - expense;
  const netCash = net + loanTaken - loanRepaid;
  const heading = title ?? (lang === "bn" ? "আয়-ব্যয়ের হিসাব" : "Income & Expense Summary");
  const reportLink = variant === "admin" ? "/admin/reports" : "/owner/reports";
  const isAdmin = variant === "admin";

  const handlePublish = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("publish_monthly_report", { _month: month, _notes: null });
      if (error) throw error;
      toast.success(lang === "bn" ? "রিপোর্ট পাবলিশ হয়েছে" : "Report published");
      await load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); } finally { setBusy(false); }
  };
  const handleUnpublish = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("unpublish_monthly_report", { _month: month });
      if (error) throw error;
      toast.success(lang === "bn" ? "পাবলিশ বাতিল হয়েছে" : "Unpublished");
      await load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); } finally { setBusy(false); }
  };

  // Owner view, not yet published
  if (!isAdmin && !loading && !published) {
    return (
      <div className="rounded-2xl bg-card border border-border p-6 text-center shadow-soft">
        <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <div className="font-semibold text-foreground">{heading}</div>
        <div className="text-xs text-muted-foreground mt-1">{monthLabel}</div>
        <p className="text-sm text-muted-foreground mt-3">
          {lang === "bn" ? "এ মাসের রিপোর্ট এখনো প্রকাশিত হয়নি।" : "This month's report has not been published yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-5 sm:p-6 shadow-soft">
      <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
        <div>
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <FileBarChart className="h-4 w-4 text-primary" />
            {heading}
            {published && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 text-success border border-success/30 px-2 py-0.5 text-[10px] font-semibold">
                <CheckCircle2 className="h-3 w-3" />
                {lang === "bn" ? "প্রকাশিত" : "Published"}
              </span>
            )}
            {isAdmin && !published && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 text-warning border border-warning/30 px-2 py-0.5 text-[10px] font-semibold">
                {lang === "bn" ? "ড্রাফট" : "Draft"}
              </span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {monthLabel}
            {published && publishedAt && (
              <> · {lang === "bn" ? "প্রকাশিত" : "Published on"} {new Date(publishedAt).toLocaleString(lang === "bn" ? "bn-BD" : "en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</>
            )}
            {isAdmin && !published && (
              <> · <span className="text-warning">{lang === "bn" ? "অপ্রকাশিত" : "Not published yet"}</span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && !loading && (
            published ? (
              <>
                <Button variant="outline" size="sm" onClick={handlePublish} disabled={busy} className="gap-1.5">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {lang === "bn" ? "পুনঃপ্রকাশ" : "Republish"}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleUnpublish} disabled={busy}>
                  {lang === "bn" ? "প্রত্যাহার" : "Unpublish"}
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={handlePublish} disabled={busy} className="gap-1.5">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {lang === "bn" ? "ওনারদের জন্য প্রকাশ" : "Publish to owners"}
              </Button>
            )
          )}
          <Link to={reportLink}>
            <Button variant="ghost" size="sm">{lang === "bn" ? "বিস্তারিত" : "Details"}</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Tile
              icon={Receipt}
              label={lang === "bn" ? "মোট বিল" : "Billed"}
              value={formatMoney(billed, lang)}
              hint={lang === "bn" ? "এ মাসে চার্জ" : "Charged this month"}
              tone="success"
            />
            <Tile
              icon={TrendingUp}
              label={lang === "bn" ? "আদায়" : "Collected"}
              value={formatMoney(collected, lang)}
              hint={billed > 0 ? `${Math.round((collected/billed)*100)}% ${lang === "bn" ? "আদায়" : "collected"}` : undefined}
              tone="success"
            />
            <Tile
              icon={TrendingUp}
              label={lang === "bn" ? "অন্যান্য আয়" : "Other Income"}
              value={formatMoney(otherIncome, lang)}
              hint={
                byIncomeCategory.length > 0
                  ? `${byIncomeCategory.length} ${lang === "bn" ? "খাত" : "categories"}`
                  : (lang === "bn" ? "অনুদান/পাওনা/অন্যান্য" : "Donation/recovery/others")
              }
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
              hint={
                (lang === "bn" ? "মোট আয়: " : "Total income: ") +
                formatMoney(totalIncome, lang)
              }
              tone={net >= 0 ? "success" : "destructive"}
            />
          </div>

          {(loanTaken > 0 || loanRepaid > 0) && (
            <div className="mt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {lang === "bn" ? "ক্যাশ ফ্লো (লোন)" : "Cash Flow (Loans)"}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Tile
                  icon={Landmark}
                  label={lang === "bn" ? "লোন গৃহীত (ক্যাশ ইন)" : "Loan Taken (Cash In)"}
                  value={formatMoney(loanTaken, lang)}
                  hint={lang === "bn" ? "দায় বাড়ে, হাতের ক্যাশ বাড়ে" : "Liability ↑, cash on hand ↑"}
                  tone="success"
                />
                <Tile
                  icon={HandCoins}
                  label={lang === "bn" ? "লোন পরিশোধ (ক্যাশ আউট)" : "Loan Repaid (Cash Out)"}
                  value={formatMoney(loanRepaid, lang)}
                  hint={lang === "bn" ? "দায় কমে, হাতের ক্যাশ কমে" : "Liability ↓, cash on hand ↓"}
                  tone="warning"
                />
                <Tile
                  icon={Banknote}
                  label={lang === "bn" ? "নিট ক্যাশ পজিশন" : "Net Cash Position"}
                  value={formatMoney(netCash, lang)}
                  hint={
                    (lang === "bn"
                      ? "নিট ব্যালেন্স + লোন − পরিশোধ"
                      : "Net balance + loan − repayment")
                  }
                  tone={netCash >= 0 ? "success" : "destructive"}
                />
              </div>
            </div>
          )}

          {byIncomeCategory.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {lang === "bn" ? "খাতওয়ারি অন্যান্য আয়" : "Other Income by Category"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {lang === "bn" ? "মোট" : "Total"}: <span className="font-semibold text-foreground">{formatMoney(otherIncome, lang)}</span>
                </div>
              </div>
              <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {byIncomeCategory.map(({ category, amount }) => {
                  const pct = otherIncome > 0 ? Math.round((amount / otherIncome) * 100) : 0;
                  const labelMap: Record<string, { bn: string; en: string }> = {
                    donation: { bn: "অনুদান", en: "Donation" },
                    dues_recovery: { bn: "পাওনা আদায়", en: "Dues Recovery" },
                    external_rent: { bn: "অন্যান্য ভাড়া", en: "Other Rent" },
                    bank_interest_other: { bn: "ব্যাংক ইন্টারেস্ট/অন্যান্য", en: "Bank Interest / Others" },
                  };
                  const label = labelMap[category]?.[lang] ?? category;
                  return (
                    <li key={category} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <TrendingUp className="h-3.5 w-3.5 text-success shrink-0" />
                      <span className="flex-1 min-w-0 truncate">{label}</span>
                      <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{pct}%</span>
                      <span className="font-semibold tabular-nums">{formatMoney(amount, lang)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

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
                {byCategory.map(({ category, amount }) => {
                  const pct = expense > 0 ? Math.round((amount / expense) * 100) : 0;
                  const label = (t(category as TKey) as string) || category;
                  return (
                    <li key={category} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <Receipt className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="flex-1 min-w-0 truncate">{label}</span>
                      <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{pct}%</span>
                      <span className="font-semibold tabular-nums">{formatMoney(amount, lang)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {billed === 0 && expense === 0 && otherIncome === 0 && loanTaken === 0 && loanRepaid === 0 && (
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
