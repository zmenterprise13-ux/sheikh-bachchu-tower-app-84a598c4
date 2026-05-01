import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { BILLS, FLATS, NOTICES, EXPENSES, DEMO_OWNER_FLAT_ID, CURRENT_MONTH } from "@/data/mockData";
import { formatMoney, formatNumber } from "@/i18n/translations";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { CreditCard, Receipt, Megaphone, Home, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function OwnerDashboard() {
  const { t, lang } = useLang();
  const flat = FLATS.find(f => f.id === DEMO_OWNER_FLAT_ID)!;
  const myBills = BILLS.filter(b => b.flatId === flat.id);
  const currentBill = myBills.find(b => b.month === CURRENT_MONTH)!;
  const due = currentBill.total - currentBill.paidAmount;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Welcome card */}
        <div className="rounded-2xl gradient-hero text-primary-foreground p-6 sm:p-8 shadow-elevated">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur shrink-0">
              <Home className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm opacity-90">{t("welcome")},</div>
              <h1 className="text-2xl sm:text-3xl font-bold">{lang === "bn" ? flat.ownerNameBn : flat.ownerName}</h1>
              <div className="text-sm opacity-90 mt-1">
                {t("flatNo")}: <span className="font-bold">{flat.flatNo}</span> · {formatNumber(flat.size, lang)} sqft
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
          <StatCard label={t("serviceCharge")} value={formatMoney(flat.serviceCharge, lang)} icon={Home} />
          <StatCard label={t("gasBill")} value={formatMoney(flat.gasBill, lang)} icon={Receipt} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Current bill */}
          <div className="rounded-2xl bg-card border border-border p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">{t("dues")} — {CURRENT_MONTH}</h2>
              <StatusBadge status={currentBill.status} />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">{t("serviceCharge")}</span>
                <span className="font-semibold">{formatMoney(currentBill.serviceCharge, lang)}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">{t("gasBill")}</span>
                <span className="font-semibold">{formatMoney(currentBill.gasBill, lang)}</span>
              </div>
              {currentBill.parking > 0 && (
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">{t("parking")}</span>
                  <span className="font-semibold">{formatMoney(currentBill.parking, lang)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t-2 border-foreground/20">
                <span className="font-bold">{t("total")}</span>
                <span className="font-bold text-primary text-lg">{formatMoney(currentBill.total, lang)}</span>
              </div>
              {due > 0 && (
                <div className="flex justify-between text-destructive">
                  <span className="font-semibold">{t("due")}</span>
                  <span className="font-bold">{formatMoney(due, lang)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notices */}
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
              {NOTICES.slice(0, 3).map(n => (
                <div key={n.id} className="p-4 flex items-start gap-2">
                  {n.important && <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-foreground">{lang === "bn" ? n.titleBn : n.title}</div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{lang === "bn" ? n.bodyBn : n.body}</p>
                    <div className="text-[11px] text-muted-foreground mt-1">{n.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mini monthly summary */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-soft">
          <h2 className="font-semibold text-foreground mb-4">{t("monthlyReport")}</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-muted-foreground uppercase">{t("income")}</div>
              <div className="text-lg font-bold text-success mt-1">{formatMoney(BILLS.reduce((s,b)=>s+b.paidAmount,0), lang)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase">{t("expense")}</div>
              <div className="text-lg font-bold text-warning mt-1">{formatMoney(EXPENSES.reduce((s,e)=>s+e.amount,0), lang)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase">{t("balance")}</div>
              <div className="text-lg font-bold text-primary mt-1">
                {formatMoney(BILLS.reduce((s,b)=>s+b.paidAmount,0) - EXPENSES.reduce((s,e)=>s+e.amount,0), lang)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
