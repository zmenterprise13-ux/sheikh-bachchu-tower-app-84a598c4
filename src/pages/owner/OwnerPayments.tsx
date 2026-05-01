import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney } from "@/i18n/translations";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerFlat } from "@/hooks/useOwnerFlat";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Bill = {
  id: string;
  month: string;
  paid_amount: number;
  paid_at: string | null;
};

export default function OwnerPayments() {
  const { t, lang } = useLang();
  const { flat, loading: flatLoading } = useOwnerFlat();
  const [paid, setPaid] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!flat) {
      setPaid([]);
      setLoading(flatLoading);
      return;
    }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bills")
        .select("id, month, paid_amount, paid_at")
        .eq("flat_id", flat.id)
        .eq("status", "paid")
        .order("paid_at", { ascending: false });
      if (error) toast.error(error.message);
      setPaid((data ?? []) as Bill[]);
      setLoading(false);
    })();
  }, [flat, flatLoading]);

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("myPayments")}</h1>
        <div className="rounded-2xl bg-card border border-border shadow-soft divide-y divide-border">
          {loading && (
            <div className="p-5 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          )}
          {!loading && paid.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">{t("noData")}</div>
          )}
          {!loading && paid.map((b) => (
            <div key={b.id} className="p-5 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 text-success shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground">{b.month}</div>
                <div className="text-xs text-muted-foreground">{lang === "bn" ? "পরিশোধিত" : "Paid on"} {b.paid_at ?? "—"}</div>
              </div>
              <div className="font-bold text-success">{formatMoney(Number(b.paid_amount), lang)}</div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
