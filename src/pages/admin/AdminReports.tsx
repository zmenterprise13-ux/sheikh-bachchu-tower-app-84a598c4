import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney, formatNumber, TKey } from "@/i18n/translations";
import { StatCard } from "@/components/StatCard";
import { TrendingUp, TrendingDown, Scale, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

type Bill = {
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
  const [bills, setBills] = useState<Bill[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [flatCount, setFlatCount] = useState(0);
  const [loading, setLoading] = useState(true);

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

      const [billsRes, expRes, flatsRes] = await Promise.all([
        supabase.from("bills")
          .select("month, service_charge, gas_bill, parking, eid_bonus, other_charge, total, paid_amount")
          .gte("month", from).lte("month", to),
        supabase.from("expenses")
          .select("date, category, amount")
          .gte("date", monthStart).lt("date", monthEnd),
        supabase.from("flats").select("id", { count: "exact", head: true }),
      ]);
      if (billsRes.error) toast.error(billsRes.error.message);
      if (expRes.error) toast.error(expRes.error.message);
      setBills((billsRes.data ?? []) as Bill[]);
      setExpenses((expRes.data ?? []) as Expense[]);
      setFlatCount(flatsRes.count ?? 0);
      setLoading(false);
    })();
  }, [from, to, validRange]);

  const months = useMemo(() => validRange ? enumerateMonths(from, to) : [], [from, to, validRange]);

  // Per-month aggregation
  const perMonth = useMemo(() => {
    return months.map((m) => {
      const mb = bills.filter((b) => b.month === m);
      const me = expenses.filter((e) => e.date.slice(0, 7) === m);
      const billed = mb.reduce((s, b) => s + Number(b.total), 0);
      const collected = mb.reduce((s, b) => s + Number(b.paid_amount), 0);
      const expense = me.reduce((s, e) => s + Number(e.amount), 0);
      return { month: m, billed, collected, expense, balance: collected - expense };
    });
  }, [months, bills, expenses]);

  const totalIncome = perMonth.reduce((s, r) => s + r.collected, 0);
  const totalBilled = perMonth.reduce((s, r) => s + r.billed, 0);
  const totalExpense = perMonth.reduce((s, r) => s + r.expense, 0);
  const balance = totalIncome - totalExpense;
  const collectionRate = totalBilled > 0 ? Math.round((totalIncome / totalBilled) * 100) : 0;

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});
  const maxCat = Math.max(1, ...Object.values(byCategory));

  const fmtMonthLabel = (m: string) =>
    new Date(m + "-01").toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", { year: "numeric", month: "short" });

  const rangeLabel = months.length === 1
    ? new Date(from + "-01").toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", { year: "numeric", month: "long" })
    : `${fmtMonthLabel(from)} — ${fmtMonthLabel(to)}`;

  const setPreset = (mFrom: string, mTo: string) => { setFrom(mFrom); setTo(mTo); };

  const handlePrint = () => window.print();

  return (
    <AppShell>
      <div className="space-y-6 print:space-y-3 print-area" id="report-printable">
        <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("monthlyReport")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{rangeLabel}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> {lang === "bn" ? "প্রিন্ট" : "Print"}
            </Button>
            <Button variant="default" className="gap-2" onClick={handlePrint}>
              <Download className="h-4 w-4" /> PDF
            </Button>
          </div>
        </div>

        {/* Print header (only visible on print) */}
        <div className="hidden print:block">
          <h1 className="text-2xl font-bold">{lang === "bn" ? "শেখ বাচ্চু টাওয়ার" : "Sheikh Bachchu Tower"}</h1>
          <p className="text-sm">{t("monthlyReport")} — {rangeLabel}</p>
          <hr className="my-2" />
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

        {/* Per-month summary table */}
        <div className="rounded-2xl bg-card border border-border p-4 sm:p-6 shadow-soft overflow-x-auto">
          <h2 className="font-semibold text-foreground mb-4">
            {lang === "bn" ? "মাসভিত্তিক সারসংক্ষেপ" : "Monthly Summary"}
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-3">{t("month")}</th>
                <th className="py-2 pr-3 text-right">{lang === "bn" ? "বিল" : "Billed"}</th>
                <th className="py-2 pr-3 text-right">{t("income")}</th>
                <th className="py-2 pr-3 text-right">{t("expense")}</th>
                <th className="py-2 pr-3 text-right">{t("balance")}</th>
              </tr>
            </thead>
            <tbody>
              {perMonth.map((r) => (
                <tr key={r.month} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-medium">{fmtMonthLabel(r.month)}</td>
                  <td className="py-2 pr-3 text-right">{formatMoney(r.billed, lang)}</td>
                  <td className="py-2 pr-3 text-right text-success">{formatMoney(r.collected, lang)}</td>
                  <td className="py-2 pr-3 text-right text-warning">{formatMoney(r.expense, lang)}</td>
                  <td className={`py-2 pr-3 text-right font-semibold ${r.balance >= 0 ? "text-foreground" : "text-destructive"}`}>
                    {formatMoney(r.balance, lang)}
                  </td>
                </tr>
              ))}
              {perMonth.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">{t("noData")}</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-foreground/20 font-bold">
                <td className="py-2 pr-3">{t("total")}</td>
                <td className="py-2 pr-3 text-right">{formatMoney(totalBilled, lang)}</td>
                <td className="py-2 pr-3 text-right text-success">{formatMoney(totalIncome, lang)}</td>
                <td className="py-2 pr-3 text-right text-warning">{formatMoney(totalExpense, lang)}</td>
                <td className={`py-2 pr-3 text-right ${balance >= 0 ? "text-foreground" : "text-destructive"}`}>
                  {formatMoney(balance, lang)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-card border border-border p-6 shadow-soft">
            <h2 className="font-semibold text-foreground mb-4">{t("income")}</h2>
            <div className="space-y-3">
              {(() => {
                const collected = (key: "service_charge" | "gas_bill" | "parking" | "eid_bonus" | "other_charge") =>
                  bills.reduce((s, b) => {
                    const tot = Number(b.total);
                    if (tot <= 0) return s;
                    return s + (Number(b.paid_amount) * Number(b[key]) / tot);
                  }, 0);
                const rows = [
                  { label: t("serviceCharge"), value: collected("service_charge") },
                  { label: t("gasBill"),       value: collected("gas_bill") },
                  { label: t("parking"),       value: collected("parking") },
                  { label: t("eidBonus"),      value: collected("eid_bonus") },
                  { label: t("otherCharge"),   value: collected("other_charge") },
                ];
                return rows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                    <span className="font-semibold text-foreground">{formatMoney(row.value, lang)}</span>
                  </div>
                ));
              })()}
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
                  <div className="h-2 rounded-full bg-secondary overflow-hidden print:hidden">
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

        <div className="rounded-2xl gradient-hero text-primary-foreground p-6 sm:p-8 shadow-elevated print:bg-secondary print:text-foreground">
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
