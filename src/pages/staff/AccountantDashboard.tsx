import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/i18n/translations";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet, CreditCard, ReceiptText, Receipt, BookOpen, ScanSearch,
  ArrowRight, TrendingUp, AlertCircle, CheckCircle2,
} from "lucide-react";
import { BuildingBillingStatusCard } from "@/components/BuildingBillingStatusCard";

type Stats = {
  pendingRequests: number;
  pendingAmount: number;
  approvedToday: number;
  collectedThisMonth: number;
  unpaidBills: number;
  outstanding: number;
};

export default function AccountantDashboard() {
  const { lang } = useLang();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const month = new Date().toISOString().slice(0, 7);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [pending, approvedToday, monthBills] = await Promise.all([
      supabase.from("payment_requests").select("amount, status").eq("status", "pending"),
      supabase.from("payment_requests").select("amount").eq("status", "approved").gte("reviewed_at", todayStart.toISOString()),
      supabase.from("bills").select("total, paid_amount, status").eq("month", month),
    ]);

    const allBills = await supabase.from("bills").select("total, paid_amount");

    setStats({
      pendingRequests: pending.data?.length ?? 0,
      pendingAmount: (pending.data ?? []).reduce((s, r: any) => s + Number(r.amount || 0), 0),
      approvedToday: (approvedToday.data ?? []).reduce((s, r: any) => s + Number(r.amount || 0), 0),
      collectedThisMonth: (monthBills.data ?? []).reduce((s, r: any) => s + Number(r.paid_amount || 0), 0),
      unpaidBills: (monthBills.data ?? []).filter((b: any) => b.status !== "paid").length,
      outstanding: (allBills.data ?? []).reduce((s, r: any) => s + Math.max(0, Number(r.total || 0) - Number(r.paid_amount || 0)), 0),
    });
    setLoading(false);
  };

  const cards = [
    {
      to: "/admin/payment-requests",
      icon: CreditCard,
      tone: "primary" as const,
      title: lang === "bn" ? "পেমেন্ট রিকোয়েস্ট" : "Payment Requests",
      desc: lang === "bn" ? "ওনারদের জমা রিভিউ ও অনুমোদন" : "Review & approve owner submissions",
      badge: stats ? String(stats.pendingRequests) : undefined,
      badgeLabel: lang === "bn" ? "অপেক্ষমাণ" : "Pending",
    },
    {
      to: "/admin/dues",
      icon: Receipt,
      tone: "warning" as const,
      title: lang === "bn" ? "বকেয়া ও বিল" : "Dues & Bills",
      desc: lang === "bn" ? "বকেয়া আদায় ও বিল ব্যবস্থাপনা" : "Collect dues & manage bills",
      badge: stats ? String(stats.unpaidBills) : undefined,
      badgeLabel: lang === "bn" ? "এ মাসে অপরিশোধিত" : "Unpaid this month",
    },
    {
      to: "/admin/receipts",
      icon: ReceiptText,
      tone: "success" as const,
      title: lang === "bn" ? "মালিকদের রিসিপট" : "Owner Receipts",
      desc: lang === "bn" ? "PDF রিসিপট দেখুন ও ডাউনলোড" : "View and download payment receipts",
    },
    {
      to: "/admin/ledger",
      icon: BookOpen,
      tone: "muted" as const,
      title: lang === "bn" ? "লেজার" : "Ledger",
      desc: lang === "bn" ? "ফ্ল্যাট অনুযায়ী লেনদেন" : "Per-flat transaction history",
    },
    {
      to: "/admin/reconcile",
      icon: ScanSearch,
      tone: "muted" as const,
      title: lang === "bn" ? "রিকনসাইল" : "Reconcile",
      desc: lang === "bn" ? "হিসাব মিলান" : "Match payments and balances",
    },
    {
      to: "/admin/expenses",
      icon: Wallet,
      tone: "muted" as const,
      title: lang === "bn" ? "খরচ" : "Expenses",
      desc: lang === "bn" ? "দৈনন্দিন খরচ এন্ট্রি" : "Record daily expenses",
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="h-6 w-6 text-success" />
            {lang === "bn" ? "অ্যাকাউন্ট্যান্ট ড্যাশবোর্ড" : "Accountant Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "bn"
              ? `স্বাগতম${user?.email ? `, ${user.email}` : ""} — আজকের কালেকশন ও পেমেন্ট রিভিউ এক জায়গায়।`
              : `Welcome${user?.email ? `, ${user.email}` : ""} — today's collections and reviews at a glance.`}
          </p>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI loading={loading} icon={AlertCircle} tone="warning" label={lang === "bn" ? "অপেক্ষমাণ রিকোয়েস্ট" : "Pending requests"} value={stats?.pendingRequests ?? 0} sub={stats ? formatMoney(stats.pendingAmount, lang) : ""} />
          <KPI loading={loading} icon={CheckCircle2} tone="success" label={lang === "bn" ? "আজ অনুমোদিত" : "Approved today"} value={stats ? formatMoney(stats.approvedToday, lang) : "—"} />
          <KPI loading={loading} icon={TrendingUp} tone="primary" label={lang === "bn" ? "এ মাসে আদায়" : "Collected this month"} value={stats ? formatMoney(stats.collectedThisMonth, lang) : "—"} />
          <KPI loading={loading} icon={Receipt} tone="destructive" label={lang === "bn" ? "মোট বকেয়া" : "Total outstanding"} value={stats ? formatMoney(stats.outstanding, lang) : "—"} />
        </div>

        <BuildingBillingStatusCard />

        {/* Action grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="group rounded-2xl border border-border bg-card p-5 shadow-soft hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneBg(c.tone)}`}>
                  <c.icon className={`h-5 w-5 ${toneText(c.tone)}`} />
                </div>
                {c.badge && (
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneBadge(c.tone)}`}>
                    {c.badge}
                  </span>
                )}
              </div>
              <div className="font-semibold text-foreground">{c.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{c.desc}</div>
              {c.badgeLabel && c.badge && (
                <div className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wide">{c.badgeLabel}</div>
              )}
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
                {lang === "bn" ? "খুলুন" : "Open"} <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function toneBg(t: string) {
  return {
    primary: "bg-primary/10",
    success: "bg-success/10",
    warning: "bg-warning/10",
    destructive: "bg-destructive/10",
    muted: "bg-muted",
  }[t] || "bg-muted";
}
function toneText(t: string) {
  return {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
    muted: "text-muted-foreground",
  }[t] || "text-muted-foreground";
}
function toneBadge(t: string) {
  return {
    primary: "bg-primary/10 text-primary border-primary/30",
    success: "bg-success/10 text-success border-success/30",
    warning: "bg-warning/10 text-warning border-warning/30",
    destructive: "bg-destructive/10 text-destructive border-destructive/30",
    muted: "bg-muted text-muted-foreground border-border",
  }[t] || "bg-muted text-muted-foreground border-border";
}

function KPI({ icon: Icon, tone, label, value, sub, loading }: { icon: any; tone: string; label: string; value: any; sub?: string; loading?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneBg(tone)}`}>
          <Icon className={`h-4 w-4 ${toneText(tone)}`} />
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
      <div className="mt-2 text-xl font-bold text-foreground">
        {loading ? <Skeleton className="h-6 w-20" /> : value}
      </div>
      {sub && !loading && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
