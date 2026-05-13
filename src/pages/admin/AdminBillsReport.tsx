import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Receipt } from "lucide-react";
import { toast } from "sonner";
import { residentName } from "@/lib/displayName";

const currentMonth = () => new Date().toISOString().slice(0, 7);
const MONTH_STORAGE_KEY = "admin_dashboard_month";

export default function AdminBillsReport() {
  const { t, lang } = useLang();
  const [month, setMonth] = useState<string>(() => {
    if (typeof window === "undefined") return currentMonth();
    const saved = window.localStorage.getItem(MONTH_STORAGE_KEY);
    return saved && /^\d{4}-\d{2}$/.test(saved) ? saved : currentMonth();
  });
  const [generating, setGenerating] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !month) return;
    window.localStorage.setItem(MONTH_STORAGE_KEY, month);
  }, [month]);

  const monthLabel = new Date(month + "-01").toLocaleDateString(
    lang === "bn" ? "bn-BD" : "en-US",
    { year: "numeric", month: "long" }
  );

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-monthly-bills", { body: { month } });
      if (error) throw error;
      const inserted = Number((data as any)?.inserted ?? 0);
      const skipped = Number((data as any)?.skipped ?? 0);
      toast.success(
        lang === "bn"
          ? `${inserted} টি ফ্ল্যাটের বিল তৈরি হয়েছে${skipped ? ` · ${skipped} টি আগে থেকেই ছিল` : ""}`
          : `Created bills for ${inserted} flat(s)${skipped ? ` · ${skipped} already existed` : ""}`,
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate bills");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = async () => {
    setPdfBusy(true);
    try {
      const monthStart = `${month}-01`;
      const [y, m] = month.split("-").map(Number);
      const monthEnd = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);

      const [billsRes, expRes, flatsRes, summaryRes, loansInRes, loansOutRes, otherIncRes] = await Promise.all([
        supabase.from("bills")
          .select("flat_id, service_charge, gas_bill, parking, eid_bonus, other_charge, total, paid_amount, status")
          .eq("month", month),
        supabase.from("expenses")
          .select("date, category, description, amount, approval_status")
          .gte("date", monthStart).lt("date", monthEnd)
          .order("date", { ascending: true }),
        supabase.from("flats")
          .select("id, flat_no, owner_name, owner_name_bn, occupant_type, occupant_name, occupant_name_bn")
          .order("flat_no", { ascending: true }),
        supabase.rpc("monthly_finance_summary", { _month: month }),
        supabase.from("loans")
          .select("loan_date, lender_name, lender_name_bn, principal, purpose, approval_status")
          .gte("loan_date", monthStart).lt("loan_date", monthEnd)
          .eq("approval_status", "approved")
          .order("loan_date", { ascending: true }),
        supabase.from("loan_repayments")
          .select("paid_date, amount, note, approval_status, loan_id, loans(lender_name, lender_name_bn)")
          .gte("paid_date", monthStart).lt("paid_date", monthEnd)
          .eq("approval_status", "approved")
          .order("paid_date", { ascending: true }),
        supabase.from("other_incomes")
          .select("date, category, source_name, description, amount, approval_status")
          .gte("date", monthStart).lt("date", monthEnd)
          .eq("approval_status", "approved")
          .order("date", { ascending: true }),
      ]);
      if (billsRes.error) throw billsRes.error;
      if (expRes.error) throw expRes.error;
      if (flatsRes.error) throw flatsRes.error;
      if (summaryRes.error) throw summaryRes.error;
      if (loansInRes.error) throw loansInRes.error;
      if (loansOutRes.error) throw loansOutRes.error;
      if (otherIncRes.error) throw otherIncRes.error;

      const bs = billsRes.data ?? [];
      const exp = (expRes.data ?? []).filter((e: any) => (e.approval_status ?? "approved") === "approved");
      const fl = flatsRes.data ?? [];
      const flatMap = new Map(fl.map((f: any) => [f.id, f]));
      const summary: any = summaryRes.data ?? {};
      const loansIn = loansInRes.data ?? [];
      const loansOut = loansOutRes.data ?? [];
      const otherInc = otherIncRes.data ?? [];

      const totalBilled = bs.reduce((s: number, b: any) => s + Number(b.total), 0);
      const totalCollected = bs.reduce((s: number, b: any) => s + Number(b.paid_amount), 0);
      const totalDue = totalBilled - totalCollected;
      const totalExpense = exp.reduce((s: number, e: any) => s + Number(e.amount), 0);
      const totalLoanIn = loansIn.reduce((s: number, l: any) => s + Number(l.principal), 0);
      const totalLoanOut = loansOut.reduce((s: number, l: any) => s + Number(l.amount), 0);
      const totalOtherInc = otherInc.reduce((s: number, x: any) => s + Number(x.amount), 0);
      const openingCash = Number(summary.opening_cash ?? 0);

      const totalIncome = openingCash + totalCollected + totalLoanIn + totalOtherInc;
      const totalOutflow = totalExpense + totalLoanOut;
      const currentBalance = totalIncome - totalOutflow;

      const totalExpenseAll = totalExpense + totalLoanOut;
      const net = totalCollected - totalExpenseAll;
      const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

      const fmtMoney = (n: number) =>
        new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en-US", { maximumFractionDigits: 0 }).format(n) + " ৳";

      const esc = (s: string) =>
        String(s ?? "").replace(/[&<>"]/g, (c) =>
          ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as any)[c]);

      const billRows = bs
        .map((b: any) => {
          const f = flatMap.get(b.flat_id) as any;
          const owner = residentName(f, lang);
          const roleText = f ? (lang === "bn" ? ((f.occupant_type ?? "").toLowerCase() === "tenant" ? "ভাড়াটিয়া" : "মালিক") : ((f.occupant_type ?? "").toLowerCase() === "tenant" ? "Tenant" : "Owner")) : "";
          const due = Number(b.total) - Number(b.paid_amount);
          return `<tr>
            <td>${esc(f?.flat_no ?? "—")}</td>
            <td>${esc(owner ?? "")}${roleText ? ` <span style="color:#888;font-size:11px">(${esc(roleText)})</span>` : ""}</td>
            <td class="r">${fmtMoney(Number(b.service_charge))}</td>
            <td class="r">${fmtMoney(Number(b.gas_bill))}</td>
            <td class="r">${fmtMoney(Number(b.parking) + Number(b.eid_bonus) + Number(b.other_charge))}</td>
            <td class="r"><b>${fmtMoney(Number(b.total))}</b></td>
            <td class="r">${fmtMoney(Number(b.paid_amount))}</td>
            <td class="r ${due > 0 ? "due" : ""}">${fmtMoney(due)}</td>
            <td>${esc(b.status)}</td>
          </tr>`;
        })
        .join("");

      const expRows = exp
        .map((e: any) => `<tr>
          <td>${esc(e.date)}</td>
          <td>${esc(e.category)}</td>
          <td>${esc(e.description ?? "")}</td>
          <td class="r">${fmtMoney(Number(e.amount))}</td>
        </tr>`)
        .join("");

      const lenderName = (l: any) => (lang === "bn" ? (l?.lender_name_bn || l?.lender_name || "—") : (l?.lender_name || "—"));
      const loansInRows = loansIn.map((l: any) => `<tr>
          <td>${esc(l.loan_date)}</td>
          <td>${esc(lenderName(l))}</td>
          <td>${esc(l.purpose ?? "")}</td>
          <td class="r">${fmtMoney(Number(l.principal))}</td>
        </tr>`).join("");
      const loansOutRows = loansOut.map((l: any) => `<tr>
          <td>${esc(l.paid_date)}</td>
          <td>${esc(lenderName(l.loans))}</td>
          <td>${esc(l.note ?? "")}</td>
          <td class="r">${fmtMoney(Number(l.amount))}</td>
        </tr>`).join("");
      const otherIncRows = otherInc.map((x: any) => `<tr>
          <td>${esc(x.date)}</td>
          <td>${esc(x.category)}</td>
          <td>${esc(x.source_name ?? x.description ?? "")}</td>
          <td class="r">${fmtMoney(Number(x.amount))}</td>
        </tr>`).join("");

      const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<title>${lang === "bn" ? "মাসিক রিপোর্ট" : "Monthly Report"} — ${monthLabel}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: ${lang === "bn" ? "'Noto Sans Bengali', " : ""}-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #111; margin: 0; padding: 24px; }
  h1 { margin: 0 0 4px; font-size: 22px; }
  h2 { margin: 24px 0 8px; font-size: 16px; border-bottom: 2px solid #111; padding-bottom: 4px; }
  .muted { color: #666; font-size: 12px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
  .card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
  .card .label { font-size: 11px; text-transform: uppercase; color: #666; }
  .card .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
  .card.success .value { color: #15803d; }
  .card.warn .value { color: #b45309; }
  .card.dest .value { color: #b91c1c; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #e5e5e5; text-align: left; vertical-align: top; }
  th { background: #f5f5f5; font-weight: 600; }
  td.r, th.r { text-align: right; }
  td.due { color: #b91c1c; font-weight: 600; }
  tfoot td { border-top: 2px solid #111; font-weight: 700; }
  .footer { margin-top: 18px; font-size: 10px; color: #777; text-align: center; }
</style>
</head>
<body>
  <h1>${lang === "bn" ? "মাসিক রিপোর্ট" : "Monthly Report"}</h1>
  <div class="muted">${esc(monthLabel)} · ${lang === "bn" ? "তৈরি" : "Generated"}: ${new Date().toLocaleString(lang === "bn" ? "bn-BD" : "en-US")}</div>

  <div class="grid">
    <div class="card"><div class="label">${lang === "bn" ? "মোট বিল" : "Total Billed"}</div><div class="value">${fmtMoney(totalBilled)}</div></div>
    <div class="card success"><div class="label">${lang === "bn" ? "আদায়" : "Collected"}</div><div class="value">${fmtMoney(totalCollected)}</div></div>
    <div class="card dest"><div class="label">${lang === "bn" ? "বাকি" : "Due"}</div><div class="value">${fmtMoney(totalDue)}</div></div>
    <div class="card warn"><div class="label">${lang === "bn" ? "খরচ (লোন পরিশোধ সহ)" : "Expense (incl. Loan Repaid)"}</div><div class="value">${fmtMoney(totalExpenseAll)}</div></div>
  </div>

  <div class="grid" style="grid-template-columns: repeat(2, 1fr);">
    <div class="card"><div class="label">${lang === "bn" ? "নিট ব্যালেন্স (আদায় − খরচ)" : "Net Balance (Collected − Expense)"}</div><div class="value" style="color:${net >= 0 ? "#15803d" : "#b91c1c"}">${fmtMoney(net)}</div></div>
    <div class="card"><div class="label">${lang === "bn" ? "কালেকশন রেট" : "Collection Rate"}</div><div class="value">${collectionRate}%</div></div>
  </div>

  <h2>${lang === "bn" ? "ফ্ল্যাট-ওয়াইজ বিল" : "Flat-wise Bills"}</h2>
  <table>
    <thead><tr>
      <th>${lang === "bn" ? "ফ্ল্যাট" : "Flat"}</th>
      <th>${lang === "bn" ? "মালিক" : "Owner"}</th>
      <th class="r">${lang === "bn" ? "সার্ভিস" : "Service"}</th>
      <th class="r">${lang === "bn" ? "গ্যাস" : "Gas"}</th>
      <th class="r">${lang === "bn" ? "অন্যান্য" : "Other"}</th>
      <th class="r">${lang === "bn" ? "মোট" : "Total"}</th>
      <th class="r">${lang === "bn" ? "পরিশোধ" : "Paid"}</th>
      <th class="r">${lang === "bn" ? "বাকি" : "Due"}</th>
      <th>${lang === "bn" ? "স্ট্যাটাস" : "Status"}</th>
    </tr></thead>
    <tbody>${billRows || `<tr><td colspan="9" style="text-align:center; padding:16px; color:#999">${lang === "bn" ? "কোনো বিল নেই" : "No bills"}</td></tr>`}</tbody>
    <tfoot><tr>
      <td colspan="5">${lang === "bn" ? "মোট" : "Total"}</td>
      <td class="r">${fmtMoney(totalBilled)}</td>
      <td class="r">${fmtMoney(totalCollected)}</td>
      <td class="r">${fmtMoney(totalDue)}</td>
      <td></td>
    </tr></tfoot>
  </table>

  <h2>${lang === "bn" ? "অন্যান্য আয়" : "Other Income"}</h2>
  <table>
    <thead><tr>
      <th>${lang === "bn" ? "তারিখ" : "Date"}</th>
      <th>${lang === "bn" ? "ক্যাটেগরি" : "Category"}</th>
      <th>${lang === "bn" ? "উৎস / বিবরণ" : "Source / Description"}</th>
      <th class="r">${lang === "bn" ? "টাকা" : "Amount"}</th>
    </tr></thead>
    <tbody>${otherIncRows || `<tr><td colspan="4" style="text-align:center; padding:12px; color:#999">${lang === "bn" ? "কোনো অন্যান্য আয় নেই" : "No other income"}</td></tr>`}</tbody>
    <tfoot><tr><td colspan="3">${lang === "bn" ? "মোট" : "Total"}</td><td class="r">${fmtMoney(totalOtherInc)}</td></tr></tfoot>
  </table>

  <h2>${lang === "bn" ? "লোন গ্রহণ (নেওয়া)" : "Loans Taken"}</h2>
  <table>
    <thead><tr>
      <th>${lang === "bn" ? "তারিখ" : "Date"}</th>
      <th>${lang === "bn" ? "দাতা" : "Lender"}</th>
      <th>${lang === "bn" ? "উদ্দেশ্য" : "Purpose"}</th>
      <th class="r">${lang === "bn" ? "টাকা" : "Amount"}</th>
    </tr></thead>
    <tbody>${loansInRows || `<tr><td colspan="4" style="text-align:center; padding:12px; color:#999">${lang === "bn" ? "কোনো লোন নেওয়া হয়নি" : "No loans taken"}</td></tr>`}</tbody>
    <tfoot><tr><td colspan="3">${lang === "bn" ? "মোট" : "Total"}</td><td class="r">${fmtMoney(totalLoanIn)}</td></tr></tfoot>
  </table>

  <h2>${lang === "bn" ? "লোন পরিশোধ (দেওয়া)" : "Loans Repaid"}</h2>
  <table>
    <thead><tr>
      <th>${lang === "bn" ? "তারিখ" : "Date"}</th>
      <th>${lang === "bn" ? "দাতা" : "Lender"}</th>
      <th>${lang === "bn" ? "নোট" : "Note"}</th>
      <th class="r">${lang === "bn" ? "টাকা" : "Amount"}</th>
    </tr></thead>
    <tbody>${loansOutRows || `<tr><td colspan="4" style="text-align:center; padding:12px; color:#999">${lang === "bn" ? "কোনো লোন পরিশোধ নেই" : "No loan repayments"}</td></tr>`}</tbody>
    <tfoot><tr><td colspan="3">${lang === "bn" ? "মোট" : "Total"}</td><td class="r">${fmtMoney(totalLoanOut)}</td></tr></tfoot>
  </table>

  <h2>${lang === "bn" ? "মাসিক খরচ" : "Monthly Expenses"}</h2>
  <table>
    <thead><tr>
      <th>${lang === "bn" ? "তারিখ" : "Date"}</th>
      <th>${lang === "bn" ? "ক্যাটেগরি" : "Category"}</th>
      <th>${lang === "bn" ? "বিবরণ" : "Description"}</th>
      <th class="r">${lang === "bn" ? "টাকা" : "Amount"}</th>
    </tr></thead>
    <tbody>${expRows || `<tr><td colspan="4" style="text-align:center; padding:16px; color:#999">${lang === "bn" ? "কোনো খরচ নেই" : "No expenses"}</td></tr>`}</tbody>
    <tfoot><tr>
      <td colspan="3">${lang === "bn" ? "মোট" : "Total"}</td>
      <td class="r">${fmtMoney(totalExpense)}</td>
    </tr></tfoot>
  </table>

  <h2>${lang === "bn" ? "মাসিক আয়-ব্যয় সারসংক্ষেপ" : "Monthly Cashflow Summary"}</h2>
  <table>
    <thead><tr><th colspan="2" style="background:#dcfce7;color:#14532d">${lang === "bn" ? "আয়" : "Income"}</th></tr></thead>
    <tbody>
      <tr><td>${lang === "bn" ? "পূর্বের ক্যাশ ব্যালেন্স" : "Opening Cash Balance"}</td><td class="r">${fmtMoney(openingCash)}</td></tr>
      <tr><td>${lang === "bn" ? "ফ্ল্যাট থেকে আদায়" : "Flat Collections"}</td><td class="r">${fmtMoney(totalCollected)}</td></tr>
      <tr><td>${lang === "bn" ? "লোন গ্রহণ" : "Loan Taken"}</td><td class="r">${fmtMoney(totalLoanIn)}</td></tr>
      <tr><td>${lang === "bn" ? "অন্যান্য আয়" : "Other Income"}</td><td class="r">${fmtMoney(totalOtherInc)}</td></tr>
    </tbody>
    <tfoot><tr><td><b>${lang === "bn" ? "মোট আয়" : "Total Income"}</b></td><td class="r"><b>${fmtMoney(totalIncome)}</b></td></tr></tfoot>
  </table>

  <table style="margin-top:12px">
    <thead><tr><th colspan="2" style="background:#fee2e2;color:#7f1d1d">${lang === "bn" ? "ব্যয়" : "Expense"}</th></tr></thead>
    <tbody>
      ${expByCatRows || `<tr><td colspan="2" style="text-align:center; color:#999">${lang === "bn" ? "কোনো খরচ নেই" : "No expenses"}</td></tr>`}
      <tr><td>${lang === "bn" ? "লোন পরিশোধ" : "Loan Repayment"}</td><td class="r">${fmtMoney(totalLoanOut)}</td></tr>
    </tbody>
    <tfoot>
      <tr><td><b>${lang === "bn" ? "মোট ব্যয়" : "Total Expense"}</b></td><td class="r"><b>${fmtMoney(totalOutflow)}</b></td></tr>
      <tr><td><b>${lang === "bn" ? "বর্তমান ব্যালেন্স (মোট আয় − মোট ব্যয়)" : "Current Balance (Income − Expense)"}</b></td><td class="r" style="color:${currentBalance >= 0 ? "#15803d" : "#b91c1c"}"><b>${fmtMoney(currentBalance)}</b></td></tr>
    </tfoot>
  </table>

  <div class="footer">${lang === "bn" ? "শেখ বাচ্চু টাওয়ার — অটোমেটেড রিপোর্ট" : "Sheikh Bachchu Tower — Automated report"}</div>
  <script>
    window.onload = () => { setTimeout(() => { window.focus(); window.print(); }, 250); };
  </script>
</body>
</html>`;

      const w = window.open("", "_blank");
      if (!w) {
        toast.error(lang === "bn" ? "পপ-আপ ব্লক করা" : "Pop-up blocked");
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
      toast.success(lang === "bn" ? "PDF প্রিন্ট ডায়লগ খোলা হচ্ছে" : "Opening PDF print dialog");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate report");
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {lang === "bn" ? "বিল জেনারেট ও রিপোর্ট" : "Bill Generation & Report"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{monthLabel}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {lang === "bn" ? "মাস নির্বাচন" : "Select Month"}
            </CardTitle>
            <CardDescription>
              {lang === "bn"
                ? "যে মাসের জন্য বিল তৈরি বা রিপোর্ট ডাউনলোড করতে চান নির্বাচন করুন।"
                : "Choose the month to generate bills or download a report."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1.5 max-w-xs">
              <Label className="text-xs text-muted-foreground">
                {lang === "bn" ? "মাস" : "Month"}
              </Label>
              <Input
                type="month"
                value={month}
                max={currentMonth()}
                onChange={(e) => e.target.value && setMonth(e.target.value)}
                className="h-9"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 mb-2">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">
                {lang === "bn" ? "মাসিক বিল জেনারেট" : "Generate Monthly Bills"}
              </CardTitle>
              <CardDescription>
                {lang === "bn"
                  ? `${monthLabel} মাসের জন্য সকল ফ্ল্যাটের বিল তৈরি করুন।`
                  : `Create bills for all flats for ${monthLabel}.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="gradient-primary text-primary-foreground gap-2 shadow-elegant w-full"
                disabled={generating}
                onClick={handleGenerate}
              >
                <Receipt className="h-4 w-4" />
                {generating ? "..." : t("generateBills")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/10 mb-2">
                <FileText className="h-5 w-5 text-success" />
              </div>
              <CardTitle className="text-lg">
                {lang === "bn" ? "মাসিক রিপোর্ট PDF" : "Monthly Report PDF"}
              </CardTitle>
              <CardDescription>
                {lang === "bn"
                  ? "ফ্ল্যাট-ওয়াইজ বিল, আদায় ও খরচ সহ সম্পূর্ণ রিপোর্ট ডাউনলোড করুন।"
                  : "Download a full PDF with flat-wise bills, collections and expenses."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="gap-2 w-full"
                disabled={pdfBusy}
                onClick={handleDownloadReport}
              >
                <FileText className="h-4 w-4" />
                {pdfBusy
                  ? (lang === "bn" ? "তৈরি হচ্ছে..." : "Preparing...")
                  : (lang === "bn" ? "রিপোর্ট PDF" : "Report PDF")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
