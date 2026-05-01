import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { BILLS, FLATS, FlatStatus } from "@/data/mockData";
import { formatMoney } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Search, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Filter = "all" | FlatStatus;

export default function AdminDues() {
  const { t, lang } = useLang();
  const [bills, setBills] = useState(BILLS);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const visible = bills.filter(b => {
    const flat = FLATS.find(f => f.id === b.flatId)!;
    if (filter !== "all" && b.status !== filter) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return flat.flatNo.toLowerCase().includes(s)
      || flat.ownerName.toLowerCase().includes(s)
      || flat.ownerNameBn.includes(q);
  });

  const markPaid = (id: string) => {
    setBills(prev => prev.map(b => b.id === id ? { ...b, status: "paid", paidAmount: b.total, paidAt: new Date().toISOString().slice(0,10) } : b));
    toast.success(lang === "bn" ? "Paid মার্ক করা হয়েছে" : "Marked as paid");
  };

  const filterChips: { key: Filter; label: string }[] = [
    { key: "all",     label: lang === "bn" ? "সব" : "All" },
    { key: "unpaid",  label: t("unpaid") },
    { key: "partial", label: t("partial") },
    { key: "paid",    label: t("paid") },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("dues")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "bn" ? "এ মাসের ফ্ল্যাট ভিত্তিক বিল" : "This month's flat-wise bills"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex flex-wrap gap-1.5">
            {filterChips.map(c => (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-base border",
                  filter === c.key
                    ? "gradient-primary text-primary-foreground border-transparent shadow-soft"
                    : "bg-card text-muted-foreground border-border hover:text-foreground"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder={lang === "bn" ? "ফ্ল্যাট/নাম..." : "Flat/name..."} className="pl-9" />
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
          {/* Header (desktop) */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 text-xs font-semibold text-muted-foreground uppercase border-b border-border bg-secondary/40">
            <div className="col-span-1">{t("flatNo")}</div>
            <div className="col-span-3">{t("ownerName")}</div>
            <div className="col-span-2 text-right">{t("serviceCharge")}</div>
            <div className="col-span-2 text-right">{t("gasBill")}+{t("parking")}</div>
            <div className="col-span-2 text-right">{t("total")}</div>
            <div className="col-span-2 text-right">{t("action")}</div>
          </div>

          <div className="divide-y divide-border">
            {visible.map(b => {
              const flat = FLATS.find(f => f.id === b.flatId)!;
              const due = b.total - b.paidAmount;
              return (
                <div key={b.id} className="grid grid-cols-2 md:grid-cols-12 gap-3 px-5 py-3 items-center hover:bg-secondary/40 transition-base">
                  <div className="md:col-span-1 font-bold text-primary">{flat.flatNo}</div>
                  <div className="md:col-span-3 min-w-0">
                    <div className="font-medium text-foreground truncate">{lang === "bn" ? flat.ownerNameBn : flat.ownerName}</div>
                    <div className="text-xs text-muted-foreground">{flat.phone}</div>
                  </div>
                  <div className="md:col-span-2 md:text-right text-sm">{formatMoney(b.serviceCharge, lang)}</div>
                  <div className="md:col-span-2 md:text-right text-sm">{formatMoney(b.gasBill + b.parking, lang)}</div>
                  <div className="md:col-span-2 md:text-right">
                    <div className="font-bold text-foreground">{formatMoney(b.total, lang)}</div>
                    {due > 0 && <div className="text-xs text-destructive">{t("due")}: {formatMoney(due, lang)}</div>}
                  </div>
                  <div className="md:col-span-2 flex items-center justify-end gap-2 col-span-2">
                    <StatusBadge status={b.status} />
                    {b.status !== "paid" && (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => markPaid(b.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t("markPaid")}</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {visible.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">{t("noData")}</div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
