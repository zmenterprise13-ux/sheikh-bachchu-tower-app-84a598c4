import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { DemoBanner } from "@/components/DemoBanner";
import { useLang } from "@/i18n/LangContext";
import { formatMoney, formatNumber } from "@/i18n/translations";
import { BILLS, EXPENSES, FLATS, NOTICES, CURRENT_MONTH } from "@/data/mockData";
import { Building, Wallet, TrendingUp, AlertCircle, BadgeCheck, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";

export default function AdminDashboard() {
  const { t, lang } = useLang();

  const totalBilled = BILLS.reduce((s, b) => s + b.total, 0);
  const collected = BILLS.reduce((s, b) => s + b.paidAmount, 0);
  const pending = totalBilled - collected;
  const monthlyExpense = EXPENSES.reduce((s, e) => s + e.amount, 0);
  const occupied = FLATS.filter(f => f.isOccupied).length;
  const collectionRate = Math.round((collected / totalBilled) * 100);
  const netBalance = collected - monthlyExpense;

  const recentUnpaid = BILLS.filter(b => b.status !== "paid").slice(0, 6);

  const monthLabel = new Date(CURRENT_MONTH + "-01").toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", {
    year: "numeric", month: "long",
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <DemoBanner />

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("dashboard")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{monthLabel}</p>
          </div>
          <Button
            className="gradient-primary text-primary-foreground gap-2 shadow-elegant"
            onClick={() => toast.success(lang === "bn" ? "এ মাসের সব ফ্ল্যাটের বিল জেনারেট হয়েছে (ডেমো)" : "Bills generated for all flats (demo)")}
          >
            <BadgeCheck className="h-4 w-4" />
            {t("generateBills")}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t("totalFlats")} value={`${formatNumber(FLATS.length, lang)} / ${formatNumber(occupied, lang)}`} hint={t("occupied")} icon={Building} />
          <StatCard label={t("collected")} value={formatMoney(collected, lang)} hint={`${formatNumber(collectionRate, lang)}% ${t("collectionRate")}`} icon={TrendingUp} variant="success" />
          <StatCard label={t("pending")} value={formatMoney(pending, lang)} hint={`${formatNumber(BILLS.filter(b=>b.status!=="paid").length, lang)} ${t("flats").toLowerCase()}`} icon={AlertCircle} variant="warning" />
          <StatCard label={t("monthlyExpense")} value={formatMoney(monthlyExpense, lang)} hint={`${t("netBalance")}: ${formatMoney(netBalance, lang)}`} icon={Wallet} variant="primary" />
        </div>

        {/* Two column section */}
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
              {recentUnpaid.map(bill => {
                const flat = FLATS.find(f => f.id === bill.flatId)!;
                const due = bill.total - bill.paidAmount;
                return (
                  <div key={bill.id} className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition-base">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary font-bold text-sm shrink-0">
                      {flat.flatNo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {lang === "bn" ? flat.ownerNameBn : flat.ownerName}
                      </div>
                      <div className="text-xs text-muted-foreground">{flat.phone}</div>
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
              {NOTICES.map(n => (
                <div key={n.id} className="p-4">
                  <div className="flex items-start gap-2">
                    {n.important && <span className="mt-1 h-2 w-2 rounded-full bg-destructive shrink-0" />}
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-foreground">
                        {lang === "bn" ? n.titleBn : n.title}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {lang === "bn" ? n.bodyBn : n.body}
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
