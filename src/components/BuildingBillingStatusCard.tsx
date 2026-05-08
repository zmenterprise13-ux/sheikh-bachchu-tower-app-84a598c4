import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangContext";
import { formatMoney } from "@/i18n/translations";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, CheckCircle2, Clock, AlertCircle, ArrowRight, Building } from "lucide-react";

type Bill = { total: number; paid_amount: number; status: string };

export function BuildingBillingStatusCard() {
  const { lang } = useLang();
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [allDue, setAllDue] = useState(0);
  const month = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [m, all] = await Promise.all([
        supabase.from("bills").select("total, paid_amount, status").eq("month", month),
        supabase.from("bills").select("total, paid_amount"),
      ]);
      setBills((m.data ?? []) as Bill[]);
      const due = (all.data ?? []).reduce(
        (s: number, r: any) => s + Math.max(0, Number(r.total || 0) - Number(r.paid_amount || 0)),
        0
      );
      setAllDue(due);
      setLoading(false);
    })();
  }, [month]);

  const total = bills.length;
  const paid = bills.filter((b) => b.status === "paid").length;
  const partial = bills.filter((b) => b.status === "partial").length;
  const unpaid = bills.filter((b) => b.status !== "paid" && b.status !== "partial").length;
  const billed = bills.reduce((s, b) => s + Number(b.total || 0), 0);
  const collected = bills.reduce((s, b) => s + Number(b.paid_amount || 0), 0);
  const monthDue = Math.max(0, billed - collected);
  const pct = billed > 0 ? Math.round((collected / billed) * 100) : 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-foreground">
            {lang === "bn" ? "বিল্ডিং বিলিং স্ট্যাটাস" : "Building Billing Status"}
          </h2>
          <span className="text-[11px] text-muted-foreground">({month})</span>
        </div>
        <Link to="/admin/dues" className="text-xs text-primary hover:underline">
          {lang === "bn" ? "বকেয়া" : "Dues"}
        </Link>
      </div>

      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <Stat icon={Receipt} tone="muted" label={lang === "bn" ? "মোট বিল" : "Bills"} value={total} />
            <Stat icon={CheckCircle2} tone="success" label={lang === "bn" ? "পরিশোধিত" : "Paid"} value={paid} />
            <Stat icon={Clock} tone="warning" label={lang === "bn" ? "আংশিক" : "Partial"} value={partial} />
            <Stat icon={AlertCircle} tone="destructive" label={lang === "bn" ? "অপরিশোধিত" : "Unpaid"} value={unpaid} />
          </div>

          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {lang === "bn" ? "এ মাসের আদায়" : "Collection this month"}
            </span>
            <span className="font-medium text-foreground">
              {formatMoney(collected, lang)} / {formatMoney(billed, lang)} · {pct}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-success transition-all" style={{ width: `${pct}%` }} />
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="text-[11px] text-muted-foreground">
                {lang === "bn" ? "এ মাসের বকেয়া" : "This month due"}
              </div>
              <div className="text-base font-bold text-warning">{formatMoney(monthDue, lang)}</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="text-[11px] text-muted-foreground">
                {lang === "bn" ? "মোট বকেয়া" : "Total outstanding"}
              </div>
              <div className="text-base font-bold text-destructive">{formatMoney(allDue, lang)}</div>
            </div>
          </div>

          <Link
            to="/admin/dues"
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:gap-2 transition-all"
          >
            {lang === "bn" ? "বকেয়া ব্যবস্থাপনা" : "Manage dues"} <ArrowRight className="h-3 w-3" />
          </Link>
        </>
      )}
    </div>
  );
}

function Stat({ icon: Icon, tone, label, value }: { icon: any; tone: string; label: string; value: number }) {
  const bg = { success: "bg-success/10", warning: "bg-warning/10", destructive: "bg-destructive/10", muted: "bg-muted" }[tone] || "bg-muted";
  const tx = { success: "text-success", warning: "text-warning", destructive: "text-destructive", muted: "text-muted-foreground" }[tone] || "text-muted-foreground";
  return (
    <div className="rounded-xl border border-border p-2.5">
      <div className="flex items-center gap-1.5">
        <div className={`flex h-6 w-6 items-center justify-center rounded-md ${bg}`}>
          <Icon className={`h-3.5 w-3.5 ${tx}`} />
        </div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      </div>
      <div className="mt-1 text-lg font-bold text-foreground">{value}</div>
    </div>
  );
}
