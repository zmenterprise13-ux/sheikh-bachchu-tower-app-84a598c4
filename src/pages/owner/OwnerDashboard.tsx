import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney, formatNumber } from "@/i18n/translations";
import { StatCard } from "@/components/StatCard";
import { CombinedBillStatus, FlatStatus, GenerationStatus } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Receipt, Megaphone, Home, AlertTriangle, KeyRound, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerFlat } from "@/hooks/useOwnerFlat";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRef } from "react";
import { Camera } from "lucide-react";

type Bill = {
  id: string;
  month: string;
  service_charge: number;
  gas_bill: number;
  parking: number;
  total: number;
  paid_amount: number;
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

export default function OwnerDashboard() {
  const { t, lang } = useLang();
  const { flat, loading: flatLoading } = useOwnerFlat();
  const month = currentMonth();
  const [currentBill, setCurrentBill] = useState<Bill | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!flat) {
      setLoading(flatLoading);
      return;
    }
    (async () => {
      setLoading(true);
      const [billRes, noticesRes] = await Promise.all([
        supabase.from("bills")
          .select("id, month, service_charge, gas_bill, parking, total, paid_amount, status, generation_status")
          .eq("flat_id", flat.id).eq("month", month).maybeSingle(),
        supabase.from("notices")
          .select("id, title, title_bn, body, body_bn, important, date")
          .order("date", { ascending: false }).limit(3),
      ]);
      setCurrentBill((billRes.data as Bill) ?? null);
      setNotices((noticesRes.data ?? []) as Notice[]);
      setLoading(false);
    })();
  }, [flat, flatLoading, month]);

  if (flatLoading) {
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

  const due = currentBill ? Number(currentBill.total) - Number(currentBill.paid_amount) : 0;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="rounded-2xl gradient-hero text-primary-foreground p-6 sm:p-8 shadow-elevated">
          <div className="flex items-start gap-4 flex-wrap">
            <OwnerAvatarUpload
              photoUrl={flat.owner_photo_url}
              ownerName={flat.owner_name}
              flatId={flat.id}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm opacity-90">{t("welcome")},</div>
              <h1 className="text-2xl sm:text-3xl font-bold">{(lang === "bn" ? flat.owner_name_bn : flat.owner_name) || "—"}</h1>
              <div className="text-sm opacity-90 mt-1">
                {t("flatNo")}: <span className="font-bold">{flat.flat_no}</span> · {formatNumber(flat.size, lang)} sqft
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
          <StatCard label={t("due")} value={formatMoney(due, lang)} hint={t("month")} icon={Receipt} variant={due > 0 ? "warning" : "success"} />
          <StatCard label={t("serviceCharge")} value={formatMoney(Number(flat.service_charge), lang)} icon={Home} />
          <StatCard label={t("gasBill")} value={formatMoney(Number(flat.gas_bill), lang)} icon={Receipt} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-card border border-border p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">{t("dues")} — {month}</h2>
              {currentBill && <CombinedBillStatus generation={currentBill.generation_status} payment={currentBill.status} />}
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

        <ChangePasswordCard />
      </div>
    </AppShell>
  );
}

function ChangePasswordCard() {
  const { lang } = useLang();
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) {
      toast.error(
        lang === "bn"
          ? "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে"
          : "Password must be at least 6 characters",
      );
      return;
    }
    if (newPass !== confirmPass) {
      toast.error(
        lang === "bn" ? "পাসওয়ার্ড মেলেনি" : "Passwords do not match",
      );
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewPass("");
    setConfirmPass("");
    toast.success(
      lang === "bn" ? "পাসওয়ার্ড পরিবর্তন হয়েছে" : "Password changed",
    );
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-6 shadow-soft max-w-xl">
      <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4">
        <KeyRound className="h-4 w-4 text-primary" />
        {lang === "bn" ? "পাসওয়ার্ড পরিবর্তন" : "Change Password"}
      </h2>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">
            {lang === "bn" ? "নতুন পাসওয়ার্ড (৬+ অক্ষর)" : "New password (6+ chars)"}
          </Label>
          <Input
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            minLength={6}
            maxLength={72}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">
            {lang === "bn" ? "পাসওয়ার্ড নিশ্চিত করুন" : "Confirm password"}
          </Label>
          <Input
            type="password"
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            minLength={6}
            maxLength={72}
            required
          />
        </div>
        <Button type="submit" disabled={saving} className="gradient-primary text-primary-foreground">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {lang === "bn" ? "পাসওয়ার্ড পরিবর্তন করুন" : "Change Password"}
        </Button>
      </form>
    </div>
  );
}
