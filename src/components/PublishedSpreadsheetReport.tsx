import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangContext";
import { formatMoney, formatNumber, TKey } from "@/i18n/translations";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock } from "lucide-react";

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

export function PublishedSpreadsheetReport({ month }: { month: string }) {
  const { t, lang } = useLang();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [expenseCats, setExpenseCats] = useState<{ name: string; name_bn: string | null }[]>([]);
  const [liveRepayLenders, setLiveRepayLenders] = useState<{ lender: string; lender_bn: string | null; amount: number }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const start = `${month}-01`;
      const [y, m] = month.split("-").map(Number);
      const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
      const [{ data }, catRes, repayRes] = await Promise.all([
        supabase.rpc("monthly_finance_summary", { _month: month }),
        supabase.from("expense_categories").select("name, name_bn"),
        supabase
          .from("loan_repayments")
          .select("amount, loans!inner(lender_name, lender_name_bn)")
          .gte("paid_date", start)
          .lt("paid_date", nextMonth),
      ]);
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
      setLiveRepayLenders(Array.from(agg.values()).filter((x) => x.amount > 0));
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
  const net = opening + totalCollection - totalExpense;

  // Build income rows
  type Row = { label: string; detail?: string; amount: number; bold?: boolean; sub?: boolean; muted?: boolean; category?: boolean; breakdown?: boolean };
  const incomeRows: Row[] = [];
  incomeRows.push({ label: lang === "bn" ? "পূর্বের ক্যাশ" : "Opening Cash", amount: opening, muted: true });
  incomeRows.push({ label: lang === "bn" ? "মোট বিল × ফ্ল্যাট" : "Total Bill × Flats", amount: grandBilled, bold: true, category: true });
  flatBuckets.forEach((r) => {
    incomeRows.push({
      label: `${formatMoney(r.amount, lang)} × ${formatNumber(r.count, lang)}`,
      amount: NaN,
      sub: true,
      breakdown: true,
      detail: String(r.amount * r.count),
    });
  });
  if (Number(snap.loan_taken) > 0) {
    incomeRows.push({ label: lang === "bn" ? "লোন নেয়া" : "Loan Taken", amount: Number(snap.loan_taken), bold: true, category: true });
    (snap.loan_by_lender ?? []).forEach((l) => {
      const name = (lang === "bn" ? (l.lender_bn || l.lender) : (l.lender || l.lender_bn)) || (lang === "bn" ? "অজ্ঞাত" : "Unknown");
      incomeRows.push({ label: name, amount: NaN, sub: true, breakdown: true, detail: String(Number(l.amount)) });
    });
  }
  if (Number(snap.other_income) > 0 || (snap.by_income_category ?? []).length > 0) {
    incomeRows.push({ label: lang === "bn" ? "অন্যান্য আয়" : "Other Income", amount: Number(snap.other_income) || 0, bold: true, category: true });
    (snap.by_income_category ?? []).forEach((r) => {
      incomeRows.push({ label: oiCatLabel[r.category]?.[lang] ?? r.category, amount: NaN, sub: true, breakdown: true, detail: String(Number(r.amount)) });
    });
  }
  // Bill components breakdown — shown separately at the bottom (not part of main income column)
  const billBreakdown: { label: string; subtotal: number; rows: { label: string; amount: number }[] }[] = [];
  components.forEach((sec) => {
    const rows = snap.bill_components?.[sec.key] ?? [];
    const subtotal = rows.reduce((s, r) => s + Number(r.rate) * Number(r.count), 0);
    if (rows.length === 0 && subtotal === 0) return;
    billBreakdown.push({
      label: sec.label,
      subtotal,
      rows: rows.map((r) => ({
        label: `${formatMoney(Number(r.rate), lang)} × ${formatNumber(Number(r.count), lang)}`,
        amount: Number(r.rate) * Number(r.count),
      })),
    });
  });

  // Expense rows
  const expenseRows: Row[] = [];
  (snap.by_category ?? []).forEach((r) => {
    const cd = expenseCats.find((c) => c.name === r.category);
    const label = lang === "bn"
      ? (cd?.name_bn || cd?.name || (t(r.category as TKey) as string) || r.category)
      : (cd?.name || (t(r.category as TKey) as string) || r.category);
    expenseRows.push({ label, amount: Number(r.amount) });
  });
  if (Number(snap.loan_repaid) > 0) {
    expenseRows.push({ label: lang === "bn" ? "লোন ফেরত" : "Loan Repaid", amount: Number(snap.loan_repaid), bold: true });
    const lenders = (snap.loan_repaid_by_lender ?? []).length > 0 ? (snap.loan_repaid_by_lender ?? []) : liveRepayLenders;
    lenders.forEach((r) => {
      expenseRows.push({
        label: (lang === "bn" ? (r.lender_bn || r.lender) : (r.lender || r.lender_bn)) || "—",
        amount: Number(r.amount),
        sub: true,
      });
    });
  }

  const publishedAtLabel = snap.published_at
    ? new Date(snap.published_at).toLocaleString(lang === "bn" ? "bn-BD" : "en-US", {
        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : null;

  // Pad arrays so the two tables align
  const maxLen = Math.max(incomeRows.length, expenseRows.length);
  while (incomeRows.length < maxLen) incomeRows.push({ label: "", amount: NaN });
  while (expenseRows.length < maxLen) expenseRows.push({ label: "", amount: NaN });

  const cellCls = "border border-foreground/30 px-1.5 py-0.5 align-top";
  const numCls = "text-right tabular-nums font-mono";

  const renderIncomeRow = (r: Row) => (
    <>
      <td className={`${cellCls} ${r.sub ? "pl-4 text-[10.5px]" : ""} ${r.muted ? "text-muted-foreground" : ""} ${r.bold ? "font-bold" : ""} ${r.category ? "text-success font-bold" : ""}`}>
        {r.label}
      </td>
      <td
        className={`${cellCls} ${numCls} text-[10.5px] text-foreground/40 italic font-normal max-w-0 truncate whitespace-nowrap overflow-hidden`}
        title={r.breakdown && r.detail ? formatMoney(Number(r.detail), lang) : undefined}
      >
        {r.breakdown && r.detail ? formatMoney(Number(r.detail), lang) : ""}
      </td>
      <td className={`${cellCls} ${numCls} ${r.sub ? "text-[10.5px]" : ""} ${r.muted ? "text-muted-foreground" : ""} ${r.bold ? "font-bold" : ""} ${r.category ? "text-success font-bold" : ""}`}>
        {Number.isFinite(r.amount) ? formatMoney(r.amount, lang) : ""}
      </td>
    </>
  );

  const renderExpenseRow = (r: Row) => (
    <>
      <td className={`${cellCls} ${r.sub ? "pl-4 text-[10.5px]" : ""} ${r.muted ? "text-muted-foreground" : ""} ${r.bold ? "font-bold" : ""} ${r.category ? "text-success font-bold" : ""}`}>
        {r.label}
      </td>
      <td className={`${cellCls} ${numCls} ${r.sub ? "text-[10.5px]" : ""} ${r.muted ? "text-muted-foreground" : ""} ${r.bold ? "font-bold" : ""} ${r.category ? "text-success font-bold" : ""}`}>
        {Number.isFinite(r.amount) ? formatMoney(r.amount, lang) : ""}
      </td>
    </>
  );

  return (
    <div className="space-y-3 text-foreground">
      <div className="text-center">
        <div className="text-base font-bold text-destructive">
          {lang === "bn" ? `বিল মাস: ${monthLabel}` : `Bill month: ${monthLabel}`}
        </div>
        {publishedAtLabel && (
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {lang === "bn" ? "প্রকাশিত · " : "Published · "}{publishedAtLabel}
          </div>
        )}
      </div>

      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-secondary">
            <th className={`${cellCls} text-left w-[30%] font-bold`}>{lang === "bn" ? "আয়ের বিবরণ" : "Income"}</th>
            <th className={`${cellCls} ${numCls} w-[12%] font-normal text-[9px] text-muted-foreground italic`}>
              {lang === "bn" ? "(ব্রেকডাউন)" : "(breakdown)"}
            </th>
            <th className={`${cellCls} ${numCls} w-[13%] font-bold`}>{lang === "bn" ? "পরিমাণ" : "Amount"}</th>
            <th className={`${cellCls} text-left w-[30%] font-bold`}>{lang === "bn" ? "ব্যয়ের বিবরণ" : "Expense"}</th>
            <th className={`${cellCls} ${numCls} w-[15%] font-bold`}>{lang === "bn" ? "পরিমাণ" : "Amount"}</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxLen }).map((_, i) => (
            <tr key={i}>
              {renderIncomeRow(incomeRows[i])}
              {renderExpenseRow(expenseRows[i])}
            </tr>
          ))}
          <tr className="bg-secondary font-bold">
            <td className={cellCls}>{lang === "bn" ? "সর্বমোট কালেকশন" : "Total Collection"}</td>
            <td className={cellCls}></td>
            <td className={`${cellCls} ${numCls} text-success`}>{formatMoney(totalCollection, lang)}</td>
            <td className={cellCls}>{lang === "bn" ? "সর্বমোট ব্যয়" : "Total Expense"}</td>
            <td className={`${cellCls} ${numCls} text-warning`}>{formatMoney(totalExpense, lang)}</td>
          </tr>
        </tbody>
      </table>

      <p className="text-[10px] text-muted-foreground italic">
        {lang === "bn"
          ? "* ব্রেকডাউন কলামের সংখ্যা শুধু হিসাব দেখানোর জন্য; মূল মোটে যোগ হয় না।"
          : "* Breakdown column values are shown for reference only and are not added to the totals."}
      </p>

      {/* Net balance + outstanding */}
      <table className="w-full border-collapse text-[11px]">
        <tbody>
          <tr>
            <td className={cellCls}>{lang === "bn" ? "পূর্বের ক্যাশ" : "Opening Cash"}</td>
            <td className={`${cellCls} ${numCls}`}>{formatMoney(opening, lang)}</td>
            <td className={cellCls}>{lang === "bn" ? "+ কালেকশন" : "+ Collection"}</td>
            <td className={`${cellCls} ${numCls} text-success`}>{formatMoney(totalCollection, lang)}</td>
            <td className={cellCls}>{lang === "bn" ? "− ব্যয়" : "− Expense"}</td>
            <td className={`${cellCls} ${numCls} text-warning`}>{formatMoney(totalExpense, lang)}</td>
            <td className={`${cellCls} font-bold`}>{lang === "bn" ? "নিট ব্যালেন্স" : "Net Balance"}</td>
            <td className={`${cellCls} ${numCls} font-bold ${net < 0 ? "text-destructive" : "text-success"}`}>{formatMoney(net, lang)}</td>
          </tr>
        </tbody>
      </table>

      {(snap.outstanding_loans ?? []).length > 0 && (
        <div className="border border-destructive/40 bg-destructive/5 p-2 rounded">
          <p className="text-destructive font-bold italic text-[11px]">
            {lang === "bn" ? "* লোন বাকি:" : "* Outstanding loan(s):"}
          </p>
          <ul className="mt-1 space-y-0.5 italic text-destructive text-[11px] pl-3">
            {(snap.outstanding_loans ?? []).map((l, i) => {
              const name = (lang === "bn" ? (l.lender_bn || l.lender) : (l.lender || l.lender_bn)) || (lang === "bn" ? "অজ্ঞাত" : "Unknown");
              return <li key={i}>* {name} — {formatMoney(Number(l.outstanding), lang)}</li>;
            })}
          </ul>
        </div>
      )}

      {snap.notes && snap.notes.trim().length > 0 && (
        <div className="border border-border p-2 rounded text-[11px]">
          <div className="font-semibold text-muted-foreground mb-0.5">{lang === "bn" ? "মন্তব্য" : "Notes"}</div>
          <p className="whitespace-pre-wrap">{snap.notes}</p>
        </div>
      )}

      {billBreakdown.length > 0 && (
        <div className="space-y-1 pt-2">
          <div className="text-[11px] font-bold text-muted-foreground">
            {lang === "bn" ? "বিল ব্রেকডাউন (শুধু রেফারেন্স)" : "Bill Breakdown (reference only)"}
          </div>
          <table className="w-full border-collapse text-[10.5px] text-foreground/60">
            <thead>
              <tr className="bg-secondary/50">
                <th className={`${cellCls} text-left w-[40%] font-semibold`}>{lang === "bn" ? "বিবরণ" : "Item"}</th>
                <th className={`${cellCls} ${numCls} w-[30%] font-semibold italic`}>{lang === "bn" ? "(ব্রেকডাউন)" : "(breakdown)"}</th>
                <th className={`${cellCls} ${numCls} w-[30%] font-semibold`}>{lang === "bn" ? "উপ-মোট" : "Subtotal"}</th>
              </tr>
            </thead>
            <tbody>
              {billBreakdown.map((sec, si) => (
                <Fragment key={si}>
                  <tr>
                    <td className={`${cellCls} font-bold text-success`}>{sec.label}</td>
                    <td className={cellCls}></td>
                    <td className={`${cellCls} ${numCls} font-bold text-success`}>{formatMoney(sec.subtotal, lang)}</td>
                  </tr>
                  {sec.rows.map((r, ri) => (
                    <tr key={ri}>
                      <td className={`${cellCls} pl-4 text-[10px]`}>{r.label}</td>
                      <td className={`${cellCls} ${numCls} italic text-foreground/40 text-[10px]`}>{formatMoney(r.amount, lang)}</td>
                      <td className={cellCls}></td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-muted-foreground italic">
            {lang === "bn"
              ? "* এই ব্রেকডাউন মূল ক্যাশ/কালেকশনের সাথে যোগ হয় না — শুধুমাত্র রেফারেন্সের জন্য।"
              : "* This breakdown is not added to the main cash/collection — for reference only."}
          </p>
        </div>
      )}
    </div>
  );
}
