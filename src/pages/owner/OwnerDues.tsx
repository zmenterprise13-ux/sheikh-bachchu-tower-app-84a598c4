import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { BILLS, FLATS, DEMO_OWNER_FLAT_ID } from "@/data/mockData";
import { formatMoney } from "@/i18n/translations";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function OwnerDues() {
  const { t, lang } = useLang();
  const flat = FLATS.find(f => f.id === DEMO_OWNER_FLAT_ID)!;
  const myBills = BILLS.filter(b => b.flatId === flat.id);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("myDues")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("flatNo")}: {flat.flatNo}</p>
        </div>
        <div className="rounded-2xl bg-card border border-border shadow-soft divide-y divide-border">
          {myBills.map(b => {
            const due = b.total - b.paidAmount;
            return (
              <div key={b.id} className="p-5 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground">{b.month}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t("serviceCharge")}: {formatMoney(b.serviceCharge, lang)} · {t("gasBill")}: {formatMoney(b.gasBill, lang)}
                    {b.parking > 0 && ` · ${t("parking")}: ${formatMoney(b.parking, lang)}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-foreground">{formatMoney(b.total, lang)}</div>
                  {due > 0 && <div className="text-xs text-destructive">{t("due")}: {formatMoney(due, lang)}</div>}
                </div>
                <StatusBadge status={b.status} />
                {due > 0 && (
                  <Button size="sm" className="gradient-primary text-primary-foreground gap-1.5"
                    onClick={() => toast.info(lang === "bn" ? "অনলাইন পেমেন্ট শীঘ্রই" : "Online payment coming soon")}>
                    <CreditCard className="h-3.5 w-3.5" /> {t("payNow")}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
