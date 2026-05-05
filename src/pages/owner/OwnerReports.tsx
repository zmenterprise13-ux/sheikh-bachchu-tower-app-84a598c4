import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney } from "@/i18n/translations";
import { StatCard } from "@/components/StatCard";
import { Receipt, Wallet, AlertCircle, FileBarChart, CheckCircle2, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CombinedBillStatus, FlatStatus, GenerationStatus } from "@/components/StatusBadge";
import { useOwnerFlat } from "@/hooks/useOwnerFlat";
import { toast } from "sonner";
import { ReportPadBackground } from "@/components/ReportPadBackground";

type Bill = {
  id: string;
  month: string;
  service_charge: number;
  gas_bill: number;
  parking: number;
  eid_bonus: number;
  other_charge: number;
  total: number;
  paid_amount: number;
  paid_at: string | null;
  due_date: string | null;
  status: FlatStatus;
  generation_status: GenerationStatus;
};

const currentMonth = () => new Date().toISOString().slice(0, 7);
const STORAGE_KEY = "owner_reports_month";

export default function OwnerReports() {
  const { t, lang } = useLang();
  const { flat, loading: flatLoading } = useOwnerFlat();
  const [month, setMonth] = useState<string>(() => {
    if (typeof window === "undefined") return currentMonth();
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved && /^\d{4}-\d{2}$/.test(saved) ? saved : currentMonth();
  });
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, month);
  }, [month]);

  useEffect(() => {
    if (!flat) {
      setLoading(flatLoading);
      return;
    }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bills")
        .select("id, month, service_charge, gas_bill, parking, eid_bonus, other_charge, total, paid_amount, paid_at, due_date, status, generation_status")
        .eq("flat_id", flat.id)
        .eq("month", month)
        .maybeSingle();
      if (error) toast.error(error.message);
      setBill((data as Bill | null) ?? null);
      setLoading(false);
    })();
  }, [flat, flatLoading, month]);

  const monthLabel = useMemo(
    () => new Date(month + "-01").toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", { year: "numeric", month: "long" }),
    [month, lang],
  );

  const total = bill ? Number(bill.total) : 0;
  const paid = bill ? Number(bill.paid_amount) : 0;
  const due = Math.max(0, total - paid);

  if (flatLoading) {
    return <AppShell><Skeleton className="h-40 rounded-2xl" /></AppShell>;
  }

  if (!flat) {
    return (
      <AppShell>
        <div className="rounded-2xl bg-card border border-border p-12 text-center text-muted-foreground">
          {lang === "bn" ? "আপনার অ্যাকাউন্টের সাথে কোনো ফ্ল্যাট যুক্ত নেই।" : "No flat linked to your account."}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 print:hidden">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <FileBarChart className="h-6 w-6 text-primary" />
              {t("monthlyReport" as any) || (lang === "bn" ? "মাসিক রিপোর্ট" : "Monthly Report")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("flatNo")}: <span className="font-semibold text-foreground">{flat.flat_no}</span> · {monthLabel}
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("month")}</Label>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-44"
              />
            </div>
            <Button onClick={() => window.print()} variant="outline" size="sm" className="gap-1.5">
              <Printer className="h-4 w-4" />
              {lang === "bn" ? "প্রিন্ট / পিডিএফ" : "Print / PDF"}
            </Button>
          </div>
        </div>

        <div className="print-area space-y-6 relative">
          <ReportPadBackground />
          <div className="hidden print:block text-center mb-4 pb-3 border-b-2 border-black">
            <h1 className="text-xl font-bold text-black">
              {lang === "bn" ? "শেখ বাচ্চু টাওয়ার সোসাইটি" : "Sheikh Bachchu Tower Society"}
            </h1>
            <p className="text-xs text-black mt-1">
              {lang === "bn"
                ? "১৪/২, শেখ বাচ্চু টাওয়ার, মোক্তারবাড়ী রোড, আউচপাড়া, টঙ্গী, গাজীপুর।"
                : "14/2, Sheikh Bachchu Tower, Moktarbari Road, Auchpara, Tongi, Gazipur."}
            </p>
            <p className="text-sm text-black mt-2 font-semibold">
              {lang === "bn" ? "মাসিক বিল রিপোর্ট" : "Monthly Bill Report"} · {monthLabel}
            </p>
            <p className="text-xs text-black mt-1">
              {lang === "bn" ? "ফ্ল্যাট" : "Flat"}: <span className="font-semibold">{flat.flat_no}</span>
              {flat.owner_name && <> · {lang === "bn" ? "ওনার" : "Owner"}: <span className="font-semibold">{lang === "bn" ? (flat.owner_name_bn || flat.owner_name) : flat.owner_name}</span></>}
            </p>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
            </div>
          ) : !bill ? (
            <div className="rounded-2xl bg-card border border-border p-12 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <div className="font-semibold text-foreground">
                {lang === "bn" ? "এ মাসের কোনো বিল এখনো তৈরি হয়নি" : "No bill generated for this month yet"}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {lang === "bn" ? "অ্যাডমিন বিল তৈরি করলে এখানে দেখাবে।" : "Once admin generates the bill it will appear here."}
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label={t("total")} value={formatMoney(total, lang)} icon={Receipt} variant="primary" />
                <StatCard label={t("paid")} value={formatMoney(paid, lang)} icon={CheckCircle2} variant="success" />
                <StatCard label={t("due")} value={formatMoney(due, lang)} icon={Wallet} variant={due > 0 ? "warning" : "success"} />
              </div>

              <div className="rounded-2xl bg-card border border-border p-6 shadow-soft">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-foreground">{lang === "bn" ? "বিলের বিস্তারিত" : "Bill breakdown"}</h2>
                  <CombinedBillStatus generation={bill.generation_status} payment={bill.status} />
                </div>
                <div className="space-y-2 text-sm">
                  <Row label={t("serviceCharge")} value={formatMoney(Number(bill.service_charge), lang)} />
                  <Row label={t("gasBill")} value={formatMoney(Number(bill.gas_bill), lang)} />
                  {Number(bill.parking) > 0 && <Row label={t("parking")} value={formatMoney(Number(bill.parking), lang)} />}
                  {Number(bill.eid_bonus) > 0 && <Row label={t("eidBonus")} value={formatMoney(Number(bill.eid_bonus), lang)} />}
                  {Number(bill.other_charge) > 0 && <Row label={t("otherCharge")} value={formatMoney(Number(bill.other_charge), lang)} />}
                  <div className="flex justify-between pt-2 border-t-2 border-foreground/20">
                    <span className="font-bold">{t("total")}</span>
                    <span className="font-bold text-primary text-lg">{formatMoney(total, lang)}</span>
                  </div>
                  <Row label={t("paid")} value={formatMoney(paid, lang)} valueClass="text-success" />
                  {due > 0 && <Row label={t("due")} value={formatMoney(due, lang)} valueClass="text-destructive font-bold" />}
                  {bill.due_date && <Row label={lang === "bn" ? "শেষ তারিখ" : "Due date"} value={bill.due_date} />}
                  {bill.paid_at && <Row label={lang === "bn" ? "পরিশোধের তারিখ" : "Paid on"} value={bill.paid_at} />}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between border-b border-border pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}
