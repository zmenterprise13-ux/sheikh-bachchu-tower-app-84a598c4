import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { useLang } from "@/i18n/LangContext";
import { formatMoney, formatNumber } from "@/i18n/translations";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
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
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [notices, setNotices] = useState<Notice[]>([]);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    titleBn: "",
    body: "",
    bodyBn: "",
    important: false,
  });

  const month = currentMonth();

  const loadData = async () => {
    setLoading(true);
    const [flatsRes, billsRes, noticesRes] = await Promise.all([
      supabase.from("flats").select("id, flat_no, owner_name, owner_name_bn"),
      supabase
        .from("bills")
        .select("id, flat_id, month, service_charge, gas_bill, parking, total, paid_amount, status")
        .eq("month", month),
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
    setNotices((noticesRes.data ?? []) as Notice[]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              hint={lang === "bn" ? "এ মাসে বিল হয়েছে" : "Billed this month"}
              icon={Receipt}
              variant="primary"
            />
            <StatCard
              label={t("gasBill")}
              value={formatMoney(stats.totalGas, lang)}
              hint={lang === "bn" ? "এ মাসে বিল হয়েছে" : "Billed this month"}
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

        {/* Building-wide billing status summary */}
        <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="font-semibold text-foreground">
                {lang === "bn" ? "বিল্ডিং বিলিং স্ট্যাটাস" : "Building Billing Status"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === "bn"
                  ? "সার্ভিস চার্জ ও গ্যাস বিল — এ মাসের সারাংশ"
                  : "Service charge & gas bill summary for this month"}
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
                      <div className="mt-1"><StatusBadge status={bill.status} /></div>
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
