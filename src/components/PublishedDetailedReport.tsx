import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangContext";
import { formatMoney, formatNumber, TKey } from "@/i18n/translations";
import { useBkashSettings } from "@/hooks/useBkashSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, FileBarChart } from "lucide-react";

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
  opening_cash?: number;
  published?: boolean;
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

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data }, catRes] = await Promise.all([
        supabase.rpc("monthly_finance_summary", { _month: month }),
        supabase.from("expense_categories").select("name, name_bn"),
      ]);
      setSnap((data as Snapshot | null) ?? null);
      setExpenseCats((catRes.data ?? []) as any);
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

  return (
    <div className="space-y-6">
      <div className="text-center text-destructive font-bold text-lg">
        {lang === "bn" ? `বিল মাস: ${monthLabel}` : `Bill month: ${monthLabel}`}
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
            {Number(snap.loan_repaid) > 0 && (
              <div className="pt-2 border-t border-dashed border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{lang === "bn" ? "লোন পরিশোধ (ক্যাশ আউট)" : "Loan Repaid (Cash Out)"}</span>
                  <span className="font-semibold text-foreground">{formatMoney(Number(snap.loan_repaid), lang)}</span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between pt-3 border-t-2 border-foreground/20">
              <span className="font-semibold">{lang === "bn" ? "সর্বমোট ব্যয়" : "Total Expense"}</span>
              <span className="font-bold text-warning text-lg">{formatMoney(totalExpense, lang)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
