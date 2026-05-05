import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney } from "@/i18n/translations";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type PR = {
  id: string;
  bill_id: string;
  flat_id: string;
  amount: number;
  method: string;
  reference: string | null;
  note: string | null;
  status: string;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  bills?: { month: string } | null;
  flats?: { flat_no: string; owner_name: string | null } | null;
};

export default function AdminPaymentRequests() {
  const { t, lang } = useLang();
  const { user, role } = useAuth();
  const canReview = role === "admin" || role === "manager";
  const [rows, setRows] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending"|"all"|"approved"|"rejected">("pending");
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});

  const refresh = async () => {
    setLoading(true);
    let q = supabase.from("payment_requests")
      .select("id, bill_id, flat_id, amount, method, reference, note, status, review_note, reviewed_at, created_at, bills(month), flats(flat_no, owner_name)")
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as PR[]);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [filter]);

  // Realtime: notify admin when a new payment request arrives or status changes
  useEffect(() => {
    const channel = supabase
      .channel("admin-payment-requests")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "payment_requests" },
        async (payload) => {
          const row: any = payload.new;
          // fetch flat info for nicer toast
          const { data: f } = await supabase
            .from("flats")
            .select("flat_no, owner_name")
            .eq("id", row.flat_id)
            .maybeSingle();
          const who = f ? `${lang === "bn" ? "ফ্ল্যাট" : "Flat"} ${f.flat_no}${f.owner_name ? " · " + f.owner_name : ""}` : "";
          toast.info(
            lang === "bn" ? "নতুন পেমেন্ট রিকোয়েস্ট" : "New payment request",
            { description: `${who} — ${formatMoney(Number(row.amount), lang)}` }
          );
          refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "payment_requests" },
        () => refresh()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [filter, lang]);

  const review = async (pr: PR, status: "approved"|"rejected") => {
    const { error } = await supabase.from("payment_requests").update({
      status,
      review_note: reviewNote[pr.id] || null,
      reviewed_by: user?.id,
    }).eq("id", pr.id);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "সম্পন্ন" : "Done");
    refresh();
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("paymentRequests")}</h1>
          <div className="flex gap-2">
            {(["pending","approved","rejected","all"] as const).map(f => (
              <Button key={f} size="sm" variant={filter===f?"default":"outline"} onClick={()=>setFilter(f)}>
                {t(f as any) || f}
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border shadow-soft divide-y divide-border">
          {loading && <div className="p-5 space-y-3">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-16"/>)}</div>}
          {!loading && rows.length === 0 && <div className="p-12 text-center text-muted-foreground">{t("noData")}</div>}
          {!loading && rows.map((pr) => (
            <div key={pr.id} className="p-5 space-y-3">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted shrink-0">
                  {pr.status === "approved" ? <CheckCircle2 className="h-4 w-4 text-success"/> : pr.status === "rejected" ? <XCircle className="h-4 w-4 text-destructive"/> : <Clock className="h-4 w-4 text-warning"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground">
                    {t("flatNo")} {pr.flats?.flat_no ?? "-"} · {pr.flats?.owner_name ?? "-"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {pr.bills?.month ?? "-"} · {t(pr.method as any) || pr.method}
                    {pr.reference && <> · Ref: {pr.reference}</>}
                    · {new Date(pr.created_at).toLocaleString()}
                  </div>
                  {pr.note && <div className="text-xs italic mt-0.5">"{pr.note}"</div>}
                  {pr.review_note && <div className="text-xs text-muted-foreground italic mt-0.5">— {pr.review_note}</div>}
                </div>
                <div className="font-bold text-foreground">{formatMoney(Number(pr.amount), lang)}</div>
              </div>
              {pr.status === "pending" && (
                <div className="flex items-center gap-2 flex-wrap pl-14">
                  <Input placeholder={lang === "bn" ? "রিভিউ নোট (ঐচ্ছিক)" : "Review note (optional)"}
                    value={reviewNote[pr.id] ?? ""} onChange={(e)=>setReviewNote(s=>({...s,[pr.id]:e.target.value}))}
                    className="max-w-sm"/>
                  <Button size="sm" onClick={()=>review(pr, "approved")} className="bg-success text-success-foreground hover:bg-success/90 gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5"/> {t("approve")}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={()=>review(pr, "rejected")} className="gap-1.5">
                    <XCircle className="h-3.5 w-3.5"/> {t("reject")}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
