import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney, formatNumber } from "@/i18n/translations";
import { StatCard } from "@/components/StatCard";
import { CombinedBillStatus, FlatStatus, GenerationStatus } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Receipt, Megaphone, Home, AlertTriangle, Loader2, Download, Building2, CheckCircle2, Bell, FileText, TrendingUp, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerFlats, OwnerFlat } from "@/hooks/useOwnerFlat";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { AvatarImageWithSkeleton } from "@/components/AvatarImageWithSkeleton";
import { generateBillPdf } from "@/lib/billPdf";
import { InitialsFallback } from "@/components/InitialsFallback";
import { useAuth } from "@/context/AuthContext";
import { MonthlyFinanceSummary } from "@/components/MonthlyFinanceSummary";
import { cn } from "@/lib/utils";
import { residentName } from "@/lib/displayName";
import { useSelectedFlatId } from "@/hooks/useSelectedFlatId";
import { AnimatedNumber } from "@/components/AnimatedNumber";



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
  generated_at: string | null;
  status: FlatStatus;
  generation_status: GenerationStatus;
};

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function OwnerDashboard() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { flats, loading: flatsLoading, refetch: refetchFlats } = useOwnerFlats();
  const month = currentMonth();
  const [profileName, setProfileName] = useState<{ en: string | null; bn: string | null; avatar: string | null }>({ en: null, bn: null, avatar: null });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, display_name_bn, avatar_url").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) setProfileName({ en: data.display_name, bn: data.display_name_bn, avatar: (data as any).avatar_url });
      });
  }, [user]);
  const { selectedFlatId, setSelectedFlatId } = useSelectedFlatId();
  const [allBills, setAllBills] = useState<Record<string, Bill | null>>({});
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  
  const [loading, setLoading] = useState(true);

  const flat: OwnerFlat | null = useMemo(() => {
    if (flats.length === 0) return null;
    const found = flats.find(f => f.id === selectedFlatId);
    return found ?? flats[0];
  }, [flats, selectedFlatId]);

  // Persist the resolved flat id (covers fallback case where stored id is missing)
  useEffect(() => {
    if (flat && flat.id !== selectedFlatId) setSelectedFlatId(flat.id);
  }, [flat, selectedFlatId, setSelectedFlatId]);

  useEffect(() => {
    if (flats.length === 0) {
      setLoading(flatsLoading);
      return;
    }
    (async () => {
      setLoading(true);
      const flatIds = flats.map(f => f.id);
      const billsRes = await supabase.from("bills")
        .select("id, flat_id, month, service_charge, gas_bill, parking, eid_bonus, other_charge, total, paid_amount, paid_at, due_date, generated_at, status, generation_status")
        .in("flat_id", flatIds).eq("month", month);
      const map: Record<string, Bill | null> = {};
      flatIds.forEach(id => { map[id] = null; });
      ((billsRes.data ?? []) as (Bill & { flat_id: string })[]).forEach(b => {
        map[b.flat_id] = b;
      });
      setAllBills(map);
      setLoading(false);
    })();
  }, [flats, flatsLoading, month]);

  // Refetch recent bills history whenever the selected flat changes
  useEffect(() => {
    if (!flat) return;
    let cancelled = false;
    (async () => {
      setRecentLoading(true);
      const { data } = await supabase
        .from("bills")
        .select("id, month, service_charge, gas_bill, parking, eid_bonus, other_charge, total, paid_amount, paid_at, due_date, generated_at, status, generation_status")
        .eq("flat_id", flat.id)
        .order("month", { ascending: false })
        .limit(6);
      if (!cancelled) {
        setRecentBills((data ?? []) as Bill[]);
        setRecentLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [flat?.id]);

  if (flatsLoading) {
    return <AppShell><Skeleton className="h-40 rounded-2xl" /></AppShell>;
  }

  if (!flat) {
    return (
      <AppShell>
        <div className="rounded-2xl bg-card border border-border p-12 text-center text-muted-foreground">
          {lang === "bn" ? "আপনার অ্যাকাউন্টের সাথে কোনো ফ্ল্যাট যুক্ত নেই। অ্যাডমিনের সাথে যোগাযোগ করুন।" : "No flat linked to your account. Please contact the admin."}
        </div>
      </AppShell>
    );
  }

  const currentBill = allBills[flat.id] ?? null;
  const due = currentBill ? Number(currentBill.total) - Number(currentBill.paid_amount) : 0;
  const totalDueAcrossFlats = flats.reduce((sum, f) => {
    const b = allBills[f.id];
    if (!b) return sum;
    return sum + Math.max(0, Number(b.total) - Number(b.paid_amount));
  }, 0);
  const hasMultipleFlats = flats.length > 1;

  const totalBilled = flats.reduce((sum, f) => {
    const b = allBills[f.id];
    return sum + (b ? Number(b.total) : 0);
  }, 0);
  const totalPaid = flats.reduce((sum, f) => {
    const b = allBills[f.id];
    return sum + (b ? Number(b.paid_amount) : 0);
  }, 0);
  const payPct = totalBilled > 0 ? Math.min(100, Math.round((totalPaid / totalBilled) * 100)) : 0;
  const currentBillTotal = currentBill ? Number(currentBill.total) : 0;
  const currentBillPaid = currentBill ? Number(currentBill.paid_amount) : 0;
  const currentPayPct = currentBillTotal > 0 ? Math.min(100, Math.round((currentBillPaid / currentBillTotal) * 100)) : 0;

  const isTenant = (flat.occupant_type ?? "").toLowerCase() === "tenant";
  const scopeFlats = isTenant ? [flat] : flats;
  const totalDueScoped = scopeFlats.reduce((sum, f) => {
    const b = allBills[f.id];
    if (!b) return sum;
    return sum + Math.max(0, Number(b.total) - Number(b.paid_amount));
  }, 0);
  const totalPaidScoped = scopeFlats.reduce((sum, f) => {
    const b = allBills[f.id];
    return sum + (b ? Number(b.paid_amount) : 0);
  }, 0);
  const totalBilledScoped = scopeFlats.reduce((sum, f) => {
    const b = allBills[f.id];
    return sum + (b ? Number(b.total) : 0);
  }, 0);
  const scopedPct = totalBilledScoped > 0 ? Math.min(100, Math.round((totalPaidScoped / totalBilledScoped) * 100)) : 0;
  const isPaid = totalDueScoped <= 0 && totalBilledScoped > 0;
  const showFlatSwitcher = scopeFlats.length > 1;

  // Item-wise breakdown across scoped flats (current month)
  const billItems = (() => {
    const sumField = (field: "service_charge" | "gas_bill" | "parking" | "eid_bonus" | "other_charge") =>
      scopeFlats.reduce((s, f) => {
        const b = allBills[f.id];
        return s + (b ? Number(b[field]) : 0);
      }, 0);
    return [
      { key: "service", label: t("serviceCharge"), value: sumField("service_charge"), icon: Home },
      { key: "gas", label: t("gasBill"), value: sumField("gas_bill"), icon: Receipt },
      { key: "parking", label: t("parking"), value: sumField("parking"), icon: Receipt },
      { key: "eid", label: lang === "bn" ? "ঈদ বোনাস" : "Eid Bonus", value: sumField("eid_bonus"), icon: Sparkles },
      { key: "other", label: t("otherCharge"), value: sumField("other_charge"), icon: Receipt },
    ].filter(i => i.value > 0);
  })();

  return (
    <AppShell>
      <div className="space-y-4 sm:space-y-5 animate-fade-in">
        {/* Compact greeting header */}
        <div className="relative rounded-2xl gradient-hero text-primary-foreground p-4 sm:p-5 shadow-elevated overflow-hidden">
          <div className="pointer-events-none absolute -top-16 -right-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-white/50 shadow-lg shrink-0">
              {(profileName.avatar || flat.owner_photo_url) ? (
                <AvatarImageWithSkeleton
                  src={(profileName.avatar || flat.owner_photo_url) as string}
                  alt={flat.owner_name ?? "profile"}
                  className="object-cover"
                />
              ) : null}
              <InitialsFallback name={flat.owner_name} seed={flat.id} className="text-lg" />
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs opacity-90">{t("welcome")},</div>
              <h1 className="text-base sm:text-xl font-bold truncate">
                {residentName(flat, lang) || profileName.bn || profileName.en || "—"}
              </h1>
              <div className="text-[11px] opacity-90 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <Building2 className="h-3 w-3 opacity-80" />
                {showFlatSwitcher ? (
                  <Select value={flat.id} onValueChange={(v) => setSelectedFlatId(v)}>
                    <SelectTrigger className="h-6 w-auto bg-white/15 border-white/30 text-primary-foreground hover:bg-white/25 px-2 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {flats.map((f) => {
                        const b = allBills[f.id];
                        const d = b ? Math.max(0, Number(b.total) - Number(b.paid_amount)) : 0;
                        return (
                          <SelectItem key={f.id} value={f.id}>
                            {f.flat_no} {d > 0 && <span className="text-destructive ml-1">· {formatMoney(d, lang)}</span>}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <span>{t("flatNo")}: <span className="font-bold">{flat.flat_no}</span></span>
                )}
                <span className="opacity-70">· {(flat.occupant_type ?? "").toLowerCase() === "tenant" ? (lang === "bn" ? "ভাড়াটিয়া" : "Tenant") : (lang === "bn" ? "মালিক" : "Owner")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* HERO summary card: due / paid / progress */}
        <div className={cn(
          "rounded-2xl border-2 p-5 shadow-soft transition-colors",
          isPaid ? "border-success/40 bg-success/5" : totalDueScoped > 0 ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"
        )}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className={cn("h-3.5 w-3.5", isPaid ? "text-success" : "text-destructive")} />
                {isTenant
                  ? (lang === "bn" ? "আপনার বকেয়া" : "Your Due")
                  : showFlatSwitcher
                    ? (lang === "bn" ? "মোট বকেয়া (সব ফ্ল্যাট)" : "Total Due (all flats)")
                    : (lang === "bn" ? "মোট বকেয়া" : "Total Due")}
              </div>
              <div className={cn(
                "mt-1 text-3xl sm:text-4xl font-extrabold tabular-nums",
                isPaid ? "text-success" : totalDueScoped > 0 ? "text-destructive" : "text-foreground"
              )}>
                <AnimatedNumber value={totalDueScoped} format={(n) => formatMoney(n, lang)} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {month} · {showFlatSwitcher ? `${scopeFlats.length} ${lang === "bn" ? "ফ্ল্যাট" : "flats"}` : `${lang === "bn" ? "ফ্ল্যাট" : "Flat"} ${flat.flat_no}`}
              </div>
            </div>
            {totalDueScoped > 0 && (
              <Button
                size="lg"
                className="gap-2 shadow-glow"
                onClick={() => toast.info(lang === "bn" ? "অনলাইন পেমেন্ট শীঘ্রই" : "Online payment coming soon")}
              >
                <CreditCard className="h-4 w-4" />
                {t("payNow")}
              </Button>
            )}
            {isPaid && (
              <div className="flex items-center gap-1.5 rounded-full bg-success/15 text-success px-3 py-1.5 text-sm font-bold">
                <CheckCircle2 className="h-4 w-4" />
                {lang === "bn" ? "সম্পূর্ণ পরিশোধিত" : "All Paid"}
              </div>
            )}
          </div>

          {totalBilledScoped > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
                <span>{lang === "bn" ? "এ মাসে পরিশোধিত" : "Paid this month"}: <span className="font-semibold text-foreground">{formatMoney(totalPaidScoped, lang)}</span> / {formatMoney(totalBilledScoped, lang)}</span>
                <span className="font-semibold text-foreground">{formatNumber(scopedPct, lang)}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    scopedPct >= 100 ? "bg-success" : scopedPct > 0 ? "bg-primary" : "bg-destructive"
                  )}
                  style={{ width: `${Math.max(4, scopedPct)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Multi-flat picker (compact) */}
        {showFlatSwitcher && (
          <div className="rounded-2xl bg-card border border-border p-4 shadow-soft">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-primary" />
                {lang === "bn" ? "আমার ফ্ল্যাট" : "My Flats"}
              </h2>
              <span className="text-[11px] text-muted-foreground">
                {lang === "bn" ? "ক্লিক করে সিলেক্ট করুন" : "Tap to select"}
              </span>
            </div>
            <div className="grid gap-2 grid-cols-2 lg:grid-cols-3">
              {flats.map((f) => {
                const b = allBills[f.id];
                const fTotal = b ? Number(b.total) : 0;
                const fPaid = b ? Number(b.paid_amount) : 0;
                const fDue = Math.max(0, fTotal - fPaid);
                const isActive = f.id === flat.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFlatId(f.id)}
                    className={cn(
                      "text-left rounded-xl border p-3 transition-all hover:-translate-y-0.5 hover:shadow-elegant",
                      isActive ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border bg-background"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="font-bold text-sm text-foreground">{f.flat_no}</div>
                      {isActive && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    {!b ? (
                      <div className="text-[11px] text-muted-foreground italic">{lang === "bn" ? "বিল নেই" : "No bill"}</div>
                    ) : fDue > 0 ? (
                      <div className="text-sm font-bold text-destructive tabular-nums">{formatMoney(fDue, lang)}</div>
                    ) : (
                      <div className="text-[11px] font-semibold text-success">{lang === "bn" ? "পরিশোধিত" : "Paid"}</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bill breakdown — service items */}
        <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 shadow-soft">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm">
              <Receipt className="h-4 w-4 text-primary" />
              {lang === "bn" ? "এ মাসের সার্ভিস বিবরণ" : "This Month's Services"}
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{month}</span>
            </h2>
            {currentBill && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-8"
                onClick={() => {
                  try {
                    generateBillPdf({
                      flatNo: flat.flat_no,
                      ownerName: flat.owner_name,
                      month: currentBill.month,
                      serviceCharge: Number(currentBill.service_charge),
                      gasBill: Number(currentBill.gas_bill),
                      parking: Number(currentBill.parking),
                      eidBonus: Number(currentBill.eid_bonus),
                      otherCharge: Number(currentBill.other_charge),
                      total: Number(currentBill.total),
                      paid: Number(currentBill.paid_amount),
                      due: Math.max(0, Number(currentBill.total) - Number(currentBill.paid_amount)),
                      dueDate: currentBill.due_date,
                      paidAt: currentBill.paid_at,
                      generatedOn: currentBill.generated_at,
                    });
                    toast.success(lang === "bn" ? "PDF ডাউনলোড শুরু" : "PDF download started");
                  } catch (err: any) {
                    toast.error(err.message ?? "PDF failed");
                  }
                }}
              >
                <Download className="h-3.5 w-3.5" />
                {t("download")}
              </Button>
            )}
          </div>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : billItems.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              {lang === "bn" ? "এ মাসের কোনো বিল এখনো তৈরি হয়নি।" : "No bill generated yet for this month."}
            </div>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                {billItems.map(it => (
                  <div key={it.key} className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <it.icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-foreground truncate">{it.label}</span>
                    </div>
                    <span className="text-sm font-bold text-foreground tabular-nums">{formatMoney(it.value, lang)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <span className="text-sm font-semibold text-muted-foreground">{t("total")}</span>
                <span className="text-xl font-extrabold text-primary tabular-nums">{formatMoney(totalBilledScoped, lang)}</span>
              </div>
            </>
          )}
        </div>

        {/* Recent bills */}
        <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border flex-wrap gap-2">
            <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm">
              <Receipt className="h-4 w-4 text-primary" />
              {lang === "bn" ? "সাম্প্রতিক বিল" : "Recent Bills"}
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {lang === "bn" ? "ফ্ল্যাট" : "Flat"} {flat.flat_no}
              </span>
            </h2>
            <Link to="/owner/bills">
              <Button variant="ghost" size="sm">{t("viewAll")}</Button>
            </Link>
          </div>
          {recentLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : recentBills.length === 0 ? (
            <div className="p-6 text-sm text-center text-muted-foreground">{t("noData")}</div>
          ) : (
            <div className="divide-y divide-border">
              {recentBills.map((b) => {
                const bDue = Math.max(0, Number(b.total) - Number(b.paid_amount));
                return (
                  <div key={b.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors">
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-foreground">{b.month}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {lang === "bn" ? "মোট" : "Total"}: {formatMoney(Number(b.total), lang)}
                      </div>
                    </div>
                    {bDue > 0 ? (
                      <div className="text-sm font-bold text-destructive tabular-nums">{formatMoney(bDue, lang)}</div>
                    ) : (
                      <div className="text-xs font-semibold text-success flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {lang === "bn" ? "পরিশোধিত" : "Paid"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/owner/finance-report" className="group rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-accent/10 p-4 shadow-soft flex items-center justify-between gap-3 hover:shadow-elegant hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground text-sm">{lang === "bn" ? "মাসিক রিপোর্ট" : "Monthly Report"}</div>
                <div className="text-[11px] text-muted-foreground">{lang === "bn" ? "আয়-ব্যয়ের পূর্ণ চিত্র" : "Full income & expenses"}</div>
              </div>
            </div>
            <TrendingUp className="h-4 w-4 text-primary group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link to="/owner/info" className="group rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-card to-primary/10 p-4 shadow-soft flex items-center justify-between gap-3 hover:shadow-elegant hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-accent/20 text-accent-foreground flex items-center justify-center shrink-0">
                <Megaphone className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground text-sm">{lang === "bn" ? "নোটিশ ও কমিটি" : "Notices & Committee"}</div>
                <div className="text-[11px] text-muted-foreground">{lang === "bn" ? "উপদেষ্টা ও সকল নোটিশ" : "Advisors & all notices"}</div>
              </div>
            </div>
            <Bell className="h-4 w-4 text-accent-foreground group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <MonthlyFinanceSummary month={month} variant="owner" />
      </div>
    </AppShell>
  );
}

