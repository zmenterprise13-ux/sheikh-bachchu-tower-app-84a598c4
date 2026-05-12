import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney, formatNumber } from "@/i18n/translations";
import { StatusBadge, FlatStatus } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { CreditCard, ChevronDown, Building2, Home, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerFlats, OwnerFlat } from "@/hooks/useOwnerFlat";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useSslczSettings } from "@/hooks/useSslczSettings";


type Bill = {
  id: string;
  flat_id: string;
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
  const { user } = useAuth();
  const { flats, loading: flatsLoading } = useOwnerFlats();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [payingId, setPayingId] = useState<string | null>(null);
  const { settings: sslcz } = useSslczSettings();
  const navigate = useNavigate();

  type Preview = {
    billId: string;
    flatId: string;
    flatNo?: string;
    month?: string;
    due: number;
    fee: number;
    total: number;
    errors: string[];
  };
  const [preview, setPreview] = useState<Preview | null>(null);

  const openPreview = (bill: Bill, flat: OwnerFlat | undefined, due: number) => {
    const errors: string[] = [];
    if (!sslcz.enabled) {
      errors.push(lang === "bn" ? "অনলাইন পেমেন্ট চালু নেই" : "Online payment is disabled");
    }
    if (due < sslcz.min_amount) {
      errors.push(
        lang === "bn"
          ? `সর্বনিম্ন পরিমাণ ৳${sslcz.min_amount} (এই বিল ৳${due})`
          : `Minimum allowed is ৳${sslcz.min_amount} (this bill is ৳${due})`
      );
    }
    if (sslcz.max_amount > 0 && due > sslcz.max_amount) {
      errors.push(
        lang === "bn"
          ? `সর্বোচ্চ পরিমাণ ৳${sslcz.max_amount} (এই বিল ৳${due})`
          : `Maximum allowed is ৳${sslcz.max_amount} (this bill is ৳${due})`
      );
    }
    const fee = +(due * (sslcz.fee_pct || 0)).toFixed(2);
    const total = +(due + fee).toFixed(2);
    setPreview({
      billId: bill.id, flatId: bill.flat_id,
      flatNo: flat?.flat_no, month: bill.month,
      due, fee, total, errors,
    });
  };

  const confirmPay = async () => {
    if (!preview || preview.errors.length > 0) return;
    setPayingId(preview.billId);
    try {
      const { data, error } = await supabase.functions.invoke("sslcz-init", {
        body: { bill_id: preview.billId, flat_id: preview.flatId, amount: preview.total, return_origin: window.location.origin },
      });
      if (error) throw error;
      if (!data?.url) throw new Error(data?.error || "Gateway init failed");
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e?.message || String(e));
      setPayingId(null);
    }
  };

  useEffect(() => {
    if (flats.length === 0) {
      setBills([]);
      setLoading(flatsLoading);
      return;
    }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bills")
        .select("id, flat_id, month, service_charge, gas_bill, parking, eid_bonus, other_charge, arrears, other_note, other_due_date, total, paid_amount, status")
        .in("flat_id", flats.map(f => f.id))
        .order("month", { ascending: false });
      if (error) toast.error(error.message);
      setBills((data ?? []) as Bill[]);
      setLoading(false);
    })();
  }, [flats, flatsLoading]);

  // Group bills by flat
  const groups = useMemo(() => {
    return flats.map(f => {
      const flatBills = bills.filter(b => b.flat_id === f.id);
      const due = flatBills.reduce((s, b) => s + Math.max(0, Number(b.total) - Number(b.paid_amount)), 0);
      const total = flatBills.reduce((s, b) => s + Number(b.total), 0);
      const isRented = !!(user && f.owner_user_id === user.id && f.tenant_user_id && f.tenant_user_id !== user.id);
      return { flat: f, bills: flatBills, due, total, isRented };
    });
  }, [flats, bills, user]);

  // Default open: flats with due
  useEffect(() => {
    if (groups.length === 0) return;
    setOpenMap(prev => {
      const next = { ...prev };
      groups.forEach(g => {
        if (next[g.flat.id] === undefined) next[g.flat.id] = g.due > 0;
      });
      return next;
    });
  }, [groups]);

  const grandDue = groups.reduce((s, g) => s + g.due, 0);

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="rounded-2xl gradient-hero text-primary-foreground p-5 shadow-elevated">
          <div className="text-xs opacity-90 uppercase tracking-wide">{t("myDues")}</div>
          <div className="mt-1 text-3xl font-extrabold tabular-nums">{formatMoney(grandDue, lang)}</div>
          <div className="text-xs opacity-90 mt-1">
            {formatNumber(flats.length, lang)} {lang === "bn" ? "ফ্ল্যাট" : "flats"} · {lang === "bn" ? "মোট বকেয়া" : "Total due"}
          </div>
        </div>

        {(loading || flatsLoading) && (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        )}

        {!loading && groups.length === 0 && (
          <div className="rounded-2xl bg-card border border-border p-12 text-center text-muted-foreground">{t("noData")}</div>
        )}

        {!loading && groups.map((g) => {
          const open = !!openMap[g.flat.id];
          return (
            <Collapsible
              key={g.flat.id}
              open={open}
              onOpenChange={(v) => setOpenMap(p => ({ ...p, [g.flat.id]: v }))}
            >
              <div className={cn(
                "rounded-2xl bg-card border shadow-soft overflow-hidden",
                g.due > 0 ? "border-destructive/40" : "border-border"
              )}>
                <CollapsibleTrigger className="w-full p-4 flex items-center gap-3 hover:bg-muted/40 transition-colors text-left">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                    g.isRented ? "bg-accent/20 text-accent-foreground" : "bg-primary/10 text-primary"
                  )}>
                    {g.isRented ? <Home className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-bold text-foreground">{lang === "bn" ? "ফ্ল্যাট" : "Flat"} {g.flat.flat_no}</div>
                      {g.isRented && (
                        <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-accent/20 text-accent-foreground">
                          {lang === "bn" ? "ভাড়া" : "Rented"}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {formatNumber(g.bills.length, lang)} {lang === "bn" ? "বিল" : "bills"} · {lang === "bn" ? "মোট" : "Total"} {formatMoney(g.total, lang)}
                    </div>
                  </div>
                  <div className="text-right">
                    {g.due > 0 ? (
                      <div className="font-bold text-destructive tabular-nums">{formatMoney(g.due, lang)}</div>
                    ) : (
                      <div className="text-xs font-semibold text-success flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {lang === "bn" ? "পরিশোধিত" : "Paid"}
                      </div>
                    )}
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="divide-y divide-border border-t border-border">
                    {g.bills.length === 0 && (
                      <div className="p-6 text-center text-sm text-muted-foreground">{t("noData")}</div>
                    )}
                    {g.bills.map((b) => {
                      const due = Number(b.total) - Number(b.paid_amount);
                      const eid = Number(b.eid_bonus);
                      const other = Number(b.other_charge);
                      return (
                        <div key={b.id} className="p-4 flex items-center gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-foreground text-sm">{b.month}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {t("serviceCharge")}: {formatMoney(Number(b.service_charge), lang)} · {t("gasBill")}: {formatMoney(Number(b.gas_bill), lang)}
                              {Number(b.parking) > 0 && ` · ${t("parking")}: ${formatMoney(Number(b.parking), lang)}`}
                            </div>
                            {(eid > 0 || other > 0 || Number(b.arrears) > 0) && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {Number(b.arrears) > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 text-destructive text-[11px] font-semibold px-2 py-0.5">
                                    {lang === "bn" ? "পূর্বের বাকি" : "Arrears"}: {formatMoney(Number(b.arrears), lang)}
                                  </span>
                                )}
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
                            <div className="font-bold text-foreground text-sm">{formatMoney(Number(b.total), lang)}</div>
                            {due > 0 && <div className="text-[11px] text-destructive">{t("due")}: {formatMoney(due, lang)}</div>}
                          </div>
                          <StatusBadge status={b.status} />
                          {due > 0 && (
                            <div className="flex flex-wrap gap-1.5 ml-auto">
                              <Button size="sm" variant="outline" className="gap-1.5"
                                onClick={() => navigate(`/owner/payments?bill=${b.id}&pay=1`)}>
                                <CreditCard className="h-3.5 w-3.5" /> {t("payNow")}
                              </Button>
                              {sslcz.enabled && (
                                <Button size="sm" className="gradient-primary text-primary-foreground gap-1.5"
                                  disabled={payingId === b.id}
                                  onClick={() => sslOnline(b.id, b.flat_id, due)}>
                                  {payingId === b.id
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <>💳</>}
                                  {lang === "bn" ? "অনলাইনে পে" : "Pay Online"}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </AppShell>
  );
}
