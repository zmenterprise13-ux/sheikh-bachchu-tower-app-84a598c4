import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase, Building, Store, Car, Megaphone, FileBarChart, HandCoins,
  ArrowRight, Users, AlertTriangle, Home, UserCheck, Percent, Wallet,
  CalendarClock, Bell, Receipt,
} from "lucide-react";
import { BuildingBillingStatusCard } from "@/components/BuildingBillingStatusCard";

type Stats = {
  flats: number;
  occupied: number;
  vacant: number;
  shops: number;
  shopsOccupied: number;
  parking: number;
  parkingOccupied: number;
  recentNotices: number;
  activeLoans: number;
  outstandingLoan: number;
  owners: number;
};

type Notice = { id: string; title: string; title_bn?: string | null; date: string };

export default function ManagerDashboard() {
  const { lang } = useLang();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().slice(0, 10);
    const [flatsRes, shopsRes, parkingRes, noticesRes, loansRes, repaysRes, ownersRes, recentNoticesRes] = await Promise.all([
      supabase.from("flats").select("id, is_occupied, owner_user_id"),
      supabase.from("shops").select("id, is_occupied"),
      supabase.from("parking_slots").select("id, is_occupied"),
      supabase.from("notices").select("id").gte("date", weekAgoStr),
      supabase.from("loans").select("id, principal, status").eq("status", "active"),
      supabase.from("loan_repayments").select("amount, loan_id"),
      supabase.from("flats").select("owner_user_id").not("owner_user_id", "is", null),
      supabase.from("notices").select("id, title, title_bn, date").order("date", { ascending: false }).limit(4),
    ]);

    const flats = flatsRes.data ?? [];
    const shops = shopsRes.data ?? [];
    const parking = parkingRes.data ?? [];
    const loans = loansRes.data ?? [];
    const repays = repaysRes.data ?? [];
    const repayByLoan = new Map<string, number>();
    repays.forEach((r: any) => repayByLoan.set(r.loan_id, (repayByLoan.get(r.loan_id) ?? 0) + Number(r.amount || 0)));
    const outstanding = loans.reduce((s: number, l: any) => s + Math.max(0, Number(l.principal || 0) - (repayByLoan.get(l.id) ?? 0)), 0);
    const uniqueOwners = new Set((ownersRes.data ?? []).map((o: any) => o.owner_user_id)).size;

    setStats({
      flats: flats.length,
      occupied: flats.filter((f: any) => f.is_occupied).length,
      vacant: flats.filter((f: any) => !f.is_occupied).length,
      shops: shops.length,
      shopsOccupied: shops.filter((s: any) => s.is_occupied).length,
      parking: parking.length,
      parkingOccupied: parking.filter((p: any) => p.is_occupied).length,
      recentNotices: noticesRes.data?.length ?? 0,
      activeLoans: loans.length,
      outstandingLoan: outstanding,
      owners: uniqueOwners,
    });
    setNotices((recentNoticesRes.data ?? []) as Notice[]);
    setLoading(false);
  };

  const occupancyPct = stats && stats.flats > 0 ? Math.round((stats.occupied / stats.flats) * 100) : 0;
  const fmtBDT = (n: number) => `৳ ${Math.round(n).toLocaleString(lang === "bn" ? "bn-BD" : "en-US")}`;

  const cards = [
    { to: "/admin/dues", icon: Receipt, title: lang === "bn" ? "বকেয়া ও বিল" : "Dues & Bills", desc: lang === "bn" ? "মাসিক বিল ও বকেয়া আদায়" : "Monthly bills & dues collection" },
    { to: "/admin/flats", icon: Building, title: lang === "bn" ? "ফ্ল্যাট সমূহ" : "Flats", desc: lang === "bn" ? "ফ্ল্যাট ও মালিক ব্যবস্থাপনা" : "Manage flats and owners" },
    { to: "/admin/flats/owners", icon: Users, title: lang === "bn" ? "মালিক তালিকা" : "Owners List", desc: lang === "bn" ? "সব মালিকের যোগাযোগ" : "Owners directory" },
    { to: "/admin/shops", icon: Store, title: lang === "bn" ? "দোকান" : "Shops", desc: lang === "bn" ? "দোকান ও ভাড়াটিয়া" : "Shops and tenants" },
    { to: "/admin/parking", icon: Car, title: lang === "bn" ? "পার্কিং" : "Parking", desc: lang === "bn" ? "পার্কিং স্লট বরাদ্দ" : "Parking slots" },
    { to: "/admin/notices", icon: Megaphone, title: lang === "bn" ? "নোটিশ" : "Notices", desc: lang === "bn" ? "নতুন নোটিশ পাঠান" : "Publish announcements" },
    { to: "/admin/loans", icon: HandCoins, title: lang === "bn" ? "লোন" : "Loans", desc: lang === "bn" ? "ঋণ ও কিস্তি" : "Loans and repayments" },
    { to: "/admin/reports", icon: FileBarChart, title: lang === "bn" ? "মাসিক রিপোর্ট" : "Monthly Reports", desc: lang === "bn" ? "মাসিক আয়-ব্যয় সারসংক্ষেপ" : "Monthly finance summary" },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-accent" />
            {lang === "bn" ? "ম্যানেজার ড্যাশবোর্ড" : "Manager Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "bn"
              ? `স্বাগতম${user?.email ? `, ${user.email}` : ""} — বিল্ডিং পরিচালনার সব টুল এক জায়গায়।`
              : `Welcome${user?.email ? `, ${user.email}` : ""} — building operations at a glance.`}
          </p>
        </div>

        {/* Top KPI grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI loading={loading} icon={Building} label={lang === "bn" ? "মোট ফ্ল্যাট" : "Total flats"} value={stats?.flats ?? 0} sub={stats ? `${stats.occupied} ${lang === "bn" ? "ভাড়া দেয়া" : "occupied"} · ${stats.vacant} ${lang === "bn" ? "খালি" : "vacant"}` : ""} />
          <KPI loading={loading} icon={Percent} label={lang === "bn" ? "অকুপেন্সি" : "Occupancy"} value={`${occupancyPct}%`} sub={stats ? `${stats.occupied}/${stats.flats}` : ""} />
          <KPI loading={loading} icon={UserCheck} label={lang === "bn" ? "মালিক" : "Owners"} value={stats?.owners ?? 0} sub={lang === "bn" ? "নিবন্ধিত" : "registered"} />
          <KPI loading={loading} icon={Bell} label={lang === "bn" ? "সাম্প্রতিক নোটিশ" : "Recent notices"} value={stats?.recentNotices ?? 0} sub={lang === "bn" ? "শেষ ৭ দিন" : "last 7 days"} />
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI loading={loading} icon={Store} label={lang === "bn" ? "দোকান" : "Shops"} value={stats?.shops ?? 0} sub={stats ? `${stats.shopsOccupied} ${lang === "bn" ? "ভাড়া দেয়া" : "occupied"}` : ""} />
          <KPI loading={loading} icon={Car} label={lang === "bn" ? "পার্কিং" : "Parking"} value={stats?.parking ?? 0} sub={stats ? `${stats.parkingOccupied} ${lang === "bn" ? "বরাদ্দ" : "allocated"}` : ""} />
          <KPI loading={loading} icon={AlertTriangle} label={lang === "bn" ? "সক্রিয় লোন" : "Active loans"} value={stats?.activeLoans ?? 0} />
          <KPI loading={loading} icon={Wallet} label={lang === "bn" ? "বকেয়া লোন" : "Loan outstanding"} value={stats ? fmtBDT(stats.outstandingLoan) : "—"} />
        </div>

        <BuildingBillingStatusCard />

        {/* Two-column: Occupancy panel + Recent notices */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-accent" />
                <h2 className="font-semibold text-foreground">{lang === "bn" ? "অকুপেন্সি ওভারভিউ" : "Occupancy overview"}</h2>
              </div>
              <Link to="/admin/flats" className="text-xs text-primary hover:underline">{lang === "bn" ? "বিস্তারিত" : "Details"}</Link>
            </div>
            <Bar label={lang === "bn" ? "ফ্ল্যাট" : "Flats"} value={stats?.occupied ?? 0} total={stats?.flats ?? 0} loading={loading} />
            <Bar label={lang === "bn" ? "দোকান" : "Shops"} value={stats?.shopsOccupied ?? 0} total={stats?.shops ?? 0} loading={loading} />
            <Bar label={lang === "bn" ? "পার্কিং" : "Parking"} value={stats?.parkingOccupied ?? 0} total={stats?.parking ?? 0} loading={loading} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-accent" />
                <h2 className="font-semibold text-foreground">{lang === "bn" ? "সাম্প্রতিক নোটিশ" : "Recent notices"}</h2>
              </div>
              <Link to="/admin/notices" className="text-xs text-primary hover:underline">{lang === "bn" ? "সব" : "All"}</Link>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : notices.length === 0 ? (
              <p className="text-xs text-muted-foreground">{lang === "bn" ? "কোন নোটিশ নেই" : "No notices yet"}</p>
            ) : (
              <ul className="space-y-2">
                {notices.map((n) => (
                  <li key={n.id} className="flex items-start gap-2 text-sm border-b border-border last:border-0 pb-2 last:pb-0">
                    <Megaphone className="h-3.5 w-3.5 text-muted-foreground mt-1 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground truncate">{lang === "bn" ? (n.title_bn || n.title) : n.title}</div>
                      <div className="text-[11px] text-muted-foreground">{new Date(n.date).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US")}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {lang === "bn" ? "দ্রুত অ্যাকশন" : "Quick actions"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((c) => (
              <Link
                key={c.to}
                to={c.to}
                className="group rounded-2xl border border-border bg-card p-5 shadow-soft hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 mb-3">
                  <c.icon className="h-5 w-5 text-accent" />
                </div>
                <div className="font-semibold text-foreground">{c.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{c.desc}</div>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
                  {lang === "bn" ? "খুলুন" : "Open"} <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function KPI({ icon: Icon, label, value, sub, loading }: { icon: any; label: string; value: any; sub?: string; loading?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
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

function Bar({ label, value, total, loading }: { label: string; value: number; total: number; loading?: boolean }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{loading ? "…" : `${value}/${total} · ${pct}%`}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
