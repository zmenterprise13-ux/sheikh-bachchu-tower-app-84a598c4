import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney } from "@/i18n/translations";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, AlertTriangle, CheckCircle2, ScanSearch, X } from "lucide-react";
import { round2 } from "@/lib/bkashMath";
import { useBkashSettings } from "@/hooks/useBkashSettings";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type Row = {
  bill_id: string;
  flat_id: string;
  flat_no: string;
  owner_name: string | null;
  month: string;
  total: number;
  paid_amount: number;
  status: string;
  approvedSum: number;       // sum of approved PR amounts (should == paid_amount)
  bkashFee: number;          // metadata only
  expectedDue: number;       // total - paid_amount
  delta: number;             // paid_amount - approvedSum (should be 0)
};

export default function AdminReconcile() {
  const { lang } = useLang();
  const { settings } = useBkashSettings();
  const feePct = settings.fee_pct;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [onlyIssues, setOnlyIssues] = useState(true);

  const load = async () => {
    setLoading(true);
    const [billsRes, prRes, flatsRes] = await Promise.all([
      supabase.from("bills").select("id, flat_id, month, total, paid_amount, status").order("month", { ascending: false }).limit(2000),
      supabase.from("payment_requests").select("bill_id, amount, method, status").eq("status", "approved").limit(2000),
      supabase.from("flats").select("id, flat_no, owner_name"),
    ]);
    const flatMap = new Map((flatsRes.data ?? []).map((f: any) => [f.id, f]));
    const sumByBill = new Map<string, number>();
    const bkashByBill = new Map<string, number>();
    for (const pr of (prRes.data ?? []) as any[]) {
      sumByBill.set(pr.bill_id, round2((sumByBill.get(pr.bill_id) ?? 0) + Number(pr.amount || 0)));
      if (pr.method === "bkash") {
        // fee = amount * feePct (metadata, since amount stored is the base due)
        const fee = round2(Number(pr.amount || 0) * (feePct || 0));
        bkashByBill.set(pr.bill_id, round2((bkashByBill.get(pr.bill_id) ?? 0) + fee));
      }
    }
    const out: Row[] = [];
    for (const b of (billsRes.data ?? []) as any[]) {
      const f: any = flatMap.get(b.flat_id);
      const approvedSum = round2(sumByBill.get(b.id) ?? 0);
      const paid = round2(Number(b.paid_amount || 0));
      const total = round2(Number(b.total || 0));
      out.push({
        bill_id: b.id,
        flat_id: b.flat_id,
        flat_no: f?.flat_no ?? "—",
        owner_name: f?.owner_name ?? null,
        month: b.month,
        total,
        paid_amount: paid,
        status: b.status,
        approvedSum,
        bkashFee: round2(bkashByBill.get(b.id) ?? 0),
        expectedDue: round2(total - paid),
        delta: round2(paid - approvedSum),
      });
    }
    setRows(out);
    setLoading(false);
  };

  useEffect(() => { load(); }, [feePct]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return rows.filter((r) => {
      if (onlyIssues && Math.abs(r.delta) < 0.01) return false;
      if (!s) return true;
      return (
        r.flat_no.toLowerCase().includes(s) ||
        (r.owner_name ?? "").toLowerCase().includes(s) ||
        r.month.includes(s)
      );
    });
  }, [rows, q, onlyIssues]);

  const issuesCount = rows.filter(r => Math.abs(r.delta) >= 0.01).length;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3">
            <ScanSearch className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {lang === "bn" ? "পেমেন্ট রিকনসিলিয়েশন" : "Payment Reconciliation"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {lang === "bn"
                  ? "bills.paid_amount বনাম অনুমোদিত payment_requests-এর যোগফল মিলিয়ে দেখুন। bKash ফি শুধু মেটা।"
                  : "Verify bills.paid_amount equals sum of approved payment_requests. bKash fee is metadata only."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={lang === "bn" ? "ফ্ল্যাট/ওনার/মাস..." : "Flat / owner / month..."}
              className="pl-9" />
          </div>
          <Button variant={onlyIssues ? "default" : "outline"} size="sm" onClick={() => setOnlyIssues(v => !v)}>
            {onlyIssues
              ? (lang === "bn" ? "শুধু গরমিল" : "Only mismatches")
              : (lang === "bn" ? "সব দেখান" : "Show all")}
          </Button>
          <div className="ml-auto text-sm">
            {issuesCount === 0 ? (
              <span className="inline-flex items-center gap-1 text-success font-medium">
                <CheckCircle2 className="h-4 w-4" /> {lang === "bn" ? "সব মিলে গেছে" : "All reconciled"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-destructive font-medium">
                <AlertTriangle className="h-4 w-4" /> {issuesCount} {lang === "bn" ? "টি গরমিল" : "mismatches"}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border shadow-soft overflow-x-auto">
          {loading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left p-3">{lang === "bn" ? "মাস" : "Month"}</th>
                  <th className="text-left p-3">{lang === "bn" ? "ফ্ল্যাট" : "Flat"}</th>
                  <th className="text-right p-3">{lang === "bn" ? "মোট" : "Total"}</th>
                  <th className="text-right p-3">paid_amount</th>
                  <th className="text-right p-3">{lang === "bn" ? "অনুমোদিত যোগ" : "Approved Σ"}</th>
                  <th className="text-right p-3">Δ</th>
                  <th className="text-right p-3">{lang === "bn" ? "বকেয়া" : "Due"}</th>
                  <th className="text-right p-3 italic">bKash fee (meta)</th>
                  <th className="text-left p-3">{lang === "bn" ? "স্ট্যাটাস" : "Status"}</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">
                    {lang === "bn" ? "কোনো গরমিল নেই" : "Nothing to show"}
                  </td></tr>
                )}
                {filtered.map((r) => {
                  const bad = Math.abs(r.delta) >= 0.01;
                  return (
                    <tr key={r.bill_id} className={bad ? "bg-destructive/5" : "hover:bg-muted/30"}>
                      <td className="p-3 font-mono text-xs">{r.month}</td>
                      <td className="p-3">
                        <div className="font-medium">{r.flat_no}</div>
                        <div className="text-xs text-muted-foreground">{r.owner_name ?? "—"}</div>
                      </td>
                      <td className="p-3 text-right">{formatMoney(r.total, lang)}</td>
                      <td className="p-3 text-right">{formatMoney(r.paid_amount, lang)}</td>
                      <td className="p-3 text-right">{formatMoney(r.approvedSum, lang)}</td>
                      <td className={`p-3 text-right font-bold ${bad ? "text-destructive" : "text-success"}`}>
                        {r.delta > 0 ? "+" : ""}{formatMoney(r.delta, lang)}
                      </td>
                      <td className="p-3 text-right">{formatMoney(r.expectedDue, lang)}</td>
                      <td className="p-3 text-right text-muted-foreground italic">
                        {r.bkashFee ? formatMoney(r.bkashFee, lang) : "—"}
                      </td>
                      <td className="p-3 text-xs uppercase">{r.status}</td>
                      <td className="p-3 text-right">
                        <Link to={`/admin/ledger?flat=${r.flat_id}`}
                          className="text-primary hover:underline text-xs">
                          {lang === "bn" ? "লেজার" : "Ledger"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-muted-foreground italic">
          {lang === "bn"
            ? "Δ = paid_amount − অনুমোদিত পেমেন্টের যোগফল। ০ মানে ঠিক আছে। bKash ফি কলাম শুধু রেফারেন্স — লেজার বা ক্যাশে প্রভাব ফেলে না।"
            : "Δ = paid_amount − sum(approved payments). 0 means consistent. bKash fee column is reference only — it does not affect ledger or cash."}
        </p>
      </div>
    </AppShell>
  );
}
