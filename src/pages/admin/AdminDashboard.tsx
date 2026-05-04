import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { useLang } from "@/i18n/LangContext";
import { formatMoney, formatNumber } from "@/i18n/translations";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Building,
  Wallet,
  TrendingUp,
  AlertCircle,
  Megaphone,
  Plus,
  AlertTriangle,
  Flame,
  Receipt,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CombinedBillStatus } from "@/components/StatusBadge";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthlyFinanceSummary } from "@/components/MonthlyFinanceSummary";

type Flat = {
  id: string;
  flat_no: string;
  owner_name: string | null;
  owner_name_bn: string | null;
};

type Bill = {
  id: string;
  flat_id: string;
  month: string;
  service_charge: number;
  gas_bill: number;
  parking: number;
  total: number;
  paid_amount: number;
  status: "paid" | "partial" | "unpaid";
  generation_status: "generated" | "failed";
};

type Notice = {
  id: string;
  title: string;
  title_bn: string;
  body: string;
  body_bn: string;
  important: boolean;
  date: string;
};

const currentMonth = () => new Date().toISOString().slice(0, 7); // YYYY-MM

export default function AdminDashboard() {
  const { t, lang } = useLang();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [prevBills, setPrevBills] = useState<Bill[]>([]);
  const [prevMonth, setPrevMonth] = useState<string>("");
  const [notices, setNotices] = useState<Notice[]>([]);
  const MONTH_STORAGE_KEY = "admin_dashboard_month";
  const [month, setMonth] = useState<string>(() => {
    if (typeof window === "undefined") return currentMonth();
    const saved = window.localStorage.getItem(MONTH_STORAGE_KEY);
    return saved && /^\d{4}-\d{2}$/.test(saved) ? saved : currentMonth();
  });

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    titleBn: "",
    body: "",
    bodyBn: "",
    important: false,
  });

  const loadData = async (override?: string) => {
    setLoading(true);
    let targetMonth = override;
    if (!targetMonth) {
      const saved = typeof window !== "undefined"
        ? window.localStorage.getItem(MONTH_STORAGE_KEY)
        : null;
      if (saved && /^\d{4}-\d{2}$/.test(saved)) {
        targetMonth = saved;
      } else {
        // Find the latest month that has any generated bills
        const latestRes = await supabase
          .from("bills")
          .select("month")
          .order("month", { ascending: false })
          .limit(1);
        targetMonth = (latestRes.data?.[0]?.month as string | undefined) ?? currentMonth();
      }
      setMonth(targetMonth);
    }

    // Compute previous month YYYY-MM
    const [py, pm] = targetMonth.split("-").map(Number);
    const prev = new Date(Date.UTC(py, pm - 2, 1));
    const prevTarget = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`;
    setPrevMonth(prevTarget);

    const [flatsRes, billsRes, prevBillsRes, noticesRes] = await Promise.all([
      supabase.from("flats").select("id, flat_no, owner_name, owner_name_bn"),
      supabase
        .from("bills")
        .select("id, flat_id, month, service_charge, gas_bill, parking, total, paid_amount, status, generation_status")
        .eq("month", targetMonth),
      supabase
        .from("bills")
        .select("service_charge, gas_bill")
        .eq("month", prevTarget),
      supabase
        .from("notices")
        .select("id, title, title_bn, body, body_bn, important, date")
        .order("date", { ascending: false })
        .limit(5),
    ]);

    if (flatsRes.error) toast.error(flatsRes.error.message);
    if (billsRes.error) toast.error(billsRes.error.message);
    if (noticesRes.error) toast.error(noticesRes.error.message);

    setFlats((flatsRes.data ?? []) as Flat[]);
    setBills((billsRes.data ?? []) as Bill[]);
    setPrevBills((prevBillsRes.data ?? []) as Bill[]);
    setNotices((noticesRes.data ?? []) as Notice[]);
    setLoading(false);
  };

  const isFirstRun = useRef(true);
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload bills when user picks a different month (skip the initial auto-load)
  useEffect(() => {
    if (isFirstRun.current) { isFirstRun.current = false; return; }
    loadData(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  // Persist selected month so refresh keeps the same selection
  useEffect(() => {
    if (typeof window === "undefined" || !month) return;
    window.localStorage.setItem(MONTH_STORAGE_KEY, month);
  }, [month]);

  const stats = useMemo(() => {
    const totalService = bills.reduce((s, b) => s + Number(b.service_charge || 0), 0);
    const totalGas = bills.reduce((s, b) => s + Number(b.gas_bill || 0), 0);
    const totalBilled = bills.reduce((s, b) => s + Number(b.total || 0), 0);
    const collected = bills.reduce((s, b) => s + Number(b.paid_amount || 0), 0);
    const pending = totalBilled - collected;

    const paidCount = bills.filter((b) => b.status === "paid").length;
    const partialCount = bills.filter((b) => b.status === "partial").length;
    const unpaidCount = bills.filter((b) => b.status === "unpaid").length;

    const collectionRate = totalBilled > 0 ? Math.round((collected / totalBilled) * 100) : 0;

    return {
      totalService,
      totalGas,
      totalBilled,
      collected,
      pending,
      paidCount,
      partialCount,
      unpaidCount,
      collectionRate,
    };
  }, [bills]);

  const monthLabel = new Date(month + "-01").toLocaleDateString(
    lang === "bn" ? "bn-BD" : "en-US",
    { year: "numeric", month: "long" }
  );

  const submitNotice = async () => {
    if (!form.titleBn.trim() || !form.bodyBn.trim()) {
      toast.error(lang === "bn" ? "শিরোনাম ও বিবরণ দিন" : "Title & body required");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("notices").insert({
      title: form.title.trim() || form.titleBn.trim(),
      title_bn: form.titleBn.trim(),
      body: form.body.trim() || form.bodyBn.trim(),
      body_bn: form.bodyBn.trim(),
      important: form.important,
      date: new Date().toISOString().slice(0, 10),
      created_by: user?.id ?? null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(lang === "bn" ? "নোটিশ পোস্ট হয়েছে" : "Notice posted");
    setForm({ title: "", titleBn: "", body: "", bodyBn: "", important: false });
    setOpen(false);
    loadData();
  };

  const [pdfBusy, setPdfBusy] = useState(false);
  const handleDownloadReport = async () => {
    setPdfBusy(true);
    try {
      const monthStart = `${month}-01`;
      const [y, m] = month.split("-").map(Number);
      const monthEnd = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);

      const [billsRes, expRes, flatsRes] = await Promise.all([
        supabase.from("bills")
          .select("flat_id, service_charge, gas_bill, parking, eid_bonus, other_charge, total, paid_amount, status")
          .eq("month", month),
        supabase.from("expenses")
          .select("date, category, description, amount")
          .gte("date", monthStart).lt("date", monthEnd)
          .order("date", { ascending: true }),
        supabase.from("flats")
          .select("id, flat_no, owner_name, owner_name_bn")
          .order("flat_no", { ascending: true }),
      ]);
      if (billsRes.error) throw billsRes.error;
      if (expRes.error) throw expRes.error;
      if (flatsRes.error) throw flatsRes.error;

      const bs = billsRes.data ?? [];
      const exp = expRes.data ?? [];
      const fl = flatsRes.data ?? [];
      const flatMap = new Map(fl.map((f: any) => [f.id, f]));

      const totalBilled = bs.reduce((s: number, b: any) => s + Number(b.total), 0);
      const totalCollected = bs.reduce((s: number, b: any) => s + Number(b.paid_amount), 0);
      const totalDue = totalBilled - totalCollected;
      const totalExpense = exp.reduce((s: number, e: any) => s + Number(e.amount), 0);
      const net = totalCollected - totalExpense;
      const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

      const fmtMoney = (n: number) =>
        new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en-US", { maximumFractionDigits: 0 }).format(n) + " ৳";
      const esc = (s: string) =>
        String(s ?? "").replace(/[&<>"]/g, (c) =>
          ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as any)[c]);

      const billRows = bs
        .map((b: any) => {
          const f = flatMap.get(b.flat_id) as any;
          const owner = f ? (lang === "bn" ? f.owner_name_bn || f.owner_name : f.owner_name || f.owner_name_bn) : "";
          const due = Number(b.total) - Number(b.paid_amount);
          return `<tr>
            <td>${esc(f?.flat_no ?? "—")}</td>
            <td>${esc(owner ?? "")}</td>
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
    <div class="card warn"><div class="label">${lang === "bn" ? "খরচ" : "Expense"}</div><div class="value">${fmtMoney(totalExpense)}</div></div>
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

  const recentUnpaid = bills
    .filter((b) => b.status !== "paid")
    .slice(0, 6);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("dashboard")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{monthLabel}</p>
          </div>

          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex flex-col">
              <Label className="text-xs text-muted-foreground mb-1">
                {lang === "bn" ? "মাস" : "Month"}
              </Label>
              <Input
                type="month"
                value={month}
                max={currentMonth()}
                onChange={(e) => e.target.value && setMonth(e.target.value)}
                className="h-9 w-[160px]"
              />
            </div>
            <Button
              variant="outline"
              className="gap-2"
              disabled={generating}
              onClick={async () => {
                setGenerating(true);
                try {
                  const { data, error } = await supabase.functions.invoke(
                    "generate-monthly-bills",
                    { body: { month } },
                  );
                  if (error) throw error;
                  const inserted = Number((data as any)?.inserted ?? 0);
                  const skipped = Number((data as any)?.skipped ?? 0);
                  toast.success(
                    lang === "bn"
                      ? `${inserted} টি ফ্ল্যাটের বিল তৈরি হয়েছে${skipped ? ` · ${skipped} টি আগে থেকেই ছিল` : ""}`
                      : `Created bills for ${inserted} flat(s)${skipped ? ` · ${skipped} already existed` : ""}`,
                  );
                  await loadData();
                } catch (e: any) {
                  toast.error(e?.message ?? "Failed to generate bills");
                } finally {
                  setGenerating(false);
                }
              }}
            >
              {generating ? "..." : t("generateBills")}
            </Button>

            <Button
              variant="outline"
              className="gap-2"
              onClick={handleDownloadReport}
              disabled={pdfBusy}
            >
              <FileText className="h-4 w-4" />
              {pdfBusy
                ? (lang === "bn" ? "তৈরি হচ্ছে..." : "Preparing...")
                : (lang === "bn" ? "রিপোর্ট PDF" : "Report PDF")}
            </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground gap-2 shadow-elegant">
                <Plus className="h-4 w-4" />
                {t("addNotice")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("addNotice")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>শিরোনাম (বাংলা)</Label>
                  <Input
                    value={form.titleBn}
                    onChange={(e) => setForm({ ...form, titleBn: e.target.value })}
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Title (English)</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>বিবরণ (বাংলা)</Label>
                  <Textarea
                    rows={3}
                    value={form.bodyBn}
                    onChange={(e) => setForm({ ...form, bodyBn: e.target.value })}
                    maxLength={500}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Body (English)</Label>
                  <Textarea
                    rows={3}
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                    maxLength={500}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium">
                      {lang === "bn" ? "জরুরি হিসেবে চিহ্নিত করুন" : "Mark as important"}
                    </span>
                  </div>
                  <Switch
                    checked={form.important}
                    onCheckedChange={(v) => setForm({ ...form, important: v })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                  {t("cancel")}
                </Button>
                <Button
                  className="gradient-primary text-primary-foreground"
                  onClick={submitNotice}
                  disabled={submitting}
                >
                  {submitting ? "..." : t("save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Empty state — no bills generated for selected month */}
        {!loading && bills.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card p-8 sm:p-10 text-center shadow-soft">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 text-warning mb-4">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              {lang === "bn" ? "এখনো বিল জেনারেট হয়নি" : "Bills not generated yet"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              {lang === "bn"
                ? `${monthLabel} মাসের জন্য কোনো বিল পাওয়া যায়নি। উপরের “${t("generateBills")}” বাটন থেকে এ মাসের বিল তৈরি করুন।`
                : `No bills found for ${monthLabel}. Use the “${t("generateBills")}” button above to create bills for this month.`}
            </p>
            <Button
              className="gradient-primary text-primary-foreground gap-2 shadow-elegant mt-5"
              disabled={generating}
              onClick={async () => {
                setGenerating(true);
                try {
                  const { data, error } = await supabase.functions.invoke(
                    "generate-monthly-bills",
                    { body: { month } },
                  );
                  if (error) throw error;
                  const inserted = Number((data as any)?.inserted ?? 0);
                  const skipped = Number((data as any)?.skipped ?? 0);
                  toast.success(
                    lang === "bn"
                      ? `${inserted} টি ফ্ল্যাটের বিল তৈরি হয়েছে${skipped ? ` · ${skipped} টি আগে থেকেই ছিল` : ""}`
                      : `Created bills for ${inserted} flat(s)${skipped ? ` · ${skipped} already existed` : ""}`,
                  );
                  await loadData(month);
                } catch (e: any) {
                  toast.error(e?.message ?? "Failed to generate bills");
                } finally {
                  setGenerating(false);
                }
              }}
            >
              <Receipt className="h-4 w-4" />
              {generating ? "..." : t("generateBills")}
            </Button>
          </div>
        )}

        {/* Stats */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={t("totalFlats")}
              value={formatNumber(flats.length, lang)}
              icon={Building}
            />
            <StatCard
              label={t("serviceCharge")}
              value={formatMoney(stats.totalService, lang)}
              hint={`${monthLabel} ${lang === "bn" ? "—এর বিল" : "billed"}`}
              icon={Receipt}
              variant="primary"
            />
            <StatCard
              label={t("gasBill")}
              value={formatMoney(stats.totalGas, lang)}
              hint={`${monthLabel} ${lang === "bn" ? "—এর বিল" : "billed"}`}
              icon={Flame}
              variant="warning"
            />
            <StatCard
              label={t("collected")}
              value={formatMoney(stats.collected, lang)}
              hint={`${formatNumber(stats.collectionRate, lang)}% ${t("collectionRate")}`}
              icon={TrendingUp}
              variant="success"
            />
          </div>
        )}

        {/* Comparison: this month vs previous month — service & gas */}
        {!loading && (() => {
          const prevService = prevBills.reduce((s, b) => s + Number(b.service_charge || 0), 0);
          const prevGas = prevBills.reduce((s, b) => s + Number(b.gas_bill || 0), 0);
          const fmtMonth = (m: string) =>
            m ? new Date(m + "-01").toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", { month: "short", year: "2-digit" }) : "—";
          const data = [
            {
              metric: lang === "bn" ? "সার্ভিস চার্জ" : "Service",
              prev: prevService,
              curr: stats.totalService,
            },
            {
              metric: lang === "bn" ? "গ্যাস বিল" : "Gas",
              prev: prevGas,
              curr: stats.totalGas,
            },
          ];
          const diff = (curr: number, prev: number) => {
            if (prev === 0) return curr === 0 ? 0 : 100;
            return Math.round(((curr - prev) / prev) * 100);
          };
          const svcDiff = diff(stats.totalService, prevService);
          const gasDiff = diff(stats.totalGas, prevGas);
          const chartConfig = {
            prev: { label: fmtMonth(prevMonth), color: "hsl(var(--muted-foreground))" },
            curr: { label: fmtMonth(month), color: "hsl(var(--primary))" },
          } as const;
          return (
            <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
              <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="font-semibold text-foreground">
                    {lang === "bn" ? "তুলনামূলক চার্ট" : "Month-over-Month Comparison"}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lang === "bn"
                      ? `${fmtMonth(prevMonth)} বনাম ${fmtMonth(month)} — সার্ভিস চার্জ ও গ্যাস বিল`
                      : `${fmtMonth(prevMonth)} vs ${fmtMonth(month)} — Service charge & gas bill`}
                  </p>
                </div>
                <div className="flex gap-3 text-xs">
                  <div className="text-right">
                    <div className="text-muted-foreground">{lang === "bn" ? "সার্ভিস" : "Service"}</div>
                    <div className={`font-bold ${svcDiff >= 0 ? "text-success" : "text-destructive"}`}>
                      {svcDiff >= 0 ? "+" : ""}{formatNumber(svcDiff, lang)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-muted-foreground">{lang === "bn" ? "গ্যাস" : "Gas"}</div>
                    <div className={`font-bold ${gasDiff >= 0 ? "text-success" : "text-destructive"}`}>
                      {gasDiff >= 0 ? "+" : ""}{formatNumber(gasDiff, lang)}%
                    </div>
                  </div>
                </div>
              </div>
              <ChartContainer config={chartConfig} className="h-[260px] w-full">
                <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="metric" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v) => formatMoney(Number(v), lang).replace(" ৳", "")} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => [formatMoney(Number(value), lang), name as string]}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="prev" fill="var(--color-prev)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="curr" fill="var(--color-curr)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          );
        })()}
        <MonthlyFinanceSummary month={month} variant="admin" />

        <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="font-semibold text-foreground">
                {lang === "bn" ? "বিল্ডিং বিলিং স্ট্যাটাস" : "Building Billing Status"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === "bn"
                  ? `সার্ভিস চার্জ ও গ্যাস বিল — ${monthLabel} এর সারাংশ`
                  : `Service charge & gas bill summary for ${monthLabel}`}
              </p>
            </div>
            <Link to="/admin/dues">
              <Button variant="ghost" size="sm">{t("viewAll")}</Button>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-success/10 border border-success/20 p-4 text-center">
              <div className="text-2xl font-bold text-success">{formatNumber(stats.paidCount, lang)}</div>
              <div className="text-xs text-muted-foreground mt-1">{t("paid")}</div>
            </div>
            <div className="rounded-xl bg-warning/10 border border-warning/20 p-4 text-center">
              <div className="text-2xl font-bold text-warning">{formatNumber(stats.partialCount, lang)}</div>
              <div className="text-xs text-muted-foreground mt-1">{t("partial")}</div>
            </div>
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-center">
              <div className="text-2xl font-bold text-destructive">{formatNumber(stats.unpaidCount, lang)}</div>
              <div className="text-xs text-muted-foreground mt-1">{t("unpaid")}</div>
            </div>
          </div>

          <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
              <span className="text-muted-foreground">{lang === "bn" ? "মোট বিল" : "Total Billed"}</span>
              <span className="font-bold text-foreground">{formatMoney(stats.totalBilled, lang)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
              <span className="text-muted-foreground">{t("pending")}</span>
              <span className="font-bold text-destructive">{formatMoney(stats.pending, lang)}</span>
            </div>
          </div>
        </div>

        {/* Two columns */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Pending bills */}
          <div className="lg:col-span-2 rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="font-semibold text-foreground">{t("pending")} · {t("dues")}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lang === "bn" ? "সর্বশেষ অপরিশোধিত বিলসমূহ" : "Latest unpaid bills"}
                </p>
              </div>
              <Link to="/admin/dues">
                <Button variant="ghost" size="sm">{t("viewAll")}</Button>
              </Link>
            </div>
            <div className="divide-y divide-border">
              {loading && (
                <div className="p-5 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              )}
              {!loading && recentUnpaid.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {lang === "bn" ? "কোনো বকেয়া নেই" : "No pending bills"}
                </div>
              )}
              {!loading && recentUnpaid.map((bill) => {
                const flat = flats.find((f) => f.id === bill.flat_id);
                const due = Number(bill.total) - Number(bill.paid_amount);
                return (
                  <div key={bill.id} className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition-base">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary font-bold text-sm shrink-0">
                      {flat?.flat_no ?? "—"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {flat ? (lang === "bn" ? flat.owner_name_bn || flat.owner_name : flat.owner_name) : "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-destructive">{formatMoney(due, lang)}</div>
                      <div className="mt-1"><CombinedBillStatus generation={bill.generation_status} payment={bill.status} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notices */}
          <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-accent" />
                {t("recentNotices")}
              </h2>
              <Link to="/admin/notices">
                <Button variant="ghost" size="sm">{t("viewAll")}</Button>
              </Link>
            </div>
            <div className="divide-y divide-border">
              {loading && (
                <div className="p-5 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              )}
              {!loading && notices.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {lang === "bn" ? "কোনো নোটিশ নেই" : "No notices yet"}
                </div>
              )}
              {!loading && notices.map((n) => (
                <div key={n.id} className="p-4">
                  <div className="flex items-start gap-2">
                    {n.important && <span className="mt-1 h-2 w-2 rounded-full bg-destructive shrink-0" />}
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-foreground">
                        {lang === "bn" ? n.title_bn : n.title}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {lang === "bn" ? n.body_bn : n.body}
                      </p>
                      <div className="text-[11px] text-muted-foreground mt-1.5">{n.date}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
