import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangContext";
import { formatMoney, formatNumber, TKey } from "@/i18n/translations";
import { useBkashSettings } from "@/hooks/useBkashSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, FileBarChart, CheckCircle2 } from "lucide-react";

type Snapshot = {
  billed: number;
  collected: number;
  expense: number;
  other_income: number;
  loan_taken: number;
  loan_repaid: number;
  by_category: { category: string; amount: number }[];
  by_income_category: { category: string; amount: number }[];
  flat_buckets?: { amount: number; count: number }[];
  bill_components?: Record<string, { rate: number; count: number }[]>;
  loan_by_lender?: { lender: string; lender_bn: string | null; amount: number }[];
  loan_repaid_by_lender?: { lender: string; lender_bn: string | null; amount: number }[];
  outstanding_loans?: { lender: string; lender_bn: string | null; outstanding: number }[];
  opening_cash?: number;
  published?: boolean;
  published_at?: string | null;
  notes?: string | null;
};

const oiCatLabel: Record<string, { bn: string; en: string }> = {
  donation: { bn: "অনুদান", en: "Donation" },
  dues_recovery: { bn: "বকেয়া আদায়", en: "Dues Recovery" },
  external_rent: { bn: "অন্যান্য ভাড়া", en: "Other Rent" },
  bank_interest_other: { bn: "ব্যাংক ইন্টারেস্ট/অন্যান্য", en: "Bank Interest / Others" },
};

export function PublishedDetailedReport({ month }: { month: string }) {
  const { t, lang } = useLang();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [expenseCats, setExpenseCats] = useState<{ name: string; name_bn: string | null }[]>([]);
  const [liveRepayLenders, setLiveRepayLenders] = useState<{ lender: string; lender_bn: string | null; amount: number }[]>([]);
  const [expenseDescByCat, setExpenseDescByCat] = useState<Record<string, string[]>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const start = `${month}-01`;
      const [y, m] = month.split("-").map(Number);
      const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
      const [{ data }, catRes, repayRes, expRes] = await Promise.all([
        supabase.rpc("monthly_finance_summary", { _month: month }),
        supabase.from("expense_categories").select("name, name_bn"),
        supabase
          .from("loan_repayments")
          .select("amount, loans!inner(lender_name, lender_name_bn)")
          .gte("paid_date", start)
          .lt("paid_date", nextMonth),
        supabase
          .from("expenses")
          .select("category, description")
          .eq("approval_status", "approved")
          .gte("date", start)
          .lt("date", nextMonth),
      ]);
      const descMap: Record<string, string[]> = {};
      for (const r of (expRes.data ?? []) as any[]) {
        const d = (r.description || "").trim();
        if (!d) continue;
        if (!descMap[r.category]) descMap[r.category] = [];
        if (!descMap[r.category].includes(d)) descMap[r.category].push(d);
      }
      setExpenseDescByCat(descMap);
      setSnap((data as Snapshot | null) ?? null);
      setExpenseCats((catRes.data ?? []) as any);
      const agg = new Map<string, { lender: string; lender_bn: string | null; amount: number }>();
      for (const r of (repayRes.data ?? []) as any[]) {
        const key = (r.loans?.lender_name || "") + "|" + (r.loans?.lender_name_bn || "");
        const prev = agg.get(key);
        const amt = Number(r.amount) || 0;
        if (prev) prev.amount += amt;
        else agg.set(key, { lender: r.loans?.lender_name || "", lender_bn: r.loans?.lender_name_bn || null, amount: amt });
      }
      setLiveRepayLenders(Array.from(agg.values()).filter(x => x.amount > 0));
      setLoading(false);
    })();
  }, [month]);

  const monthLabel = useMemo(
    () => new Date(month + "-01").toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", { year: "numeric", month: "long" }),
    [month, lang],
  );

  if (loading) return <Skeleton className="h-96 rounded-2xl" />;

  if (!snap || snap.published === false) {
    return (
      <div className="rounded-2xl bg-card border border-border p-12 text-center shadow-soft">
        <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <div className="font-semibold text-foreground">
          {lang === "bn" ? "এ মাসের রিপোর্ট এখনো প্রকাশিত হয়নি।" : "This month's report has not been published yet."}
        </div>
      </div>
    );
  }

  const opening = Number(snap.opening_cash) || 0;
  const flatBuckets = snap.flat_buckets ?? [];
  const grandBilled = flatBuckets.reduce((s, r) => s + r.amount * r.count, 0);
  const components: { key: string; label: string }[] = [
    { key: "service_charge", label: t("serviceCharge") },
    { key: "gas_bill", label: t("gasBill") },
    { key: "parking", label: t("parking") },
    { key: "eid_bonus", label: t("eidBonus") },
    { key: "other_charge", label: t("otherCharge") },
  ];
  const totalCollection = grandBilled + (Number(snap.loan_taken) || 0) + (Number(snap.other_income) || 0);
  const totalExpense = (Number(snap.expense) || 0) + (Number(snap.loan_repaid) || 0);

  const publishedAtLabel = snap.published_at
    ? new Date(snap.published_at).toLocaleString(lang === "bn" ? "bn-BD" : "en-US", {
        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-6">
      <div className="text-center text-destructive font-bold text-lg">
        {lang === "bn" ? `বিল মাস: ${monthLabel}` : `Bill month: ${monthLabel}`}
      </div>
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-success/10 border border-success/30 px-3 py-1 text-xs font-medium text-success">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {lang === "bn" ? "প্রকাশিত" : "Published"}
          {publishedAtLabel && <span className="text-muted-foreground">· {publishedAtLabel}</span>}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Income */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-dashed border-border">
            <span className="text-sm font-semibold text-muted-foreground">
              {lang === "bn" ? "পূর্বের ক্যাশ" : "Opening Cash"}
            </span>
            <span className={`text-sm font-bold ${opening < 0 ? "text-destructive" : "text-foreground"}`}>
              {formatMoney(opening, lang)}
            </span>
          </div>
          <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
            <FileBarChart className="h-4 w-4 text-primary" />
            {t("income")}
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            {lang === "bn"
              ? "মোট বিল × ফ্ল্যাট সংখ্যা ভিত্তিক হিসাব (নিচে শুধু বিশ্লেষণ — যোগ হবে না)"
              : "Total bill × flat count (breakdown below is reference only — not summed)"}
          </p>

          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">
                  {lang === "bn" ? "মোট বিল × ফ্ল্যাট" : "Total Bill × Flats"}
                </span>
                <span className="text-sm font-bold text-success">{formatMoney(grandBilled, lang)}</span>
              </div>
              {flatBuckets.length === 0 ? (
                <div className="text-xs text-muted-foreground pl-2">—</div>
              ) : (
                <div className="space-y-1 pl-2 border-l-2 border-success/40">
                  {flatBuckets.map((r) => (
                    <div key={r.amount} className="flex items-center justify-between text-xs pl-3">
                      <span className="text-muted-foreground font-mono">
                        {formatMoney(r.amount, lang)} × {formatNumber(r.count, lang)}
                      </span>
                      <span className="text-foreground tabular-nums font-semibold">{formatMoney(r.amount * r.count, lang)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t-2 border-foreground/20">
              <span className="font-semibold">{lang === "bn" ? "মোট বিল (আয়)" : "Total Billed (Income)"}</span>
              <span className="font-bold text-success text-lg">{formatMoney(grandBilled, lang)}</span>
            </div>

            {Number(snap.loan_taken) > 0 && (
              <div className="pt-3 border-t border-dashed border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {lang === "bn" ? "লোন নেয়া (ক্যাশ ইন)" : "Loan Taken (Cash In)"}
                  </span>
                  <span className="text-sm font-bold text-success">{formatMoney(Number(snap.loan_taken), lang)}</span>
                </div>
                {(snap.loan_by_lender ?? []).length > 0 && (
                  <div className="space-y-1 pl-2 border-l-2 border-success/40 mt-2">
                    {(snap.loan_by_lender ?? []).map((l, i) => {
                      const name = (lang === "bn" ? (l.lender_bn || l.lender) : (l.lender || l.lender_bn)) || (lang === "bn" ? "অজ্ঞাত" : "Unknown");
                      return (
                        <div key={i} className="flex items-center justify-between text-xs pl-3">
                          <span className="text-muted-foreground truncate">{name}</span>
                          <span className="text-foreground tabular-nums font-semibold">{formatMoney(Number(l.amount), lang)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-dashed border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">
                  {lang === "bn" ? "অন্যান্য আয়" : "Other Income"}
                </span>
                <span className="text-sm font-bold text-success">{formatMoney(Number(snap.other_income) || 0, lang)}</span>
              </div>
              {(snap.by_income_category ?? []).length === 0 ? (
                <div className="text-xs text-muted-foreground pl-2">—</div>
              ) : (
                <div className="space-y-1 pl-2 border-l-2 border-success/40">
                  {(snap.by_income_category ?? []).map((r) => (
                    <div key={r.category} className="flex items-center justify-between text-xs pl-3">
                      <span className="text-muted-foreground truncate">{oiCatLabel[r.category]?.[lang] ?? r.category}</span>
                      <span className="text-foreground tabular-nums font-semibold">{formatMoney(Number(r.amount), lang)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t-2 border-success/40">
              <span className="font-semibold">{lang === "bn" ? "সর্বমোট কালেকশন" : "Total Collection"}</span>
              <span className="font-bold text-success text-lg">{formatMoney(totalCollection, lang)}</span>
            </div>

            {/* Reference breakdown by component */}
            <div className="pt-4 mt-2 border-t border-dashed border-border">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                {lang === "bn" ? "বিশ্লেষণ (শুধু রেফারেন্স — যোগ হবে না)" : "Breakdown (reference only — not summed)"}
              </div>
              <div className="space-y-4">
                {components.map((sec) => {
                  const rows = snap.bill_components?.[sec.key] ?? [];
                  const subtotal = rows.reduce((s, r) => s + Number(r.rate) * Number(r.count), 0);
                  return (
                    <div key={sec.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-muted-foreground">{sec.label}</span>
                        <span className="text-xs text-muted-foreground">{formatMoney(subtotal, lang)}</span>
                      </div>
                      {rows.length === 0 ? (
                        <div className="text-[11px] text-muted-foreground pl-2">—</div>
                      ) : (
                        <div className="space-y-0.5 pl-2 border-l border-border">
                          {rows.map((r, i) => (
                            <div key={i} className="flex items-center justify-between text-[11px] pl-3 text-muted-foreground">
                              <span className="font-mono">
                                {formatMoney(Number(r.rate), lang)} × {formatNumber(Number(r.count), lang)}
                              </span>
                              <span className="tabular-nums">{formatMoney(Number(r.rate) * Number(r.count), lang)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Expense */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-soft">
          <h2 className="font-semibold text-foreground mb-4">{t("expense")}</h2>
          <div className="space-y-3">
            {(snap.by_category ?? []).length === 0 && (
              <div className="text-sm text-muted-foreground">{t("noData")}</div>
            )}
            {(() => {
              const max = Math.max(1, ...(snap.by_category ?? []).map((r) => Number(r.amount)));
              return (snap.by_category ?? []).map((r) => {
                const cd = expenseCats.find((c) => c.name === r.category);
                const label = lang === "bn" ? (cd?.name_bn || cd?.name || (t(r.category as TKey) as string) || r.category) : (cd?.name || (t(r.category as TKey) as string) || r.category);
                return (
                  <div key={r.category}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold text-foreground">{formatMoney(Number(r.amount), lang)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full gradient-primary" style={{ width: `${(Number(r.amount) / max) * 100}%` }} />
                    </div>
                  </div>
                );
              });
            })()}
            {Number(snap.loan_repaid) > 0 && (() => {
              const lenders = (snap.loan_repaid_by_lender ?? []).length > 0
                ? (snap.loan_repaid_by_lender ?? [])
                : liveRepayLenders;
              return (
                <div className="pt-2 border-t border-dashed border-border space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>{lang === "bn" ? "লোন ফেরত" : "Loan Repaid"}</span>
                    <span>{formatMoney(Number(snap.loan_repaid), lang)}</span>
                  </div>
                  {lenders.length > 0 ? (
                    lenders.map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-sm pl-2">
                        <span className="text-muted-foreground">
                          ↳ {lang === "bn" ? (r.lender_bn || r.lender) : (r.lender || r.lender_bn)}
                        </span>
                        <span className="font-semibold text-foreground">{formatMoney(Number(r.amount), lang)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-between text-sm pl-2">
                      <span className="text-muted-foreground">↳ {lang === "bn" ? "ক্যাশ আউট" : "Cash Out"}</span>
                      <span className="font-semibold text-foreground">{formatMoney(Number(snap.loan_repaid), lang)}</span>
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="flex items-center justify-between pt-3 border-t-2 border-foreground/20">
              <span className="font-semibold">{lang === "bn" ? "সর্বমোট ব্যয়" : "Total Expense"}</span>
              <span className="font-bold text-warning text-lg">{formatMoney(totalExpense, lang)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Net Balance summary */}
      {(() => {
        const net = opening + totalCollection - totalExpense;
        return (
          <div className="rounded-2xl bg-card border border-border p-6 shadow-soft">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileBarChart className="h-4 w-4 text-primary" />
              {lang === "bn" ? "নিট ব্যালেন্স" : "Net Balance"}
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{lang === "bn" ? "পূর্বের ক্যাশ" : "Opening Cash"}</span>
                <span className="tabular-nums font-semibold">{formatMoney(opening, lang)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{lang === "bn" ? "+ সর্বমোট কালেকশন" : "+ Total Collection"}</span>
                <span className="tabular-nums font-semibold text-success">{formatMoney(totalCollection, lang)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{lang === "bn" ? "− সর্বমোট ব্যয়" : "− Total Expense"}</span>
                <span className="tabular-nums font-semibold text-warning">{formatMoney(totalExpense, lang)}</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t-2 border-foreground/20">
                <span className="font-bold">{lang === "bn" ? "নিট ব্যালেন্স" : "Net Balance"}</span>
                <span className={`font-bold text-lg tabular-nums ${net < 0 ? "text-destructive" : "text-success"}`}>
                  {formatMoney(net, lang)}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Outstanding loans warning */}
      {(snap.outstanding_loans ?? []).length > 0 && (
        <div className="rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-4">
          <p className="text-destructive font-bold italic text-sm">
            {lang === "bn" ? "* লোন নেয়া আছে:" : "* Loan(s) outstanding:"}
          </p>
          <ul className="mt-2 space-y-1 italic text-destructive text-sm">
            {(snap.outstanding_loans ?? []).map((l, i) => {
              const name = (lang === "bn" ? (l.lender_bn || l.lender) : (l.lender || l.lender_bn)) || (lang === "bn" ? "অজ্ঞাত" : "Unknown");
              return (
                <li key={i}>
                  * {name} — {formatMoney(Number(l.outstanding), lang)}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Admin notes */}
      {snap.notes && snap.notes.trim().length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-4 shadow-soft">
          <div className="text-xs font-semibold text-muted-foreground mb-1">
            {lang === "bn" ? "মন্তব্য" : "Notes"}
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap">{snap.notes}</p>
        </div>
      )}
    </div>
  );
}
