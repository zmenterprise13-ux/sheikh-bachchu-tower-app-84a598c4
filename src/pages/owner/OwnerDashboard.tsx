import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney, formatNumber } from "@/i18n/translations";
import { StatCard } from "@/components/StatCard";
import { CombinedBillStatus, FlatStatus, GenerationStatus } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Receipt, Megaphone, Home, AlertTriangle, Loader2, Download, Building2, CheckCircle2 } from "lucide-react";
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
import { residentName } from "@/lib/displayName";
import { useSelectedFlatId } from "@/hooks/useSelectedFlatId";

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
type Notice = {
  id: string;
  title: string;
  title_bn: string;
  body: string;
  body_bn: string;
  important: boolean;
  date: string;
};

const currentMonth = () => new Date().toISOString().slice(0, 7);
const SELECTED_FLAT_KEY = "owner_dashboard_flat_id";

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
  const [selectedFlatId, setSelectedFlatId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(SELECTED_FLAT_KEY);
  });
  const [allBills, setAllBills] = useState<Record<string, Bill | null>>({});
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  const flat: OwnerFlat | null = useMemo(() => {
    if (flats.length === 0) return null;
    const found = flats.find(f => f.id === selectedFlatId);
    return found ?? flats[0];
  }, [flats, selectedFlatId]);

  useEffect(() => {
    if (flat) window.localStorage.setItem(SELECTED_FLAT_KEY, flat.id);
  }, [flat]);

  useEffect(() => {
    if (flats.length === 0) {
      setLoading(flatsLoading);
      return;
    }
    (async () => {
      setLoading(true);
      const flatIds = flats.map(f => f.id);
      const [billsRes, noticesRes] = await Promise.all([
        supabase.from("bills")
          .select("id, flat_id, month, service_charge, gas_bill, parking, eid_bonus, other_charge, total, paid_amount, paid_at, due_date, generated_at, status, generation_status")
          .in("flat_id", flatIds).eq("month", month),
        supabase.from("notices")
          .select("id, title, title_bn, body, body_bn, important, date")
          .order("date", { ascending: false }).limit(3),
      ]);
      const map: Record<string, Bill | null> = {};
      flatIds.forEach(id => { map[id] = null; });
      ((billsRes.data ?? []) as (Bill & { flat_id: string })[]).forEach(b => {
        map[b.flat_id] = b;
      });
      setAllBills(map);
      setNotices((noticesRes.data ?? []) as Notice[]);
      setLoading(false);
    })();
  }, [flats, flatsLoading, month]);

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

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="rounded-2xl gradient-hero text-primary-foreground p-6 sm:p-8 shadow-elevated">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="relative shrink-0 group">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-accent via-white/40 to-primary-foreground/60 opacity-70 blur-md group-hover:opacity-100 transition-opacity" />
              <Avatar className="relative h-24 w-24 sm:h-28 sm:w-28 border-4 border-white/60 shadow-2xl ring-2 ring-white/30">
                {(profileName.avatar || flat.owner_photo_url) ? (
                  <AvatarImageWithSkeleton
                    src={(profileName.avatar || flat.owner_photo_url) as string}
                    alt={
                      flat.owner_name
                        ? (lang === "bn" ? `${flat.owner_name}-এর প্রোফাইল ছবি` : `Profile photo of ${flat.owner_name}`)
                        : (lang === "bn" ? "মালিকের প্রোফাইল ছবি" : "Owner profile photo")
                    }
                    className="object-cover"
                  />
                ) : null}
                <InitialsFallback name={flat.owner_name} seed={flat.id} className="text-2xl ring-2 ring-white/30" />
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm opacity-90">{t("welcome")},</div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 flex-wrap">
                <span>{residentName(flat, lang) || profileName.bn || profileName.en || "—"}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-primary-foreground">
                  {(flat.occupant_type ?? "").toLowerCase() === "tenant" ? (lang === "bn" ? "ভাড়াটিয়া" : "Tenant") : (lang === "bn" ? "মালিক" : "Owner")}
                </span>
              </h1>
              <div className="text-sm opacity-90 mt-1 flex items-center gap-2 flex-wrap">
                <Building2 className="h-3.5 w-3.5 opacity-80" />
                {hasMultipleFlats ? (
                  <>
                    <span>{lang === "bn" ? "ফ্ল্যাট" : "Flat"}:</span>
                    <Select value={flat.id} onValueChange={(v) => setSelectedFlatId(v)}>
                      <SelectTrigger className="h-7 w-auto min-w-[110px] bg-white/15 border-white/30 text-primary-foreground hover:bg-white/25 px-2 text-xs">
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
                    <span className="text-xs opacity-80">· {flats.length} {lang === "bn" ? "ফ্ল্যাট" : "flats"}</span>
                  </>
                ) : (
                  <>
                    {t("flatNo")}: <span className="font-bold">{flat.flat_no}</span>
                  </>
                )}
                <span className="opacity-70">· {formatNumber(flat.size, lang)} sqft</span>
              </div>
            </div>
            {due > 0 && (
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow gap-2"
                onClick={() => toast.info(lang === "bn" ? "অনলাইন পেমেন্ট শীঘ্রই" : "Online payment coming soon")}
              >
                <CreditCard className="h-4 w-4" />
                {t("payNow")} · {formatMoney(due, lang)}
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label={hasMultipleFlats ? (lang === "bn" ? "মোট বকেয়া (সব ফ্ল্যাট)" : "Total Due (all flats)") : t("due")}
            value={formatMoney(hasMultipleFlats ? totalDueAcrossFlats : due, lang)}
            hint={hasMultipleFlats ? `${flats.length} ${lang === "bn" ? "ফ্ল্যাট" : "flats"}` : t("month")}
            icon={Receipt}
            variant={(hasMultipleFlats ? totalDueAcrossFlats : due) > 0 ? "warning" : "success"}
          />
          <StatCard label={t("serviceCharge")} value={formatMoney(Number(flat.service_charge), lang)} icon={Home} />
          <StatCard label={t("gasBill")} value={formatMoney(Number(flat.gas_bill), lang)} icon={Receipt} />
        </div>

        {hasMultipleFlats && (
          <div className="rounded-2xl bg-card border border-border p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                {lang === "bn" ? "আমার সব ফ্ল্যাট" : "My Flats"} — {month}
              </h2>
              <span className="text-xs text-muted-foreground">
                {lang === "bn" ? "ফ্ল্যাটে ক্লিক করে সিলেক্ট করুন" : "Click a flat to select"}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {flats.map((f) => {
                const b = allBills[f.id];
                const fDue = b ? Math.max(0, Number(b.total) - Number(b.paid_amount)) : 0;
                const isActive = f.id === flat.id;
                const hasBill = !!b;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFlatId(f.id)}
                    className={`text-left rounded-xl border p-4 transition-all hover:shadow-md ${
                      isActive
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {f.flat_no}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {lang === "bn" ? "তলা" : "Floor"} {formatNumber(f.floor, lang)}
                        </div>
                      </div>
                      {isActive && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {lang === "bn" ? "এ মাসের বকেয়া" : "This month due"}
                    </div>
                    {!hasBill ? (
                      <div className="text-sm text-muted-foreground italic">
                        {lang === "bn" ? "বিল তৈরি হয়নি" : "No bill yet"}
                      </div>
                    ) : fDue > 0 ? (
                      <div className="text-lg font-bold text-destructive">{formatMoney(fDue, lang)}</div>
                    ) : (
                      <div className="text-sm font-semibold text-success flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {lang === "bn" ? "পরিশোধিত" : "Paid"}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-card border border-border p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
              <h2 className="font-semibold text-foreground">{t("dues")} — {month}</h2>
              <div className="flex items-center gap-2">
                {currentBill && <CombinedBillStatus generation={currentBill.generation_status} payment={currentBill.status} />}
                {currentBill && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
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
                        toast.success(lang === "bn" ? "PDF ডাউনলোড শুরু হয়েছে" : "PDF download started");
                      } catch (err: any) {
                        toast.error(err.message ?? "PDF generation failed");
                      }
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {t("download")}
                  </Button>
                )}
              </div>
            </div>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
            ) : !currentBill ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                {lang === "bn" ? "এ মাসের কোনো বিল এখনো তৈরি হয়নি।" : "No bill generated for this month yet."}
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">{t("serviceCharge")}</span>
                  <span className="font-semibold">{formatMoney(Number(currentBill.service_charge), lang)}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">{t("gasBill")}</span>
                  <span className="font-semibold">{formatMoney(Number(currentBill.gas_bill), lang)}</span>
                </div>
                {Number(currentBill.parking) > 0 && (
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">{t("parking")}</span>
                    <span className="font-semibold">{formatMoney(Number(currentBill.parking), lang)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t-2 border-foreground/20">
                  <span className="font-bold">{t("total")}</span>
                  <span className="font-bold text-primary text-lg">{formatMoney(Number(currentBill.total), lang)}</span>
                </div>
                {due > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span className="font-semibold">{t("due")}</span>
                    <span className="font-bold">{formatMoney(due, lang)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-accent" /> {t("recentNotices")}
              </h2>
              <Link to="/owner/notices">
                <Button variant="ghost" size="sm">{t("viewAll")}</Button>
              </Link>
            </div>
            <div className="divide-y divide-border">
              {loading && <div className="p-5 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>}
              {!loading && notices.length === 0 && (
                <div className="p-6 text-sm text-center text-muted-foreground">{t("noData")}</div>
              )}
              {!loading && notices.map((n) => (
                <div key={n.id} className="p-4 flex items-start gap-2">
                  {n.important && <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-foreground">{lang === "bn" ? n.title_bn : n.title}</div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{lang === "bn" ? n.body_bn : n.body}</p>
                    <div className="text-[11px] text-muted-foreground mt-1">{n.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <MonthlyFinanceSummary month={month} variant="owner" />
      </div>
    </AppShell>
  );
}

