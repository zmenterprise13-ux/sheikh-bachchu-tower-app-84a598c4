import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney, formatNumber, TKey } from "@/i18n/translations";
import { StatCard } from "@/components/StatCard";
import { TrendingUp, TrendingDown, Scale, Download, Printer, FileSpreadsheet, Eye, EyeOff } from "lucide-react";
import { PublishedDetailedReport } from "@/components/PublishedDetailedReport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, type FlatStatus } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { TrendingUp as TrendUpIcon, TrendingDown as TrendDownIcon, Minus } from "lucide-react";
import { useBkashSettings } from "@/hooks/useBkashSettings";
import { round2 } from "@/lib/bkashMath";
import { residentName } from "@/lib/displayName";
import { ReportPadBackground } from "@/components/ReportPadBackground";

function paymentStatusOf(billed: number, collected: number): FlatStatus {
  if (billed <= 0) return "unpaid";
  if (collected >= billed) return "paid";
  if (collected <= 0) return "unpaid";
  return "partial";
}

function BalanceBadge({ value, lang }: { value: number; lang: "bn" | "en" }) {
  const variant = value > 0 ? "surplus" : value < 0 ? "deficit" : "even";
  const cfg = {
    surplus: { cls: "bg-success/15 text-success border-success/30", icon: TrendUpIcon, label: lang === "bn" ? "লাভ" : "Surplus" },
    deficit: { cls: "bg-destructive/15 text-destructive border-destructive/30", icon: TrendDownIcon, label: lang === "bn" ? "ঘাটতি" : "Deficit" },
    even:    { cls: "bg-muted text-muted-foreground border-border", icon: Minus, label: lang === "bn" ? "সমান" : "Even" },
  }[variant];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold", cfg.cls)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

type Bill = {
  flat_id: string;
  month: string;
  service_charge: number;
  gas_bill: number;
  parking: number;
  eid_bonus: number;
  other_charge: number;
  total: number;
  paid_amount: number;
};
type Expense = { date: string; category: string; amount: number };
type LoanRow = { loan_date: string; principal: number; lender_name: string | null; lender_name_bn: string | null };
type RepayRow = { paid_date: string; amount: number };
type OtherIncomeRow = { date: string; category: string; amount: number };
type Flat = { id: string; flat_no: string; owner_name: string | null; owner_name_bn: string | null; occupant_type: string | null; occupant_name: string | null; occupant_name_bn: string | null };

const currentMonth = () => new Date().toISOString().slice(0, 7);
const monthsAgo = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 7);
};

function enumerateMonths(from: string, to: string): string[] {
  const out: string[] = [];
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  let y = fy, m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

export default function AdminReports() {
  const { t, lang } = useLang();
  const [from, setFrom] = useState(currentMonth());
  const [to, setTo] = useState(currentMonth());
  const [flatFilter, setFlatFilter] = useState<string>("all");
  const [bills, setBills] = useState<Bill[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [repays, setRepays] = useState<RepayRow[]>([]);
  const [otherIncomes, setOtherIncomes] = useState<OtherIncomeRow[]>([]);
  const [expenseCats, setExpenseCats] = useState<{ name: string; name_bn: string | null }[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [flatCount, setFlatCount] = useState(0);
  const [bkashByMonth, setBkashByMonth] = useState<Record<string, number>>({});
  const [bkashTotal, setBkashTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPublishedPreview, setShowPublishedPreview] = useState(false);
  const { settings: bkash } = useBkashSettings();

  // Opening cash (carry-forward from before `from`) — backed by DB overrides
  const [autoOpening, setAutoOpening] = useState(0);
  const [openingOverride, setOpeningOverride] = useState<string>("");
  const [savedOverride, setSavedOverride] = useState<{ month: string; amount: number } | null>(null);
  const [anchorOverride, setAnchorOverride] = useState<{ month: string; amount: number } | null>(null);
  const [savingOpening, setSavingOpening] = useState(false);
  const openingCash = openingOverride.trim() === "" ? autoOpening : Number(openingOverride) || 0;

  // validate range
  const validRange = from <= to;

  useEffect(() => {
    if (!validRange) return;
    (async () => {
      setLoading(true);
      const monthStart = `${from}-01`;
      const [ty, tm] = to.split("-").map(Number);
      const next = new Date(Date.UTC(ty, tm, 1));
      const monthEnd = next.toISOString().slice(0, 10);

      // Find the latest opening-cash override at-or-before `from`
      const ocAnchorRes = await supabase
        .from("opening_cash_overrides")
        .select("month, amount")
        .lte("month", from)
        .order("month", { ascending: false })
        .limit(1)
        .maybeSingle();
      const anchor = (ocAnchorRes.data ?? null) as { month: string; amount: number } | null;
      const anchorMonth = anchor?.month ?? null;
      const anchorAmount = anchor ? Number(anchor.amount) : 0;
      const exact = anchor && anchor.month === from ? anchor : null;
      setAnchorOverride(anchor);
      setSavedOverride(exact);
      setOpeningOverride(exact ? String(exact.amount) : "");

      // Auto opening = (anchor amount) + sum of activity strictly between anchor month start and `from`
      // If no anchor, fall back to sum of all activity strictly before `from`.
      const autoFromDate = anchorMonth ? `${anchorMonth}-01` : "1900-01-01";

      const [billsRes, expRes, flatsRes, prevBillsRes, prevExpRes, bkashRes, loansRes, repayRes, prevLoansRes, prevRepayRes, oiRes, prevOiRes] = await Promise.all([
        supabase.from("bills")
          .select("flat_id, month, service_charge, gas_bill, parking, eid_bonus, other_charge, total, paid_amount")
          .gte("month", from).lte("month", to),
        supabase.from("expenses")
          .select("date, category, amount")
          .gte("date", monthStart).lt("date", monthEnd),
        supabase.from("flats")
          .select("id, flat_no, owner_name, owner_name_bn, occupant_type, occupant_name, occupant_name_bn")
          .order("flat_no", { ascending: true }),
        anchorMonth
          ? supabase.from("bills").select("paid_amount").gte("month", anchorMonth).lt("month", from)
          : supabase.from("bills").select("paid_amount").lt("month", from),
        anchorMonth
          ? supabase.from("expenses").select("amount").gte("date", autoFromDate).lt("date", monthStart)
          : supabase.from("expenses").select("amount").lt("date", monthStart),
        supabase.from("payment_requests")
          .select("amount, method, status, bills!inner(month)")
          .eq("method", "bkash").eq("status", "approved")
          .gte("bills.month", from).lte("bills.month", to),
        supabase.from("loans").select("loan_date, principal, lender_name, lender_name_bn")
          .gte("loan_date", monthStart).lt("loan_date", monthEnd),
        supabase.from("loan_repayments").select("paid_date, amount")
          .gte("paid_date", monthStart).lt("paid_date", monthEnd),
        anchorMonth
          ? supabase.from("loans").select("principal").gte("loan_date", autoFromDate).lt("loan_date", monthStart)
          : supabase.from("loans").select("principal").lt("loan_date", monthStart),
        anchorMonth
          ? supabase.from("loan_repayments").select("amount").gte("paid_date", autoFromDate).lt("paid_date", monthStart)
          : supabase.from("loan_repayments").select("amount").lt("paid_date", monthStart),
        supabase.from("other_incomes").select("date, category, amount")
          .gte("date", monthStart).lt("date", monthEnd),
        anchorMonth
          ? supabase.from("other_incomes").select("amount").gte("date", autoFromDate).lt("date", monthStart)
          : supabase.from("other_incomes").select("amount").lt("date", monthStart),
      ]);
      if (billsRes.error) toast.error(billsRes.error.message);
      if (expRes.error) toast.error(expRes.error.message);
      if (flatsRes.error) toast.error(flatsRes.error.message);
      setBills((billsRes.data ?? []) as Bill[]);
      setExpenses((expRes.data ?? []) as Expense[]);
      setLoans((loansRes.data ?? []) as LoanRow[]);
      setRepays((repayRes.data ?? []) as RepayRow[]);
      setFlats((flatsRes.data ?? []) as Flat[]);
      setFlatCount((flatsRes.data ?? []).length);
      setOtherIncomes((oiRes.data ?? []) as OtherIncomeRow[]);

      const catRes = await supabase.from("expense_categories").select("name, name_bn");
      setExpenseCats((catRes.data ?? []) as { name: string; name_bn: string | null }[]);

      const feeMap: Record<string, number> = {};
      let feeTotal = 0;
      for (const r of (bkashRes.data ?? []) as any[]) {
        const m = r.bills?.month;
        if (!m) continue;
        const fee = round2(Number(r.amount) * bkash.fee_pct);
        feeMap[m] = round2((feeMap[m] || 0) + fee);
        feeTotal = round2(feeTotal + fee);
      }
      setBkashByMonth(feeMap);
      setBkashTotal(feeTotal);

      const prevIncome = (prevBillsRes.data ?? []).reduce((s, b: any) => s + Number(b.paid_amount), 0);
      const prevExpense = (prevExpRes.data ?? []).reduce((s, e: any) => s + Number(e.amount), 0);
      const prevLoanIn = (prevLoansRes.data ?? []).reduce((s, l: any) => s + Number(l.principal), 0);
      const prevLoanOut = (prevRepayRes.data ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
      const prevOther = (prevOiRes.data ?? []).reduce((s, o: any) => s + Number(o.amount), 0);
      setAutoOpening(anchorAmount + prevIncome + prevOther - prevExpense + prevLoanIn - prevLoanOut);

      setLoading(false);
    })();
  }, [from, to, validRange, bkash.fee_pct]);

  const months = useMemo(() => validRange ? enumerateMonths(from, to) : [], [from, to, validRange]);

  const scopedBills = useMemo(
    () => flatFilter === "all" ? bills : bills.filter((b) => b.flat_id === flatFilter),
    [bills, flatFilter]
  );

  // Per-month aggregation
  const perMonth = useMemo(() => {
    return months.map((m) => {
      const mb = scopedBills.filter((b) => b.month === m);
      const me = expenses.filter((e) => e.date.slice(0, 7) === m);
      const ml = loans.filter((l) => (l.loan_date || "").slice(0, 7) === m);
      const mr = repays.filter((r) => (r.paid_date || "").slice(0, 7) === m);
      const mo = otherIncomes.filter((o) => (o.date || "").slice(0, 7) === m);
      const billed = mb.reduce((s, b) => s + Number(b.total), 0);
      const collected = mb.reduce((s, b) => s + Number(b.paid_amount), 0);
      const expense = me.reduce((s, e) => s + Number(e.amount), 0);
      const loanIn = ml.reduce((s, l) => s + Number(l.principal), 0);
      const loanOut = mr.reduce((s, r) => s + Number(r.amount), 0);
      const otherIn = mo.reduce((s, o) => s + Number(o.amount), 0);
      const expenseTotal = expense + loanOut; // loan repayment is treated as expense
      return { month: m, billed, collected, otherIn, expense, expenseTotal, loanIn, loanOut, balance: collected + otherIn - expenseTotal + loanIn };
    });
  }, [months, scopedBills, expenses, loans, repays, otherIncomes]);

  // Running closing balance per month (starts from openingCash)
  const perMonthRolling = useMemo(() => {
    let running = openingCash;
    return perMonth.map((r) => {
      const opening = running;
      running = opening + r.balance;
      return { ...r, opening, closing: running };
    });
  }, [perMonth, openingCash]);

  const totalIncome = perMonth.reduce((s, r) => s + r.collected, 0);
  const totalOtherIn = perMonth.reduce((s, r) => s + r.otherIn, 0);
  const totalBilled = perMonth.reduce((s, r) => s + r.billed, 0);
  const totalExpense = perMonth.reduce((s, r) => s + r.expense, 0);
  const totalExpenseAll = perMonth.reduce((s, r) => s + r.expenseTotal, 0);
  const totalLoanIn = perMonth.reduce((s, r) => s + r.loanIn, 0);
  const totalLoanOut = perMonth.reduce((s, r) => s + r.loanOut, 0);
  const operatingNet = totalIncome + totalOtherIn - totalExpenseAll;
  const balance = operatingNet + totalLoanIn;
  const closingBalance = openingCash + balance;
  const collectionRate = totalBilled > 0 ? Math.round((totalIncome / totalBilled) * 100) : 0;

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});
  const maxCat = Math.max(1, ...Object.values(byCategory));

  // Per-flat statement aggregation (across selected month range)
  const perFlat = useMemo(() => {
    const map = new Map<string, {
      flat_id: string;
      service: number; gas: number; parking: number; eid: number; other: number;
      billed: number; paid: number; due: number;
    }>();
    for (const f of flats) {
      map.set(f.id, { flat_id: f.id, service: 0, gas: 0, parking: 0, eid: 0, other: 0, billed: 0, paid: 0, due: 0 });
    }
    for (const b of scopedBills) {
      const row = map.get(b.flat_id);
      if (!row) continue;
      row.service += Number(b.service_charge);
      row.gas += Number(b.gas_bill);
      row.parking += Number(b.parking);
      row.eid += Number(b.eid_bonus);
      row.other += Number(b.other_charge);
      row.billed += Number(b.total);
      row.paid += Number(b.paid_amount);
    }
    for (const r of map.values()) r.due = r.billed - r.paid;
    return flats.map((f) => {
      const r = map.get(f.id)!;
      const isTenant = (f.occupant_type ?? "").toLowerCase() === "tenant";
      const roleText = lang === "bn" ? (isTenant ? "ভাড়াটিয়া" : "মালিক") : (isTenant ? "Tenant" : "Owner");
      const name = residentName(f, lang);
      return {
        ...r,
        flat_no: f.flat_no,
        owner: name ? `${name} (${roleText})` : "",
      };
    }).filter((r) => r.billed > 0 || r.paid > 0);
  }, [flats, scopedBills, lang, flatFilter]);

  const totalDue = perFlat.reduce((s, r) => s + r.due, 0);

  const fmtMonthLabel = (m: string) =>
    new Date(m + "-01").toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", { year: "numeric", month: "short" });

  const rangeLabel = months.length === 1
    ? new Date(from + "-01").toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", { year: "numeric", month: "long" })
    : `${fmtMonthLabel(from)} — ${fmtMonthLabel(to)}`;

  const setPreset = (mFrom: string, mTo: string) => { setFrom(mFrom); setTo(mTo); };

  const handlePrint = () => window.print();

  const handleCsvExport = () => {
    const esc = (v: string | number) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines: string[] = [];
    lines.push(`# ${lang === "bn" ? "মাসিক রিপোর্ট" : "Monthly Report"} — ${rangeLabel}`);
    lines.push("");
    lines.push([lang === "bn" ? "আগের ক্যাশ" : "Opening cash", openingCash, openingOverride.trim() !== "" ? (lang === "bn" ? "ম্যানুয়াল" : "Manual") : (lang === "bn" ? "অটো" : "Auto")].map(esc).join(","));
    lines.push("");
    lines.push([t("month"), lang === "bn" ? "আগের ক্যাশ" : "Opening", lang === "bn" ? "বিল" : "Billed", t("income"), lang === "bn" ? `বিকাশ ফি (মেটা)` : `bKash Fee (meta)`, t("expense"), lang === "bn" ? "নিট" : "Net", lang === "bn" ? "শেষ ব্যালেন্স" : "Closing"].map(esc).join(","));
    perMonthRolling.forEach((r) => {
      lines.push([fmtMonthLabel(r.month), r.opening, r.billed, r.collected, bkashByMonth[r.month] || 0, r.expenseTotal, r.balance, r.closing].map(esc).join(","));
    });
    lines.push([t("total"), openingCash, totalBilled, totalIncome, bkashTotal, totalExpenseAll, balance, closingBalance].map(esc).join(","));
    lines.push("");
    lines.push(`# ${t("expense")} — ${lang === "bn" ? "ক্যাটেগরি অনুযায়ী" : "By category"}`);
    lines.push([lang === "bn" ? "ক্যাটেগরি" : "Category", lang === "bn" ? "টাকা" : "Amount"].map(esc).join(","));
    Object.entries(byCategory).forEach(([cat, amt]) => {
      lines.push([t(cat as TKey) || cat, amt].map(esc).join(","));
    });
    lines.push("");
    lines.push(`# ${lang === "bn" ? "ফ্ল্যাট-ওয়াইজ স্টেটমেন্ট" : "Flat-wise Statement"}`);
    lines.push([
      lang === "bn" ? "ফ্ল্যাট" : "Flat",
      lang === "bn" ? "মালিক/বাসিন্দা" : "Owner/Occupant",
      t("serviceCharge"), t("gasBill"), t("parking"), t("eidBonus"), t("otherCharge"),
      lang === "bn" ? "মোট বিল" : "Billed",
      lang === "bn" ? "পরিশোধ" : "Paid",
      lang === "bn" ? "বাকি" : "Due",
    ].map(esc).join(","));
    perFlat.forEach((r) => {
      lines.push([r.flat_no, r.owner, r.service, r.gas, r.parking, r.eid, r.other, r.billed, r.paid, r.due].map(esc).join(","));
    });
    lines.push([t("total"), "",
      perFlat.reduce((s, r) => s + r.service, 0),
      perFlat.reduce((s, r) => s + r.gas, 0),
      perFlat.reduce((s, r) => s + r.parking, 0),
      perFlat.reduce((s, r) => s + r.eid, 0),
      perFlat.reduce((s, r) => s + r.other, 0),
      totalBilled, totalIncome, totalDue,
    ].map(esc).join(","));
    lines.push("");
    lines.push(`# ${lang === "bn" ? "সারসংক্ষেপ" : "Summary"}`);
    lines.push([lang === "bn" ? "মোট ফ্ল্যাট" : "Total flats", flatCount].map(esc).join(","));
    lines.push([t("collectionRate"), `${collectionRate}%`].map(esc).join(","));
    lines.push([lang === "bn" ? "মোট বাকি" : "Total due", totalDue].map(esc).join(","));
    lines.push([t("netBalance"), balance].map(esc).join(","));
    lines.push([lang === "bn" ? "শেষ ব্যালেন্স" : "Closing balance", closingBalance].map(esc).join(","));

    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${from}_to_${to}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(lang === "bn" ? "CSV ডাউনলোড হয়েছে" : "CSV downloaded");
  };

  return (
    <AppShell>
      <div className="space-y-6 print:space-y-3 print-area relative" id="report-printable">
        <ReportPadBackground />
        <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("monthlyReport")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{rangeLabel}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={showPublishedPreview ? "default" : "outline"}
              className="gap-2"
              onClick={() => setShowPublishedPreview((v) => !v)}
              title={lang === "bn" ? "ওনাররা যা দেখবেন" : "What owners see"}
            >
              {showPublishedPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {lang === "bn" ? "ওনার-ভিউ" : "Owner view"}
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleCsvExport}>
              <FileSpreadsheet className="h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" className="gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> {lang === "bn" ? "প্রিন্ট" : "Print"}
            </Button>
            <Button variant="default" className="gap-2" onClick={handlePrint}>
              <Download className="h-4 w-4" /> PDF
            </Button>
          </div>
        </div>

        {showPublishedPreview && (
          <div className="rounded-2xl border-2 border-dashed border-primary/30 p-3 print:hidden">
            <div className="text-xs font-semibold text-primary mb-2">
              {lang === "bn"
                ? `প্রিভিউ: ওনাররা ${from} মাসে এই রিপোর্ট দেখবেন`
                : `Preview: owners will see this for ${from}`}
            </div>
            <PublishedDetailedReport month={from} />
          </div>
        )}

        {/* Print-only running header (repeats on every printed page) */}
        <div className="hidden print:block print-running-header">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <div className="text-base font-bold">
                {lang === "bn" ? "শেখ বাচ্চু টাওয়ার সোসাইটি" : "Sheikh Bachchu Tower Society"}
              </div>
              <div className="text-[10px] leading-tight">
                {lang === "bn"
                  ? "১৪/২, শেখ বাচ্চু টাওয়ার, মোক্তারবাড়ী রোড, আউচপাড়া, টঙ্গী, গাজীপুর।"
                  : "14/2, Sheikh Bachchu Tower, Moktarbari Road, Auchpara, Tongi, Gazipur."}
              </div>
              <div className="text-xs mt-0.5">
                {t("monthlyReport")} — {rangeLabel}
              </div>
            </div>
            <div className="text-xs text-right">
              {lang === "bn" ? "তৈরি" : "Generated"}:{" "}
              {new Date().toLocaleString(lang === "bn" ? "bn-BD" : "en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </div>
          </div>
        </div>

        {/* Print-only running footer (repeats on every printed page) */}
        <div className="hidden print:block print-running-footer">
          <div className="flex items-start justify-between gap-4">
            <div>
              {lang === "bn"
                ? "সোর্স: bills (পরিশোধ ও বিল হিসাব), expenses (খরচ হিসাব) — Sheikh Bachchu Tower ডাটাবেজ।"
                : "Source: bills (billed & paid amounts), expenses (expense entries) — Sheikh Bachchu Tower database."}
            </div>
            <div>
              {lang === "bn" ? "প্রিন্ট" : "Printed"}:{" "}
              {new Date().toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US")}
            </div>
          </div>
        </div>

        {/* Spacer so first-page content clears the running header */}
        <div className="hidden print:block" style={{ height: "22mm" }} />

        {/* Print-only consolidated cash summary (Opening → +Income → +Other → +Loan In − Expense − Loan Out → Closing) */}
        <div className="hidden print:block rounded-2xl border border-border p-3">
          <div className="text-sm font-bold mb-2 border-b border-border pb-1">
            {lang === "bn" ? "ক্যাশ সারসংক্ষেপ" : "Cash Summary"}
            <span className="ml-2 text-xs font-normal opacity-70">({rangeLabel})</span>
          </div>
          <table className="w-full text-xs">
            <tbody>
              <tr><td className="py-0.5">{lang === "bn" ? "আগের ক্যাশ (Opening)" : "Opening Cash"}</td>
                  <td className="py-0.5 text-right font-semibold">{formatMoney(openingCash, lang)}</td></tr>
              <tr><td className="py-0.5">+ {lang === "bn" ? "বিল আদায় (Collected)" : "Bill Collection"}</td>
                  <td className="py-0.5 text-right">{formatMoney(totalIncome, lang)}</td></tr>
              <tr><td className="py-0.5">+ {lang === "bn" ? "অন্যান্য আয়" : "Other Income"}</td>
                  <td className="py-0.5 text-right">{formatMoney(totalOtherIn, lang)}</td></tr>
              <tr><td className="py-0.5">+ {lang === "bn" ? "লোন গ্রহণ (Loan In)" : "Loan Taken (In)"}</td>
                  <td className="py-0.5 text-right">{formatMoney(totalLoanIn, lang)}</td></tr>
              <tr><td className="py-0.5">− {lang === "bn" ? "মোট খরচ" : "Total Expense"}</td>
                  <td className="py-0.5 text-right">{formatMoney(totalExpense, lang)}</td></tr>
              <tr><td className="py-0.5">− {lang === "bn" ? "লোন পরিশোধ (Loan Out)" : "Loan Repaid (Out)"}</td>
                  <td className="py-0.5 text-right">{formatMoney(totalLoanOut, lang)}</td></tr>
              <tr className="border-t border-border">
                <td className="py-1 font-semibold">{lang === "bn" ? "নিট ক্যাশ ফ্লো (Net)" : "Net Cash Flow"}</td>
                <td className={`py-1 text-right font-semibold ${balance >= 0 ? "" : "text-destructive"}`}>{formatMoney(balance, lang)}</td>
              </tr>
              <tr className="border-t-2 border-foreground/40">
                <td className="py-1 font-bold">{lang === "bn" ? "শেষ ব্যালেন্স (Closing)" : "Closing Balance"}</td>
                <td className={`py-1 text-right font-bold ${closingBalance >= 0 ? "" : "text-destructive"}`}>{formatMoney(closingBalance, lang)}</td>
              </tr>
            </tbody>
          </table>
        </div>


        {/* Filters */}
        <div className="rounded-2xl bg-card border border-border p-4 sm:p-6 shadow-soft print:hidden">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div>
              <Label className="text-xs">{lang === "bn" ? "শুরু মাস" : "From month"}</Label>
              <Input type="month" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{lang === "bn" ? "শেষ মাস" : "To month"}</Label>
              <Input type="month" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2 sm:items-end">
              <Button size="sm" variant="outline" onClick={() => setPreset(currentMonth(), currentMonth())}>
                {lang === "bn" ? "এ মাস" : "This month"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPreset(monthsAgo(11), currentMonth())}>
                {lang === "bn" ? "১২ মাস" : "12 months"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPreset(monthsAgo(23), currentMonth())}>
                {lang === "bn" ? "২ বছর" : "2 years"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPreset(monthsAgo(59), currentMonth())}>
                {lang === "bn" ? "৫ বছর" : "5 years"}
              </Button>
            </div>
          </div>
          {!validRange && (
            <p className="text-sm text-destructive mt-2">{lang === "bn" ? "শুরু মাস শেষ মাসের আগে হতে হবে" : "From must be ≤ To"}</p>
          )}

          {/* Flat filter */}
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] items-end">
            <div>
              <Label className="text-xs">{lang === "bn" ? "ফ্ল্যাট ফিল্টার" : "Flat filter"}</Label>
              <select
                value={flatFilter}
                onChange={(e) => setFlatFilter(e.target.value)}
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">{lang === "bn" ? "সব ফ্ল্যাট" : "All flats"}</option>
                {flats.map((f) => {
                  const isTenant = (f.occupant_type ?? "").toLowerCase() === "tenant";
                  const roleText = lang === "bn" ? (isTenant ? "ভাড়াটিয়া" : "মালিক") : (isTenant ? "Tenant" : "Owner");
                  const n = residentName(f, lang);
                  return (
                    <option key={f.id} value={f.id}>
                      {lang === "bn" ? "ফ্ল্যাট" : "Flat"} {f.flat_no}
                      {n ? ` — ${n} (${roleText})` : ` (${roleText})`}
                    </option>
                  );
                })}
              </select>
              {flatFilter !== "all" && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {lang === "bn"
                    ? "নোট: শুধু এই ফ্ল্যাটের বিল/কালেকশনে স্কোপড। খরচ ও লোন সব মিলিয়ে দেখানো হচ্ছে।"
                    : "Note: scoped to this flat's bills/collection only. Expenses & loans remain society-wide."}
                </p>
              )}
            </div>
            {flatFilter !== "all" && (
              <Button size="sm" variant="ghost" onClick={() => setFlatFilter("all")}>
                {lang === "bn" ? "ক্লিয়ার" : "Clear"}
              </Button>
            )}
          </div>

          {/* Opening cash override */}
          <div className="mt-4 border-t border-border pt-4 space-y-2">
            {anchorOverride && anchorOverride.month < from && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-xs px-3 py-2">
                {lang === "bn"
                  ? `⚠️ পূর্বের ${anchorOverride.month} মাসে আগের ক্যাশ ম্যানুয়ালি সেভ করা আছে (${formatMoney(Number(anchorOverride.amount), lang)})। অটো ক্যাশ ঐ ভিত্তি থেকে হিসাব হচ্ছে। যদি ${from} থেকে আগের ডাটা ঢোকান, তাহলে আগে ${anchorOverride.month} মাসের সেভড ক্যাশ ডিলিট করুন — না হলে অটো ডাটা সঠিক হবে না।`
                  : `⚠️ A saved opening cash exists for ${anchorOverride.month} (${formatMoney(Number(anchorOverride.amount), lang)}). Auto is anchored from that month. If you add older data before ${from}, delete the saved entry for ${anchorOverride.month} first — otherwise auto won't pull that data.`}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
              <div>
                <Label className="text-xs">
                  {lang === "bn" ? `আগের ক্যাশ (${from})` : `Opening cash (${from})`}
                </Label>
                <Input
                  type="number"
                  placeholder={`${lang === "bn" ? "অটো" : "Auto"}: ${formatMoney(autoOpening, lang)}`}
                  value={openingOverride}
                  onChange={(e) => setOpeningOverride(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  {savedOverride
                    ? (lang === "bn"
                        ? `✅ ${from} এর জন্য সেভড: ${formatMoney(savedOverride.amount, lang)}`
                        : `✅ Saved for ${from}: ${formatMoney(savedOverride.amount, lang)}`)
                    : (lang === "bn"
                        ? `অটো হিসাব: ${formatMoney(autoOpening, lang)} (চাইলে নিজে বসিয়ে সেভ করুন)`
                        : `Auto: ${formatMoney(autoOpening, lang)}. Override and save if needed.`)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="default"
                  disabled={savingOpening || openingOverride.trim() === ""}
                  onClick={async () => {
                    setSavingOpening(true);
                    const amount = Number(openingOverride);
                    const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
                    const { error } = await supabase
                      .from("opening_cash_overrides")
                      .upsert({ month: from, amount, created_by: uid }, { onConflict: "month" });
                    setSavingOpening(false);
                    if (error) toast.error(error.message);
                    else {
                      toast.success(lang === "bn" ? "সেভ হয়েছে" : "Saved");
                      setSavedOverride({ month: from, amount });
                      setAnchorOverride({ month: from, amount });
                    }
                  }}
                >
                  {savedOverride ? (lang === "bn" ? "আপডেট" : "Update") : (lang === "bn" ? "সেভ" : "Save")}
                </Button>
                {savedOverride && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={savingOpening}
                    onClick={async () => {
                      if (!confirm(lang === "bn" ? `${from} এর সেভড ক্যাশ ডিলিট করবেন?` : `Delete saved opening cash for ${from}?`)) return;
                      setSavingOpening(true);
                      const { error } = await supabase.from("opening_cash_overrides").delete().eq("month", from);
                      setSavingOpening(false);
                      if (error) toast.error(error.message);
                      else {
                        toast.success(lang === "bn" ? "ডিলিট হয়েছে" : "Deleted");
                        setSavedOverride(null);
                        setOpeningOverride("");
                        setFrom((m) => m + "");
                      }
                    }}
                  >
                    {lang === "bn" ? "সেভড ডিলিট" : "Delete saved"}
                  </Button>
                )}
                {openingOverride.trim() !== "" && !savedOverride && (
                  <Button size="sm" variant="ghost" onClick={() => setOpeningOverride("")}>
                    {lang === "bn" ? "অটোতে রিসেট" : "Reset to auto"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={lang === "bn" ? "আগের ক্যাশ" : "Opening Cash"} value={formatMoney(openingCash, lang)} hint={openingOverride.trim() !== "" ? (lang === "bn" ? "ম্যানুয়াল" : "Manual") : (lang === "bn" ? "অটো" : "Auto")} icon={Scale} variant="primary" />
            <StatCard label={t("income")} value={formatMoney(totalIncome + totalOtherIn, lang)} hint={totalOtherIn > 0 ? `${lang === "bn" ? "বিল" : "Bills"}: ${formatMoney(totalIncome, lang)} · ${lang === "bn" ? "অন্যান্য" : "Other"}: ${formatMoney(totalOtherIn, lang)}` : `${formatNumber(collectionRate, lang)}% ${t("collectionRate")}`} icon={TrendingUp} variant="success" />
            <StatCard label={t("expense")} value={formatMoney(totalExpenseAll, lang)} hint={totalLoanOut > 0 ? (lang === "bn" ? `নিয়মিত: ${formatMoney(totalExpense, lang)} + লোন পরিশোধ: ${formatMoney(totalLoanOut, lang)}` : `Regular: ${formatMoney(totalExpense, lang)} + Loan: ${formatMoney(totalLoanOut, lang)}`) : `${formatNumber(expenses.length, lang)} ${lang === "bn" ? "টি এন্ট্রি" : "entries"}`} icon={TrendingDown} variant="warning" />
            <StatCard label={lang === "bn" ? "শেষ ব্যালেন্স" : "Closing Balance"} value={formatMoney(closingBalance, lang)} hint={`${lang === "bn" ? "এ মাসের লাভ/ঘাটতি" : "Period net"}: ${formatMoney(balance, lang)}`} icon={Scale} variant={closingBalance >= 0 ? "primary" : "destructive"} />
          </div>
        )}

        {/* Per-month summary table */}
        <div className="rounded-2xl bg-card border border-border p-4 sm:p-6 shadow-soft overflow-x-auto">
          <h2 className="font-semibold text-foreground mb-4">
            {lang === "bn" ? "মাসভিত্তিক সারসংক্ষেপ" : "Monthly Summary"}
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-3">{t("month")}</th>
                <th className="py-2 pr-3 text-right">{lang === "bn" ? "আগের ক্যাশ" : "Opening"}</th>
                <th className="py-2 pr-3 text-right">{lang === "bn" ? "বিল" : "Billed"}</th>
                <th className="py-2 pr-3 text-right">{t("income")}</th>
                <th className="py-2 pr-3 text-right" title={lang === "bn" ? "শুধু তথ্য — লেজারে যোগ হয়নি" : "Info only — not in ledger"}>
                  {lang === "bn" ? `বিকাশ ফি (${(bkash.fee_pct*100).toFixed(2)}%)` : `bKash Fee (${(bkash.fee_pct*100).toFixed(2)}%)`}
                  <span className="ml-1 text-[10px] font-normal opacity-70">({lang === "bn" ? "মেটা" : "meta"})</span>
                </th>
                <th className="py-2 pr-3 text-right text-success" title={lang === "bn" ? "অনুদান/পাওনা/অন্যান্য" : "Donation/recovery/other"}>
                  {lang === "bn" ? "অন্যান্য আয়" : "Other Income"}
                </th>
                <th className="py-2 pr-3 text-right">{t("expense")}</th>
                <th className="py-2 pr-3 text-right text-success" title={lang === "bn" ? "লোন গ্রহণ — ক্যাশ ইন" : "Loan taken — cash in"}>
                  {lang === "bn" ? "লোন (ইন)" : "Loan In"}
                </th>
                <th className="py-2 pr-3 text-right text-warning" title={lang === "bn" ? "লোন পরিশোধ — ক্যাশ আউট" : "Loan repaid — cash out"}>
                  {lang === "bn" ? "পরিশোধ (আউট)" : "Loan Out"}
                </th>
                <th className="py-2 pr-3 text-right">{lang === "bn" ? "নিট ক্যাশ ফ্লো" : "Net Cash Flow"}</th>
                <th className="py-2 pr-3 text-right">{lang === "bn" ? "শেষ ব্যালেন্স" : "Closing"}</th>
                <th className="py-2 pr-3">{lang === "bn" ? "পেমেন্ট" : "Payment"}</th>
              </tr>
            </thead>
            <tbody>
              {perMonthRolling.map((r) => (
                <tr key={r.month} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-medium">{fmtMonthLabel(r.month)}</td>
                  <td className="py-2 pr-3 text-right text-muted-foreground">{formatMoney(r.opening, lang)}</td>
                  <td className="py-2 pr-3 text-right">{formatMoney(r.billed, lang)}</td>
                  <td className="py-2 pr-3 text-right text-success">{formatMoney(r.collected, lang)}</td>
                  <td className="py-2 pr-3 text-right text-muted-foreground italic">{formatMoney(bkashByMonth[r.month] || 0, lang)}</td>
                  <td className="py-2 pr-3 text-right text-success">{r.otherIn > 0 ? formatMoney(r.otherIn, lang) : "—"}</td>
                  <td className="py-2 pr-3 text-right text-warning" title={r.loanOut > 0 ? (lang === "bn" ? `নিয়মিত ব্যয়: ${formatMoney(r.expense, lang)} + লোন পরিশোধ: ${formatMoney(r.loanOut, lang)}` : `Regular: ${formatMoney(r.expense, lang)} + Loan repaid: ${formatMoney(r.loanOut, lang)}`) : undefined}>
                    {formatMoney(r.expenseTotal, lang)}
                    {r.loanOut > 0 && (
                      <div className="text-[10px] text-muted-foreground font-normal">
                        {lang === "bn" ? `+${formatMoney(r.loanOut, lang)} লোন পরিশোধ` : `incl. ${formatMoney(r.loanOut, lang)} loan repaid`}
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right text-success">{r.loanIn > 0 ? formatMoney(r.loanIn, lang) : "—"}</td>
                  <td className="py-2 pr-3 text-right text-warning">{r.loanOut > 0 ? formatMoney(r.loanOut, lang) : "—"}</td>
                  <td className={`py-2 pr-3 text-right font-semibold ${r.balance >= 0 ? "text-foreground" : "text-destructive"}`}>
                    {formatMoney(r.balance, lang)}
                  </td>
                  <td className={`py-2 pr-3 text-right font-bold ${r.closing >= 0 ? "text-primary" : "text-destructive"}`}>
                    {formatMoney(r.closing, lang)}
                  </td>
                  <td className="py-2 pr-3"><StatusBadge status={paymentStatusOf(r.billed, r.collected)} /></td>
                </tr>
              ))}
              {perMonth.length === 0 && (
                <tr><td colSpan={12} className="py-6 text-center text-muted-foreground">{t("noData")}</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-foreground/20 font-bold">
                <td className="py-2 pr-3">{t("total")}</td>
                <td className="py-2 pr-3 text-right text-muted-foreground">{formatMoney(openingCash, lang)}</td>
                <td className="py-2 pr-3 text-right">{formatMoney(totalBilled, lang)}</td>
                <td className="py-2 pr-3 text-right text-success">{formatMoney(totalIncome, lang)}</td>
                <td className="py-2 pr-3 text-right text-muted-foreground italic">{formatMoney(bkashTotal, lang)}</td>
                <td className="py-2 pr-3 text-right text-success">{formatMoney(totalOtherIn, lang)}</td>
                <td className="py-2 pr-3 text-right text-warning">{formatMoney(totalExpenseAll, lang)}</td>
                <td className="py-2 pr-3 text-right text-success">{formatMoney(totalLoanIn, lang)}</td>
                <td className="py-2 pr-3 text-right text-warning">{formatMoney(totalLoanOut, lang)}</td>
                <td className={`py-2 pr-3 text-right ${balance >= 0 ? "text-foreground" : "text-destructive"}`}>
                  {formatMoney(balance, lang)}
                </td>
                <td className={`py-2 pr-3 text-right ${closingBalance >= 0 ? "text-primary" : "text-destructive"}`}>
                  {formatMoney(closingBalance, lang)}
                </td>
                <td className="py-2 pr-3"><StatusBadge status={paymentStatusOf(totalBilled, totalIncome)} /></td>
              </tr>
            </tfoot>
          </table>
          <p className="text-[11px] text-muted-foreground mt-3 italic">
            {lang === "bn"
              ? `* বিকাশ ফি (${(bkash.fee_pct*100).toFixed(2)}%) মালিক বিকাশকে দেন — সোসাইটির আয়/লেজারে যোগ হয় না, শুধু মেলানোর জন্য দেখানো।`
              : `* bKash fee (${(bkash.fee_pct*100).toFixed(2)}%) is paid by owners directly to bKash — not part of society income/ledger; shown only for reconciliation.`}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 italic">
            {lang === "bn"
              ? "* লোন (ইন/আউট) ক্যাশ ফ্লোতে যোগ — operating আয়-ব্যয় না, কিন্তু হাতের ক্যাশে এফেক্ট ফেলে। নিট ক্যাশ ফ্লো = আদায় − ব্যয় + লোন − পরিশোধ।"
              : "* Loans (in/out) affect cash flow — not operating P&L, but they change cash on hand. Net Cash Flow = Income − Expense + Loan In − Loan Out."}
          </p>
        </div>

        {/* Flat-wise statement */}
        <div className="rounded-2xl bg-card border border-border p-4 sm:p-6 shadow-soft overflow-x-auto">
          <h2 className="font-semibold text-foreground mb-4">
            {lang === "bn" ? "ফ্ল্যাট-ওয়াইজ স্টেটমেন্ট" : "Flat-wise Statement"}
            <span className="ml-2 text-xs text-muted-foreground font-normal">({rangeLabel})</span>
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-3">{lang === "bn" ? "ফ্ল্যাট" : "Flat"}</th>
                <th className="py-2 pr-3">{lang === "bn" ? "মালিক/বাসিন্দা" : "Owner/Occupant"}</th>
                <th className="py-2 pr-3 text-right">{t("serviceCharge")}</th>
                <th className="py-2 pr-3 text-right">{t("gasBill")}</th>
                <th className="py-2 pr-3 text-right">{t("parking")}</th>
                <th className="py-2 pr-3 text-right">{lang === "bn" ? "মোট বিল" : "Billed"}</th>
                <th className="py-2 pr-3 text-right">{lang === "bn" ? "পরিশোধ" : "Paid"}</th>
                <th className="py-2 pr-3 text-right">{lang === "bn" ? "বাকি" : "Due"}</th>
                <th className="py-2 pr-3">{lang === "bn" ? "স্ট্যাটাস" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              {perFlat.map((r) => (
                <tr key={r.flat_id} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-medium">{r.flat_no}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{r.owner || "—"}</td>
                  <td className="py-2 pr-3 text-right">{formatMoney(r.service, lang)}</td>
                  <td className="py-2 pr-3 text-right">{formatMoney(r.gas, lang)}</td>
                  <td className="py-2 pr-3 text-right">{formatMoney(r.parking, lang)}</td>
                  <td className="py-2 pr-3 text-right">{formatMoney(r.billed, lang)}</td>
                  <td className="py-2 pr-3 text-right text-success">{formatMoney(r.paid, lang)}</td>
                  <td className={`py-2 pr-3 text-right font-semibold ${r.due > 0 ? "text-destructive" : "text-foreground"}`}>
                    {formatMoney(r.due, lang)}
                  </td>
                  <td className="py-2 pr-3"><StatusBadge status={paymentStatusOf(r.billed, r.paid)} /></td>
                </tr>
              ))}
              {perFlat.length === 0 && (
                <tr><td colSpan={9} className="py-6 text-center text-muted-foreground">{t("noData")}</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-foreground/20 font-bold">
                <td className="py-2 pr-3" colSpan={2}>{t("total")}</td>
                <td className="py-2 pr-3 text-right">{formatMoney(perFlat.reduce((s, r) => s + r.service, 0), lang)}</td>
                <td className="py-2 pr-3 text-right">{formatMoney(perFlat.reduce((s, r) => s + r.gas, 0), lang)}</td>
                <td className="py-2 pr-3 text-right">{formatMoney(perFlat.reduce((s, r) => s + r.parking, 0), lang)}</td>
                <td className="py-2 pr-3 text-right">{formatMoney(totalBilled, lang)}</td>
                <td className="py-2 pr-3 text-right text-success">{formatMoney(totalIncome, lang)}</td>
                <td className={`py-2 pr-3 text-right ${totalDue > 0 ? "text-destructive" : "text-foreground"}`}>
                  {formatMoney(totalDue, lang)}
                </td>
                <td className="py-2 pr-3"><StatusBadge status={paymentStatusOf(totalBilled, totalIncome)} /></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-card border border-border p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-dashed border-border">
              <span className="text-sm font-semibold text-muted-foreground">
                {lang === "bn" ? "পূর্বের ক্যাশ" : "Opening Cash"}
              </span>
              <span className={`text-sm font-bold ${openingCash < 0 ? "text-destructive" : "text-foreground"}`}>
                {formatMoney(openingCash, lang)}
              </span>
            </div>
            <h2 className="font-semibold text-foreground mb-1">{t("income")}</h2>
            <p className="text-xs text-muted-foreground mb-4">
              {lang === "bn"
                ? "মোট বিল × ফ্ল্যাট সংখ্যা ভিত্তিক হিসাব (নিচে শুধু বিশ্লেষণ — যোগ হবে না)"
                : "Total bill × flat count (breakdown below is reference only — not summed)"}
            </p>
            <div className="space-y-5">
              {(() => {
                type Key = "service_charge" | "gas_bill" | "parking" | "eid_bonus" | "other_charge";
                const sections: { key: Key; label: string }[] = [
                  { key: "service_charge", label: t("serviceCharge") },
                  { key: "gas_bill",       label: t("gasBill") },
                  { key: "parking",        label: t("parking") },
                  { key: "eid_bonus",      label: t("eidBonus") },
                  { key: "other_charge",   label: t("otherCharge") },
                ];

                // Total bill per flat = sum of all bills for that flat in range
                const flatTotals = new Map<string, number>();
                for (const b of bills) {
                  flatTotals.set(b.flat_id, (flatTotals.get(b.flat_id) || 0) + Number(b.total));
                }
                // Group flats by their total bill: amount -> count
                const flatBuckets = new Map<number, number>();
                for (const total of flatTotals.values()) {
                  if (total <= 0) continue;
                  flatBuckets.set(total, (flatBuckets.get(total) || 0) + 1);
                }
                const flatRows = Array.from(flatBuckets.entries())
                  .sort((a, b) => b[0] - a[0])
                  .map(([amt, count]) => ({ amt, count, sum: amt * count }));
                const grandBilled = flatRows.reduce((s, r) => s + r.sum, 0);

                // Breakdown per category (reference only)
                const grouped = sections.map((sec) => {
                  const buckets = new Map<number, number>();
                  for (const b of bills) {
                    const rate = Number(b[sec.key]);
                    if (!rate || rate <= 0) continue;
                    buckets.set(rate, (buckets.get(rate) || 0) + 1);
                  }
                  const rows = Array.from(buckets.entries())
                    .sort((a, b) => b[0] - a[0])
                    .map(([rate, count]) => ({ rate, count, amount: rate * count }));
                  const subtotal = rows.reduce((s, r) => s + r.amount, 0);
                  return { ...sec, rows, subtotal };
                });

                // Loan rows: group by lender
                const loanByLender = new Map<string, number>();
                for (const l of loans) {
                  const name = (lang === "bn" ? (l.lender_name_bn || l.lender_name) : (l.lender_name || l.lender_name_bn)) || (lang === "bn" ? "অজ্ঞাত" : "Unknown");
                  loanByLender.set(name, (loanByLender.get(name) || 0) + Number(l.principal));
                }
                const loanLenderRows = Array.from(loanByLender.entries()).sort((a, b) => b[1] - a[1]);

                // Other income by category
                const oiByCat = new Map<string, number>();
                for (const o of otherIncomes) {
                  oiByCat.set(o.category, (oiByCat.get(o.category) || 0) + Number(o.amount));
                }
                const oiCatLabel: Record<string, { bn: string; en: string }> = {
                  donation: { bn: "অনুদান", en: "Donation" },
                  dues_recovery: { bn: "বকেয়া আদায়", en: "Dues Recovery" },
                  external_rent: { bn: "অন্যান্য ভাড়া", en: "Other Rent" },
                  bank_interest_other: { bn: "ব্যাংক ইন্টারেস্ট/অন্যান্য", en: "Bank Interest / Others" },
                };
                const oiRows = Array.from(oiByCat.entries()).sort((a, b) => b[1] - a[1]);

                return (
                  <>
                    {/* Main calculation: total bill × flat count */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-foreground">
                          {lang === "bn" ? "মোট বিল × ফ্ল্যাট" : "Total Bill × Flats"}
                        </span>
                        <span className="text-sm font-bold text-success">{formatMoney(grandBilled, lang)}</span>
                      </div>
                      {flatRows.length === 0 ? (
                        <div className="text-xs text-muted-foreground pl-2">{t("noData")}</div>
                      ) : (
                        <div className="space-y-1 pl-2 border-l-2 border-success/40">
                          {flatRows.map((r) => (
                            <div key={r.amt} className="flex items-center justify-between text-xs pl-3">
                              <span className="text-muted-foreground font-mono">
                                {formatMoney(r.amt, lang)} × {formatNumber(r.count, lang)}
                              </span>
                              <span className="text-foreground tabular-nums font-semibold">{formatMoney(r.sum, lang)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t-2 border-foreground/20">
                      <span className="font-semibold">{lang === "bn" ? "মোট বিল (আয়)" : "Total Billed (Income)"}</span>
                      <span className="font-bold text-success text-lg">{formatMoney(grandBilled, lang)}</span>
                    </div>

                    {/* Loan taken (cash in) */}
                    {totalLoanIn > 0 && (
                      <div className="pt-3 border-t border-dashed border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground">
                            {lang === "bn" ? "লোন নেয়া (ক্যাশ ইন)" : "Loan Taken (Cash In)"}
                          </span>
                          <span className="text-sm font-bold text-success">{formatMoney(totalLoanIn, lang)}</span>
                        </div>
                      </div>
                    )}

                    {/* Other income by category */}
                    <div className="pt-3 border-t border-dashed border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-foreground">
                          {lang === "bn" ? "অন্যান্য আয়" : "Other Income"}
                        </span>
                        <span className="text-sm font-bold text-success">{formatMoney(totalOtherIn, lang)}</span>
                      </div>
                      {oiRows.length === 0 ? (
                        <div className="text-xs text-muted-foreground pl-2">—</div>
                      ) : (
                        <div className="space-y-1 pl-2 border-l-2 border-success/40">
                          {oiRows.map(([cat, amt]) => (
                            <div key={cat} className="flex items-center justify-between text-xs pl-3">
                              <span className="text-muted-foreground truncate">{oiCatLabel[cat]?.[lang] ?? cat}</span>
                              <span className="text-foreground tabular-nums font-semibold">{formatMoney(amt, lang)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t-2 border-success/40">
                      <span className="font-semibold">{lang === "bn" ? "সর্বমোট কালেকশন" : "Total Collection"}</span>
                      <span className="font-bold text-success text-lg">{formatMoney(totalIncome + totalOtherIn + totalLoanIn, lang)}</span>
                    </div>

                    {/* Reference-only breakdown by category */}
                    <div className="pt-4 mt-2 border-t border-dashed border-border">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                        {lang === "bn" ? "বিশ্লেষণ (শুধু রেফারেন্স — যোগ হবে না)" : "Breakdown (reference only — not summed)"}
                      </div>
                      <div className="space-y-4">
                        {grouped.map((sec) => (
                          <div key={sec.key}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-muted-foreground">{sec.label}</span>
                              <span className="text-xs text-muted-foreground">{formatMoney(sec.subtotal, lang)}</span>
                            </div>
                            {sec.rows.length === 0 ? (
                              <div className="text-[11px] text-muted-foreground pl-2">—</div>
                            ) : (
                              <div className="space-y-0.5 pl-2 border-l border-border">
                                {sec.rows.map((r) => (
                                  <div key={r.rate} className="flex items-center justify-between text-[11px] pl-3 text-muted-foreground">
                                    <span className="font-mono">
                                      {formatMoney(r.rate, lang)} × {formatNumber(r.count, lang)}
                                    </span>
                                    <span className="tabular-nums">{formatMoney(r.amount, lang)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="rounded-2xl bg-card border border-border p-6 shadow-soft">
            <h2 className="font-semibold text-foreground mb-4">{t("expense")}</h2>
            <div className="space-y-3">
              {Object.entries(byCategory).length === 0 && (
                <div className="text-sm text-muted-foreground">{t("noData")}</div>
              )}
              {Object.entries(byCategory).map(([cat, amt]) => {
                const cd = expenseCats.find((c) => c.name === cat);
                const label = lang === "bn" ? (cd?.name_bn || cd?.name || (t(cat as TKey) as string) || cat) : (cd?.name || (t(cat as TKey) as string) || cat);
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold text-foreground">{formatMoney(amt, lang)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden print:hidden">
                      <div className="h-full gradient-primary" style={{ width: `${(amt / maxCat) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
              {totalLoanOut > 0 && (
                <div className="pt-2 border-t border-dashed border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{lang === "bn" ? "লোন পরিশোধ (ক্যাশ আউট)" : "Loan Repaid (Cash Out)"}</span>
                    <span className="font-semibold text-foreground">{formatMoney(totalLoanOut, lang)}</span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between pt-3 border-t-2 border-foreground/20">
                <span className="font-semibold">{lang === "bn" ? "সর্বমোট ব্যয়" : "Total Expense"}</span>
                <span className="font-bold text-warning text-lg">{formatMoney(totalExpenseAll, lang)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl gradient-hero text-primary-foreground p-6 sm:p-8 shadow-elevated print:bg-secondary print:text-foreground">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 text-center sm:text-left">
            <div>
              <div className="text-xs uppercase opacity-80">{lang === "bn" ? "আগের ক্যাশ" : "Opening"}</div>
              <div className="text-xl font-bold mt-1">{formatMoney(openingCash, lang)}</div>
            </div>
            <div>
              <div className="text-xs uppercase opacity-80">{t("income")}</div>
              <div className="text-xl font-bold mt-1">+{formatMoney(totalIncome, lang)}</div>
            </div>
            <div>
              <div className="text-xs uppercase opacity-80">{t("expense")}</div>
              <div className="text-xl font-bold mt-1">−{formatMoney(totalExpenseAll, lang)}</div>
            </div>
            <div>
              <div className="text-xs uppercase opacity-80">{lang === "bn" ? "নিট" : "Net"}</div>
              <div className={`text-xl font-bold mt-1 ${balance < 0 ? "text-destructive-foreground" : ""}`}>{formatMoney(balance, lang)}</div>
            </div>
            <div className="border-t lg:border-t-0 lg:border-l border-primary-foreground/30 pt-3 lg:pt-0 lg:pl-4">
              <div className="text-xs uppercase opacity-80">{lang === "bn" ? "শেষ ব্যালেন্স" : "Closing"}</div>
              <div className="text-2xl font-bold mt-1">{formatMoney(closingBalance, lang)}</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-primary-foreground/30 grid gap-2 sm:grid-cols-2 text-xs opacity-90">
            <div>{lang === "bn" ? "মোট ফ্ল্যাট" : "Total flats"}: <span className="font-bold">{formatNumber(flatCount, lang)}</span></div>
            <div>{t("collectionRate")}: <span className="font-bold">{formatNumber(collectionRate, lang)}%</span></div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
