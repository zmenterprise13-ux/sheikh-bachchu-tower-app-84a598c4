import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DuesPopup } from "@/components/DuesPopup";
import { useLang } from "@/i18n/LangContext";
import { formatMoney, formatNumber } from "@/i18n/translations";
import { StatCard } from "@/components/StatCard";
import { CombinedBillStatus, FlatStatus, GenerationStatus } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Receipt, Megaphone, Home, AlertTriangle, Loader2, Download, Building2, CheckCircle2, Bell, FileText, TrendingUp, Sparkles, UserSquare2, ChevronRight } from "lucide-react";
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
import { HadithCard } from "@/components/HadithCard";



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

const calendarMonth = () => new Date().toISOString().slice(0, 7);

export default function OwnerDashboard() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { flats, loading: flatsLoading, refetch: refetchFlats } = useOwnerFlats();
  const [month, setMonth] = useState<string>(calendarMonth());
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
    if (found) return found;
    // Prefer a flat the user actually resides in (owner-occupied or tenant)
    const residence = flats.find(f => {
      if (!user) return false;
      if (f.tenant_user_id === user.id) return true;
      if (f.owner_user_id === user.id && (!f.tenant_user_id || f.tenant_user_id === user.id)) return true;
      return false;
    });
    return residence ?? flats[0];
  }, [flats, selectedFlatId, user]);

  // Persist the resolved flat id (covers fallback case where stored id is missing)
  useEffect(() => {
    if (flat && flat.id !== selectedFlatId) setSelectedFlatId(flat.id);
  }, [flat, selectedFlatId, setSelectedFlatId]);

  // Resolve current ledger month = latest bill month available across user's flats
  useEffect(() => {
    if (flats.length === 0) return;
    (async () => {
      const flatIds = flats.map(f => f.id);
      const { data } = await supabase
        .from("bills")
        .select("month")
        .in("flat_id", flatIds)
        .order("month", { ascending: false })
        .limit(1);
      if (data && data.length > 0) setMonth(data[0].month);
    })();
  }, [flats]);

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
  // Split flats: where the user resides vs flats they own but rented out to others
  const ownResidenceFlats = flats.filter(f => {
    if (user && f.tenant_user_id === user.id) return true; // tenant of this flat
    if (user && f.owner_user_id === user.id && (!f.tenant_user_id || f.tenant_user_id === user.id)) return true;
    return false;
  });
  const rentedOutFlats = flats.filter(f => user && f.owner_user_id === user.id && f.tenant_user_id && f.tenant_user_id !== user.id);
  const scopeFlats = ownResidenceFlats.length > 0 ? ownResidenceFlats : [flat];
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
  const totalRentedDue = rentedOutFlats.reduce((sum, f) => {
    const b = allBills[f.id];
    if (!b) return sum;
    return sum + Math.max(0, Number(b.total) - Number(b.paid_amount));
  }, 0);

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

  // Per-flat tint so user visually sees which flat is selected
  const flatHue = (() => {
    let h = 0;
    for (let i = 0; i < flat.id.length; i++) h = (h * 31 + flat.id.charCodeAt(i)) >>> 0;
    return h % 360;
  })();
  const flatTintStyle = {
    background: `linear-gradient(180deg, hsl(${flatHue} 70% 96%) 0%, hsl(${flatHue} 60% 99%) 60%, hsl(var(--background)) 100%)`,
  } as React.CSSProperties;
  const flatAccentStyle = {
    borderColor: `hsl(${flatHue} 60% 70%)`,
  } as React.CSSProperties;

  return (
    <AppShell>
      <DuesPopup />
      <div
        className="relative space-y-3 sm:space-y-5 animate-fade-in -mx-2 sm:-mx-4 px-2 sm:px-4 py-2 sm:py-3 rounded-2xl border-l-4 overflow-hidden"
        style={{ transition: "border-color 600ms ease", ...flatAccentStyle }}
      >
        {/* Smoothly crossfading tint layer keyed by flat */}
        <div
          key={flat.id}
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-2xl animate-fade-in"
          style={{ ...flatTintStyle, transition: "opacity 600ms ease" }}
        />
        {/* Premium greeting header */}
        {(() => {
          const hour = new Date().getHours();
          const greeting = lang === "bn"
            ? (hour < 12 ? "সুপ্রভাত" : hour < 17 ? "শুভ অপরাহ্ণ" : hour < 20 ? "শুভ সন্ধ্যা" : "শুভ রাত্রি")
            : (hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : hour < 20 ? "Good evening" : "Good night");
          const displayName = residentName(flat, lang) || profileName.bn || profileName.en || "—";
          const roleLabel = (flat.occupant_type ?? "").toLowerCase() === "tenant"
            ? (lang === "bn" ? "ভাড়াটিয়া" : "Tenant")
            : (lang === "bn" ? "মালিক" : "Owner");
          return (
            <div className="relative rounded-2xl sm:rounded-3xl gradient-hero text-primary-foreground p-4 sm:p-7 shadow-elevated overflow-hidden animate-slide-up-fade">
              {/* Decorative blurred orbs */}
              <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-white/15 blur-3xl animate-float-slow" />
              <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
              {/* Shimmer sweep */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
                <div className="absolute inset-y-0 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 animate-shimmer" />
              </div>
              {/* Twinkling sparkles */}
              <Sparkles className="pointer-events-none absolute top-3 right-4 h-4 w-4 text-white/80 animate-sparkle-twinkle" />
              <Sparkles className="pointer-events-none absolute bottom-4 right-12 h-3 w-3 text-white/60 animate-sparkle-twinkle" style={{ animationDelay: "0.7s" }} />
              <Sparkles className="pointer-events-none absolute top-8 left-1/2 h-3 w-3 text-white/50 animate-sparkle-twinkle" style={{ animationDelay: "1.3s" }} />

              <div className="relative flex items-center gap-3 sm:gap-5">
                {/* Bigger avatar with glowing animated ring */}
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-full animate-ring-glow" />
                  <Avatar className="relative h-16 w-16 sm:h-24 sm:w-24 border-[3px] border-white/70 shadow-2xl ring-2 ring-white/20 ring-offset-2 ring-offset-transparent">
                    {(profileName.avatar || flat.owner_photo_url) ? (
                      <AvatarImageWithSkeleton
                        src={(profileName.avatar || flat.owner_photo_url) as string}
                        alt={flat.owner_name ?? "profile"}
                        className="object-cover"
                      />
                    ) : null}
                    <InitialsFallback name={flat.owner_name} seed={flat.id} className="text-xl sm:text-2xl" />
                  </Avatar>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] font-semibold text-white/75 flex items-center gap-1.5">
                    <span>{greeting}</span>
                    <span className="text-white/40">·</span>
                    <span className="text-white/65">{t("welcome")}</span>
                  </div>
                  <h1 className="mt-1.5 text-[22px] sm:text-[34px] leading-[1.1] font-black tracking-tight truncate bg-gradient-to-r from-white via-white to-white/75 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
                    {displayName}
                  </h1>

                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {/* Premium flat badge */}
                    {showFlatSwitcher ? (
                      <Select value={flat.id} onValueChange={(v) => setSelectedFlatId(v)}>
                        <SelectTrigger className="h-8 w-auto bg-white/25 backdrop-blur-md border border-white/50 text-primary-foreground hover:bg-white/35 px-3 text-xs font-bold rounded-full shadow-md transition-all">
                          <Building2 className="h-3.5 w-3.5 mr-1.5 opacity-95" />
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
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/25 backdrop-blur-md border border-white/50 px-3 py-1 text-xs font-bold shadow-md tracking-wide">
                        <Building2 className="h-3.5 w-3.5 opacity-95" />
                        {t("flatNo")} <span className="font-black tracking-wider">{flat.flat_no}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-full bg-white/15 border border-white/35 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/90">
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}


        {/* HERO summary card — premium 3D */}
        <div
          className={cn(
            "group relative overflow-hidden rounded-2xl border animate-slide-up-fade",
            "transition-all duration-500 hover:-translate-y-1",
            isPaid
              ? "border-success/30 bg-gradient-to-br from-success/[0.12] via-card to-card"
              : totalDueScoped > 0
                ? "border-destructive/30 bg-gradient-to-br from-destructive/[0.12] via-card to-card"
                : "border-border bg-gradient-to-br from-primary/[0.06] via-card to-card"
          )}
          style={{
            animationDelay: "120ms",
            boxShadow:
              "0 1px 0 0 hsl(0 0% 100% / 0.6) inset, 0 -1px 0 0 hsl(0 0% 0% / 0.04) inset, 0 10px 30px -12px hsl(220 40% 20% / 0.18), 0 4px 10px -4px hsl(220 40% 20% / 0.08)",
          }}
        >
          {/* Glossy top sheen */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 via-white/10 to-transparent dark:from-white/[0.07] dark:via-white/[0.02]" />
          {/* Tinted orb */}
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute -top-16 -right-12 h-44 w-44 rounded-full blur-3xl animate-float-slow opacity-70",
              isPaid ? "bg-success/30" : totalDueScoped > 0 ? "bg-destructive/30" : "bg-primary/25"
            )}
          />
          {/* Shimmer sweep */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-y-0 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 animate-shimmer" />
          </div>

          <div className="relative p-3 sm:p-5">
            {/* Header chips */}
            <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-3 flex-wrap">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-background/80 backdrop-blur-md border border-border px-2.5 py-1 shadow-sm">
                <span
                  className={cn(
                    "inline-flex h-4 w-4 items-center justify-center rounded-full",
                    isPaid ? "bg-success/25 text-success" : "bg-destructive/25 text-destructive"
                  )}
                >
                  {isPaid ? <CheckCircle2 className="h-2.5 w-2.5" /> : <AlertTriangle className="h-2.5 w-2.5" />}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground">
                  {isTenant
                    ? (lang === "bn" ? "আপনার বকেয়া" : "Your Due")
                    : showFlatSwitcher
                      ? (lang === "bn" ? "মোট বকেয়া" : "Total Due")
                      : (lang === "bn" ? "বকেয়া" : "Due")}
                </span>
              </div>
              <div className="text-[10px] font-semibold text-muted-foreground/80 tabular-nums tracking-wide truncate max-w-full">
                {month} · {showFlatSwitcher ? `${scopeFlats.length} ${lang === "bn" ? "ফ্ল্যাট" : "flats"}` : flat.flat_no}
              </div>
            </div>

            {/* Amount + Progress ring + Action */}
            <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap">
              {/* Progress ring */}
              {totalBilledScoped > 0 && (
                <div className="relative shrink-0 w-14 h-14 sm:w-16 sm:h-16">
                  <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90 drop-shadow-sm">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                    <circle
                      cx="32" cy="32" r="26" fill="none"
                      stroke={`hsl(var(--${scopedPct >= 100 ? "success" : scopedPct > 0 ? "primary" : "destructive"}))`}
                      strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 26}
                      strokeDashoffset={2 * Math.PI * 26 * (1 - Math.min(100, scopedPct) / 100)}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-[11px] font-extrabold tabular-nums text-foreground">
                    {formatNumber(scopedPct, lang)}%
                  </div>
                </div>
              )}

              <div className="min-w-0 flex-1 basis-0">
                <div
                  className={cn(
                    "text-[22px] sm:text-[30px] leading-none font-black tabular-nums tracking-tight bg-clip-text text-transparent break-all",
                    isPaid
                      ? "bg-gradient-to-br from-success via-success to-success/70 drop-shadow-[0_2px_6px_hsl(var(--success)/0.25)]"
                      : totalDueScoped > 0
                        ? "bg-gradient-to-br from-destructive via-destructive to-destructive/70 drop-shadow-[0_2px_6px_hsl(var(--destructive)/0.25)]"
                        : "bg-gradient-to-br from-foreground to-foreground/70"
                  )}
                >
                  <AnimatedNumber value={totalDueScoped} format={(n) => formatMoney(n, lang)} />
                </div>
                <div className="mt-1.5 text-[11px] sm:text-xs font-medium text-muted-foreground line-clamp-1">
                  {isPaid
                    ? (lang === "bn" ? "এই মাসের সব বিল পরিশোধিত ✨" : "All bills cleared ✨")
                    : (lang === "bn" ? "এখনই পরিশোধ করুন" : "Pay to clear dues")}
                </div>
              </div>

              {totalDueScoped > 0 ? (
                <Button asChild size="sm" className="gap-1.5 shadow-glow rounded-full hover-scale h-9 px-3 sm:px-3.5 shrink-0">
                  <Link to={`/owner/payments?pay=1${showFlatSwitcher ? "" : `&flat=${flat.id}`}`}>
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>{t("payNow")}</span>
                  </Link>
                </Button>
              ) : isPaid ? (
                <div className="flex items-center gap-1 rounded-full bg-success/20 text-success border border-success/40 px-2.5 py-1 text-[11px] font-bold shadow-sm shrink-0">
                  <CheckCircle2 className="h-3 w-3" />
                  {lang === "bn" ? "পরিশোধিত" : "Paid"}
                </div>
              ) : null}
            </div>

            {/* Stats strip */}
            {totalBilledScoped > 0 && (
              <div className="relative mt-3 sm:mt-4 grid grid-cols-3 divide-x divide-border/60 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50 overflow-hidden shadow-sm">
                {[
                  { label: lang === "bn" ? "বিল" : "Billed", value: totalBilledScoped, tone: "text-foreground", dot: "bg-muted-foreground/50" },
                  { label: lang === "bn" ? "পরিশোধিত" : "Paid", value: totalPaidScoped, tone: "text-success", dot: "bg-success" },
                  { label: lang === "bn" ? "বকেয়া" : "Due", value: totalDueScoped, tone: totalDueScoped > 0 ? "text-destructive" : "text-success", dot: totalDueScoped > 0 ? "bg-destructive" : "bg-success" },
                ].map((s, i) => (
                  <div
                    key={s.label}
                    className="px-2 py-1.5 sm:px-2.5 sm:py-2 min-w-0 animate-slide-up-fade"
                    style={{ animationDelay: `${200 + i * 80}ms` }}
                  >
                    <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.dot)} />
                      <span className="truncate">{s.label}</span>
                    </div>
                    <div className={cn("mt-0.5 text-xs sm:text-sm font-extrabold tabular-nums truncate", s.tone)}>
                      <AnimatedNumber value={s.value} format={(n) => formatMoney(n, lang)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Daily Hadith — random per visit */}
        <HadithCard />

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
              {scopeFlats.map((f) => {
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

        {/* Rented-out flats (owner sees tenant-occupied flats and their dues) */}
        {rentedOutFlats.length > 0 && (
          <div className="rounded-2xl bg-card border border-border p-4 shadow-soft">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                <Home className="h-4 w-4 text-accent-foreground" />
                {lang === "bn" ? "ভাড়া দেওয়া ফ্ল্যাট" : "Rented Out Flats"}
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground">
                  {formatNumber(rentedOutFlats.length, lang)}
                </span>
              </h2>
              {totalRentedDue > 0 && (
                <span className="text-[11px] font-semibold text-destructive">
                  {lang === "bn" ? "মোট বকেয়া" : "Total due"}: {formatMoney(totalRentedDue, lang)}
                </span>
              )}
            </div>
            <div className="grid gap-2 grid-cols-2 lg:grid-cols-3">
              {rentedOutFlats.map((f) => {
                const b = allBills[f.id];
                const fTotal = b ? Number(b.total) : 0;
                const fPaid = b ? Number(b.paid_amount) : 0;
                const fDue = Math.max(0, fTotal - fPaid);
                const isActive = f.id === flat.id;
                const tenantLabel = (lang === "bn" ? f.occupant_name_bn : f.occupant_name) || f.occupant_name || (lang === "bn" ? "ভাড়াটিয়া" : "Tenant");
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFlatId(f.id)}
                    className={cn(
                      "text-left rounded-xl border p-3 transition-all hover:-translate-y-0.5 hover:shadow-elegant",
                      isActive ? "border-accent-foreground/60 bg-accent/10 ring-2 ring-accent-foreground/30" : "border-border bg-background"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-sm text-foreground">{f.flat_no}</div>
                      <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-accent/20 text-accent-foreground">
                        {lang === "bn" ? "ভাড়া" : "Rent"}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate mb-1">{tenantLabel}</div>
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
          <Link to="/owner-info" className="group rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-accent/10 p-4 shadow-soft flex items-center justify-between gap-3 hover:shadow-elegant hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <UserSquare2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground text-sm">{lang === "bn" ? "মালিকের তথ্য আপডেট" : "Update Owner Info"}</div>
                <div className="text-[11px] text-muted-foreground">{lang === "bn" ? "ব্যক্তিগত ও পারিবারিক তথ্য সম্পাদনা" : "Edit personal & family details"}</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-primary group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <MonthlyFinanceSummary month={month} variant="owner" />
      </div>
    </AppShell>
  );
}

