import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { BILLS, DEMO_OWNER_FLAT_ID } from "@/data/mockData";
import { formatMoney } from "@/i18n/translations";
import { CheckCircle2 } from "lucide-react";

export default function OwnerPayments() {
  const { t, lang } = useLang();
  const paid = BILLS.filter(b => b.flatId === DEMO_OWNER_FLAT_ID && b.status === "paid");

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("myPayments")}</h1>
        <div className="rounded-2xl bg-card border border-border shadow-soft divide-y divide-border">
          {paid.length === 0 && <div className="p-12 text-center text-muted-foreground">{t("noData")}</div>}
          {paid.map(b => (
            <div key={b.id} className="p-5 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 text-success shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground">{b.month}</div>
                <div className="text-xs text-muted-foreground">{lang === "bn" ? "পরিশোধিত" : "Paid on"} {b.paidAt}</div>
              </div>
              <div className="font-bold text-success">{formatMoney(b.paidAmount, lang)}</div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
