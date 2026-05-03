import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney } from "@/i18n/translations";
import { StatusBadge, FlatStatus } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerFlat } from "@/hooks/useOwnerFlat";
import { Skeleton } from "@/components/ui/skeleton";

type Bill = {
  id: string;
  month: string;
  service_charge: number;
  gas_bill: number;
  parking: number;
  eid_bonus: number;
  other_charge: number;
  arrears: number;
  other_note: string | null;
  other_due_date: string | null;
  total: number;
  paid_amount: number;
  status: FlatStatus;
};

export default function OwnerDues() {
  const { t, lang } = useLang();
  const { flat, loading: flatLoading } = useOwnerFlat();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!flat) {
      setBills([]);
      setLoading(flatLoading);
      return;
    }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bills")
        .select("id, month, service_charge, gas_bill, parking, eid_bonus, other_charge, arrears, other_note, other_due_date, total, paid_amount, status")
        .eq("flat_id", flat.id)
        .order("month", { ascending: false });
      if (error) toast.error(error.message);
      setBills((data ?? []) as Bill[]);
      setLoading(false);
    })();
  }, [flat, flatLoading]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("myDues")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("flatNo")}: {flat?.flat_no ?? "—"}</p>
        </div>
        <div className="rounded-2xl bg-card border border-border shadow-soft divide-y divide-border">
          {loading && (
            <div className="p-5 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          )}
          {!loading && bills.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">{t("noData")}</div>
          )}
          {!loading && bills.map((b) => {
            const due = Number(b.total) - Number(b.paid_amount);
            const eid = Number(b.eid_bonus);
            const other = Number(b.other_charge);
            return (
              <div key={b.id} className="p-5 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground">{b.month}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t("serviceCharge")}: {formatMoney(Number(b.service_charge), lang)} · {t("gasBill")}: {formatMoney(Number(b.gas_bill), lang)}
                    {Number(b.parking) > 0 && ` · ${t("parking")}: ${formatMoney(Number(b.parking), lang)}`}
                  </div>
                  {(eid > 0 || other > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {eid > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 text-warning text-[11px] font-semibold px-2 py-0.5">
                          🎉 {t("eidBonus")}: {formatMoney(eid, lang)}
                        </span>
                      )}
                      {other > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent/30 text-foreground text-[11px] font-semibold px-2 py-0.5">
                          {b.other_note || t("otherCharge")}: {formatMoney(other, lang)}
                          {b.other_due_date && ` · ${lang === "bn" ? "ডিউ" : "due"} ${b.other_due_date}`}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-bold text-foreground">{formatMoney(Number(b.total), lang)}</div>
                  {due > 0 && <div className="text-xs text-destructive">{t("due")}: {formatMoney(due, lang)}</div>}
                </div>
                <StatusBadge status={b.status} />
                {due > 0 && (
                  <Button size="sm" className="gradient-primary text-primary-foreground gap-1.5"
                    onClick={() => toast.info(lang === "bn" ? "অনলাইন পেমেন্ট শীঘ্রই" : "Online payment coming soon")}>
                    <CreditCard className="h-3.5 w-3.5" /> {t("payNow")}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
