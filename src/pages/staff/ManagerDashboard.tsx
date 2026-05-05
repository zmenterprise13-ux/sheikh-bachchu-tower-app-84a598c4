import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase, Building, Store, Car, Megaphone, FileBarChart, HandCoins,
  ArrowRight, Users, AlertTriangle,
} from "lucide-react";

type Stats = {
  flats: number;
  occupied: number;
  shops: number;
  parking: number;
  recentNotices: number;
  activeLoans: number;
};

export default function ManagerDashboard() {
  const { lang } = useLang();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const [flats, shops, parking, notices, loans] = await Promise.all([
      supabase.from("flats").select("id, is_occupied"),
      supabase.from("shops").select("id"),
      supabase.from("parking_slots").select("id"),
      supabase.from("notices").select("id").gte("date", weekAgo.toISOString().slice(0, 10)),
      supabase.from("loans").select("id").eq("status", "active"),
    ]);
    setStats({
      flats: flats.data?.length ?? 0,
      occupied: (flats.data ?? []).filter((f: any) => f.is_occupied).length,
      shops: shops.data?.length ?? 0,
      parking: parking.data?.length ?? 0,
      recentNotices: notices.data?.length ?? 0,
      activeLoans: loans.data?.length ?? 0,
    });
    setLoading(false);
  };

  const cards = [
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI loading={loading} icon={Building} label={lang === "bn" ? "মোট ফ্ল্যাট" : "Total flats"} value={stats?.flats ?? 0} sub={stats ? `${stats.occupied} ${lang === "bn" ? "ভাড়া দেয়া" : "occupied"}` : ""} />
          <KPI loading={loading} icon={Store} label={lang === "bn" ? "দোকান" : "Shops"} value={stats?.shops ?? 0} />
          <KPI loading={loading} icon={Car} label={lang === "bn" ? "পার্কিং" : "Parking slots"} value={stats?.parking ?? 0} />
          <KPI loading={loading} icon={AlertTriangle} label={lang === "bn" ? "সক্রিয় লোন" : "Active loans"} value={stats?.activeLoans ?? 0} />
        </div>

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
