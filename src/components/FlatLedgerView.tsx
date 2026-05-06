import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Printer, Wallet, ArrowDownCircle, ArrowUpCircle, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangContext";
import { formatMoney, formatNumber } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export type LedgerFlat = {
  id: string;
  flat_no: string;
  floor: number;
  size: number;
  owner_name: string | null;
  owner_name_bn: string | null;
  occupant_type?: string | null;
  occupant_name?: string | null;
  occupant_name_bn?: string | null;
};

type LedgerBill = {
  id: string;
  month: string;
  service_charge: number;
  gas_bill: number;
  parking: number;
  eid_bonus: number;
  other_charge: number;
  other_note: string | null;
  total: number;
  paid_amount: number;
  status: string;
  due_date: string | null;
  other_due_date: string | null;
  paid_at: string | null;
  generated_at: string;
};

type TimelineEntry =
  | { kind: "bill"; date: string; month: string; amount: number; bill: LedgerBill }
  | { kind: "payment"; date: string; month: string; amount: number; bill: LedgerBill };

const monthKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

const startOfMonthUTC = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

type BillPayment = {
  id: string;
  bill_id: string;
  amount: number;
  method: string;
  reviewed_at: string | null;
  created_at: string;
};

export function FlatLedgerView({ flat }: { flat: LedgerFlat }) {
  const { lang } = useLang();
  const [bills, setBills] = useState<LedgerBill[]>([]);
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState<Date>(() => {
    const d = new Date();
    return startOfMonthUTC(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 5, 1)));
  });
  const [toDate, setToDate] = useState<Date>(() => startOfMonthUTC(new Date()));

  const fromMonth = monthKey(fromDate);
  const toMonth = monthKey(toDate);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bills")
        .select("id, month, service_charge, gas_bill, parking, eid_bonus, other_charge, other_note, total, paid_amount, status, due_date, other_due_date, paid_at, generated_at")
        .eq("flat_id", flat.id)
        .gte("month", fromMonth)
        .lte("month", toMonth)
        .order("month", { ascending: true });
      if (error) toast.error(error.message);
      const billRows = (data ?? []) as LedgerBill[];
      setBills(billRows);
      // Fetch approved payments for these bills
      if (billRows.length > 0) {
        const { data: pr } = await supabase
          .from("payment_requests")
          .select("id, bill_id, amount, method, reviewed_at, created_at")
          .in("bill_id", billRows.map(b => b.id))
          .eq("status", "approved")
          .order("reviewed_at", { ascending: true });
        setPayments((pr ?? []) as BillPayment[]);
      } else {
        setPayments([]);
      }
      setLoading(false);
    })();
  }, [flat.id, fromMonth, toMonth]);

  // Map of bill_id -> approved payments (sorted)
  const paymentsByBill = useMemo(() => {
    const m: Record<string, BillPayment[]> = {};
    payments.forEach(p => { (m[p.bill_id] ??= []).push(p); });
    return m;
  }, [payments]);

  // Summary
  const summary = useMemo(() => {
    const totalBilled = bills.reduce((s, b) => s + Number(b.total || 0), 0);
    const totalPaid = bills.reduce((s, b) => s + Number(b.paid_amount || 0), 0);
    const balance = totalBilled - totalPaid;
    const unpaidCount = bills.filter((b) => b.status !== "paid").length;
    return { totalBilled, totalPaid, balance, unpaidCount, billCount: bills.length };
  }, [bills]);


  // Timeline (interleaved bills + payments) sorted by date, with running balance
  const timeline = useMemo(() => {
    const entries: TimelineEntry[] = [];
    bills.forEach((b) => {
      entries.push({
        kind: "bill",
        date: b.generated_at,
        month: b.month,
        amount: Number(b.total || 0),
        bill: b,
      });
      if (Number(b.paid_amount) > 0) {
        entries.push({
          kind: "payment",
          date: b.paid_at || b.generated_at,
          month: b.month,
          amount: Number(b.paid_amount || 0),
          bill: b,
        });
      }
    });
    entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.kind === "bill" ? -1 : 1));
    let running = 0;
    return entries.map((e) => {
      running += e.kind === "bill" ? e.amount : -e.amount;
      return { ...e, balance: running };
    });
  }, [bills]);

  const ownName = lang === "bn" ? flat.owner_name_bn : flat.owner_name;
  const occName = lang === "bn" ? flat.occupant_name_bn : flat.occupant_name;

  return (
    <div className="space-y-4">
      {/* Controls (hidden on print) */}
      <div className="print-hide flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            {lang === "bn" ? "শুরু মাস" : "From Month"}
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-44 justify-start font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(fromDate, "MMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={(d) => d && setFromDate(startOfMonthUTC(new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1))))}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            {lang === "bn" ? "শেষ মাস" : "To Month"}
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-44 justify-start font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(toDate, "MMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={toDate}
                onSelect={(d) => d && setToDate(startOfMonthUTC(new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1))))}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="ml-auto">
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            {lang === "bn" ? "প্রিন্ট / PDF" : "Print / PDF"}
          </Button>
        </div>
      </div>

      <div className="print-area space-y-4">
        {/* Print header */}
        <div className="border-b border-border pb-3">
          <div className="hidden print:block text-center mb-3">
            <div className="text-lg font-bold text-black">
              {lang === "bn" ? "শেখ বাচ্চু টাওয়ার সোসাইটি" : "Sheikh Bachchu Tower Society"}
            </div>
            <div className="text-xs text-black">
              {lang === "bn"
                ? "১৪/২, শেখ বাচ্চু টাওয়ার, মোক্তারবাড়ী রোড, আউচপাড়া, টঙ্গী, গাজীপুর।"
                : "14/2, Sheikh Bachchu Tower, Moktarbari Road, Auchpara, Tongi, Gazipur."}
            </div>
          </div>
          <div className="text-lg font-bold print:hidden">
            {lang === "bn" ? "শেখ বাচ্চু টাওয়ার" : "Sheikh Bachchu Tower"}
          </div>
          <div className="text-sm text-muted-foreground">
            {lang === "bn" ? "ফ্ল্যাট লেজার" : "Flat Ledger"} · {fromMonth} → {toMonth}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
            <div>
              <span className="text-muted-foreground">{lang === "bn" ? "ফ্ল্যাট: " : "Flat: "}</span>
              <span className="font-semibold">
                {flat.flat_no} ({lang === "bn" ? "ফ্লোর" : "Floor"} {flat.floor})
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">{lang === "bn" ? "সাইজ: " : "Size: "}</span>
              <span className="font-semibold">{formatNumber(flat.size, lang)} sqft</span>
            </div>
            <div>
              <span className="text-muted-foreground">{lang === "bn" ? "ওনার: " : "Owner: "}</span>
              <span className="font-semibold">{ownName || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{lang === "bn" ? "অকুপ্যান্ট: " : "Occupant: "}</span>
              <span className="font-semibold">{occName || ownName || "—"}</span>
            </div>
            <div className="col-span-2 text-xs text-muted-foreground">
              {lang === "bn" ? "জেনারেট: " : "Generated: "} {new Date().toLocaleString()}
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard
            icon={<Receipt className="h-4 w-4" />}
            label={lang === "bn" ? "মোট বিল" : "Total Billed"}
            value={formatMoney(summary.totalBilled, lang)}
            sub={`${formatNumber(summary.billCount, lang)} ${lang === "bn" ? "টি বিল" : "bills"}`}
          />
          <SummaryCard
            icon={<ArrowDownCircle className="h-4 w-4" />}
            label={lang === "bn" ? "মোট পেইড" : "Total Paid"}
            value={formatMoney(summary.totalPaid, lang)}
            tone="success"
          />
          <SummaryCard
            icon={<ArrowUpCircle className="h-4 w-4" />}
            label={lang === "bn" ? "চলতি বকেয়া" : "Current Balance"}
            value={formatMoney(summary.balance, lang)}
            tone={summary.balance > 0 ? "destructive" : "success"}
          />
          <SummaryCard
            icon={<Wallet className="h-4 w-4" />}
            label={lang === "bn" ? "আনপেইড বিল" : "Unpaid Bills"}
            value={formatNumber(summary.unpaidCount, lang)}
            tone={summary.unpaidCount > 0 ? "warning" : "default"}
          />
        </div>

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : bills.length === 0 ? (
          <div className="rounded-lg border border-border p-12 text-center text-muted-foreground text-sm">
            {lang === "bn" ? "এই রেঞ্জে কোনো বিল নেই।" : "No bills in this range."}
          </div>
        ) : (
          <>
            {/* Monthly bill breakdown */}
            <div className="rounded-lg border border-border overflow-x-auto">
              <div className="px-3 py-2 bg-muted/50 text-sm font-semibold border-b border-border">
                {lang === "bn" ? "মাসভিত্তিক বিল" : "Monthly Bills"}
              </div>
              <table className="w-full text-xs">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left p-2 font-medium">{lang === "bn" ? "মাস" : "Month"}</th>
                    <th className="text-right p-2 font-medium">{lang === "bn" ? "সার্ভিস" : "Service"}</th>
                    <th className="text-right p-2 font-medium">{lang === "bn" ? "গ্যাস" : "Gas"}</th>
                    <th className="text-right p-2 font-medium">{lang === "bn" ? "পার্কিং" : "Parking"}</th>
                    <th className="text-right p-2 font-medium">{lang === "bn" ? "ঈদ" : "Eid"}</th>
                    <th className="text-right p-2 font-medium">{lang === "bn" ? "অন্যান্য" : "Other"}</th>
                    <th className="text-right p-2 font-medium">{lang === "bn" ? "মোট" : "Total"}</th>
                    <th className="text-right p-2 font-medium">{lang === "bn" ? "পেইড" : "Paid"}</th>
                    <th className="text-right p-2 font-medium">{lang === "bn" ? "বকেয়া" : "Due"}</th>
                    <th className="text-left p-2 font-medium">{lang === "bn" ? "স্ট্যাটাস" : "Status"}</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b) => {
                    const due = Number(b.total) - Number(b.paid_amount);
                    return (
                      <tr key={b.id} className="border-t border-border">
                        <td className="p-2 font-medium">{b.month}</td>
                        <td className="p-2 text-right">{formatMoney(b.service_charge, lang)}</td>
                        <td className="p-2 text-right">{formatMoney(b.gas_bill, lang)}</td>
                        <td className="p-2 text-right">{formatMoney(b.parking, lang)}</td>
                        <td className="p-2 text-right">{Number(b.eid_bonus) > 0 ? formatMoney(b.eid_bonus, lang) : "—"}</td>
                        <td className="p-2 text-right">{Number(b.other_charge) > 0 ? formatMoney(b.other_charge, lang) : "—"}</td>
                        <td className="p-2 text-right font-semibold">{formatMoney(b.total, lang)}</td>
                        <td className="p-2 text-right text-success">{formatMoney(b.paid_amount, lang)}</td>
                        <td className={"p-2 text-right font-semibold " + (due > 0 ? "text-destructive" : "")}>
                          {formatMoney(due, lang)}
                        </td>
                        <td className="p-2">
                          <span className={
                            "inline-block px-2 py-0.5 rounded text-[10px] font-bold " +
                            (b.status === "paid"
                              ? "bg-success/15 text-success"
                              : b.status === "partial"
                              ? "bg-warning/15 text-warning"
                              : "bg-destructive/15 text-destructive")
                          }>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted/40 font-semibold">
                  <tr>
                    <td className="p-2">{lang === "bn" ? "মোট" : "Total"}</td>
                    <td colSpan={5}></td>
                    <td className="p-2 text-right">{formatMoney(summary.totalBilled, lang)}</td>
                    <td className="p-2 text-right text-success">{formatMoney(summary.totalPaid, lang)}</td>
                    <td className={"p-2 text-right " + (summary.balance > 0 ? "text-destructive" : "")}>
                      {formatMoney(summary.balance, lang)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Timeline */}
            <div className="rounded-lg border border-border">
              <div className="px-3 py-2 bg-muted/50 text-sm font-semibold border-b border-border">
                {lang === "bn" ? "টাইমলাইন (বিল ও পেমেন্ট)" : "Timeline (Bills & Payments)"}
              </div>
              <ol className="divide-y divide-border">
                {timeline.map((e, i) => {
                  const isBill = e.kind === "bill";
                  return (
                    <li key={i} className="p-3 flex items-start gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                        isBill ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                      )}>
                        {isBill ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 flex-wrap">
                          <div className="text-sm font-medium">
                            {isBill
                              ? (lang === "bn" ? "বিল জেনারেট" : "Bill Generated")
                              : (lang === "bn" ? "পেমেন্ট গৃহীত" : "Payment Received")}
                            <span className="text-xs text-muted-foreground ml-2">{e.month}</span>
                          </div>
                          <div className={cn(
                            "text-sm font-bold",
                            isBill ? "text-destructive" : "text-success"
                          )}>
                            {isBill ? "+" : "−"} {formatMoney(e.amount, lang)}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
                          <span>{format(new Date(e.date), "PP")}</span>
                          <span>
                            {lang === "bn" ? "ব্যালেন্স: " : "Balance: "}
                            <span className={cn(
                              "font-semibold",
                              e.balance > 0 ? "text-destructive" : "text-success"
                            )}>
                              {formatMoney(e.balance, lang)}
                            </span>
                          </span>
                        </div>
                        {isBill && e.bill.other_note && (
                          <div className="text-[11px] text-muted-foreground mt-1 italic">
                            {e.bill.other_note}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "success" | "destructive" | "warning";
}) {
  const toneClass =
    tone === "success" ? "text-success"
    : tone === "destructive" ? "text-destructive"
    : tone === "warning" ? "text-warning"
    : "text-foreground";
  return (
    <div className="rounded-lg border border-border p-3 bg-card">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className={cn("text-lg font-bold mt-1", toneClass)}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
