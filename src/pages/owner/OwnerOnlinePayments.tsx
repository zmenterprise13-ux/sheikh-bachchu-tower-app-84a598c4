import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney, formatNumber } from "@/i18n/translations";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerFlats } from "@/hooks/useOwnerFlat";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Clock, XCircle, CreditCard, Building2, ArrowLeft } from "lucide-react";

type PR = {
  id: string;
  flat_id: string;
  bill_id: string;
  amount: number;
  method: string;
  reference: string | null;
  note: string | null;
  status: string;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  gateway_tran_id: string | null;
  gateway_val_id: string | null;
  bills?: { month: string } | null;
};

type StatusFilter = "all" | "approved" | "pending" | "rejected";

export default function OwnerOnlinePayments() {
  const { lang } = useLang();
  const { flats, loading: flatsLoading } = useOwnerFlats();
  const [rows, setRows] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [flatId, setFlatId] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  useEffect(() => {
    if (flats.length === 0) {
      setRows([]);
      setLoading(flatsLoading);
      return;
    }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("payment_requests")
        .select("id, flat_id, bill_id, amount, method, reference, note, status, review_note, reviewed_at, created_at, gateway_tran_id, gateway_val_id, bills(month)")
        .in("flat_id", flats.map((f) => f.id))
        .eq("method", "sslcommerz")
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      setRows((data ?? []) as PR[]);
      setLoading(false);
    })();
  }, [flats, flatsLoading]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (flatId !== "all" && r.flat_id !== flatId) return false;
      if (status !== "all" && r.status !== status) return false;
      return true;
    });
  }, [rows, flatId, status]);

  const totals = useMemo(() => {
    let approved = 0, pending = 0, count = 0;
    for (const r of filtered) {
      count++;
      if (r.status === "approved") approved += Number(r.amount);
      else if (r.status === "pending") pending += Number(r.amount);
    }
    return { approved, pending, count };
  }, [filtered]);

  const flatOf = (id: string) => flats.find((f) => f.id === id);

  const statusIcon = (s: string) =>
    s === "approved" ? <CheckCircle2 className="h-4 w-4 text-success" />
    : s === "rejected" ? <XCircle className="h-4 w-4 text-destructive" />
    : <Clock className="h-4 w-4 text-warning" />;

  const statusLabel = (s: string) =>
    lang === "bn"
      ? (s === "approved" ? "সফল" : s === "rejected" ? "ব্যর্থ" : "অপেক্ষমান")
      : (s === "approved" ? "Successful" : s === "rejected" ? "Failed" : "Pending");

  const fmtDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(lang === "bn" ? "bn-BD" : "en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Link to="/owner">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground">
              {lang === "bn" ? "অনলাইন পেমেন্ট ইতিহাস" : "Online Payment History"}
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {lang === "bn"
                ? "SSLCommerz দিয়ে করা সব পেমেন্ট"
                : "All payments made via SSLCommerz"}
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-card border border-border p-3 shadow-soft">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {lang === "bn" ? "সফল" : "Successful"}
            </div>
            <div className="font-bold text-foreground tabular-nums text-sm mt-1">
              {formatMoney(totals.approved, lang)}
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-border p-3 shadow-soft">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {lang === "bn" ? "অপেক্ষমান" : "Pending"}
            </div>
            <div className="font-bold text-warning tabular-nums text-sm mt-1">
              {formatMoney(totals.pending, lang)}
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-border p-3 shadow-soft">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {lang === "bn" ? "মোট লেনদেন" : "Total tx"}
            </div>
            <div className="font-bold text-foreground tabular-nums text-sm mt-1">
              {formatNumber(totals.count, lang)}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {flats.length > 1 && (
            <Select value={flatId} onValueChange={setFlatId}>
              <SelectTrigger className="w-44 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{lang === "bn" ? "সব ফ্ল্যাট" : "All flats"}</SelectItem>
                {flats.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {lang === "bn" ? "ফ্ল্যাট" : "Flat"} {f.flat_no}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={status} onValueChange={(v: StatusFilter) => setStatus(v)}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{lang === "bn" ? "সব স্ট্যাটাস" : "All statuses"}</SelectItem>
              <SelectItem value="approved">{statusLabel("approved")}</SelectItem>
              <SelectItem value="pending">{statusLabel("pending")}</SelectItem>
              <SelectItem value="rejected">{statusLabel("rejected")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-10 text-center text-muted-foreground">
            <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <div className="text-sm">
              {lang === "bn" ? "কোনো অনলাইন পেমেন্ট পাওয়া যায়নি।" : "No online payments yet."}
            </div>
            <Link to="/owner/dues" className="inline-block mt-3">
              <Button size="sm" variant="outline">
                {lang === "bn" ? "বকেয়া দেখুন" : "View dues"}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const flat = flatOf(r.flat_id);
              return (
                <div
                  key={r.id}
                  className="rounded-2xl bg-card border border-border p-4 shadow-soft flex items-start gap-3"
                >
                  <div className="h-10 w-10 rounded-xl bg-muted grid place-items-center shrink-0">
                    {statusIcon(r.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">
                        {r.bills?.month ?? "—"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        {lang === "bn" ? "ফ্ল্যাট" : "Flat"} {flat?.flat_no ?? "?"}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                          r.status === "approved"
                            ? "bg-success/15 text-success"
                            : r.status === "rejected"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-warning/15 text-warning"
                        }`}
                      >
                        {statusLabel(r.status)}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {fmtDateTime(r.created_at)}
                    </div>
                    {r.gateway_tran_id && (
                      <div className="text-[10px] font-mono text-muted-foreground/80 mt-0.5 break-all">
                        Trx: {r.gateway_tran_id}
                      </div>
                    )}
                    {r.review_note && r.status !== "approved" && (
                      <div className="text-[11px] text-muted-foreground mt-1 italic">
                        {r.review_note}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-foreground tabular-nums text-sm">
                      {formatMoney(Number(r.amount), lang)}
                    </div>
                    {r.status === "approved" && r.reviewed_at && (
                      <div className="text-[10px] text-success mt-0.5">
                        ✓ {fmtDateTime(r.reviewed_at)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
