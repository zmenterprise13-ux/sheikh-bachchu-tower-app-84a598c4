import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney } from "@/i18n/translations";
import { CheckCircle2, Clock, XCircle, Download, ReceiptText, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerFlat } from "@/hooks/useOwnerFlat";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBkashSettings } from "@/hooks/useBkashSettings";
import { downloadReceiptPdf } from "@/lib/receiptPdf";
import { formatReceiptNo } from "@/lib/receiptNumber";

type PR = {
  id: string;
  receipt_seq: number | null;
  bill_id: string;
  amount: number;
  method: string;
  reference: string | null;
  note: string | null;
  status: string;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  bills?: { month: string } | null;
};

export default function OwnerReceipts() {
  const { lang } = useLang();
  const { flat, loading: flatLoading } = useOwnerFlat();
  const { settings: bkash } = useBkashSettings();
  const [requests, setRequests] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  useEffect(() => {
    if (!flat) { setLoading(flatLoading); return; }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("payment_requests")
        .select("id, receipt_seq, bill_id, amount, method, reference, note, status, review_note, reviewed_at, created_at, bills(month)")
        .eq("flat_id", flat.id)
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      setRequests((data ?? []) as unknown as PR[]);
      setLoading(false);
    })();
  }, [flat, flatLoading]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return requests.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!s) return true;
      return (
        (r.bills?.month ?? "").toLowerCase().includes(s) ||
        (r.reference ?? "").toLowerCase().includes(s) ||
        r.method.toLowerCase().includes(s) ||
        r.id.toLowerCase().includes(s)
      );
    });
  }, [requests, q, status]);

  // Latest approved receipt for quick re-download
  const latestApproved = useMemo(
    () => requests.find((r) => r.status === "approved") ?? null,
    [requests],
  );

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; cls: string; icon: JSX.Element }> = {
      approved: { label: lang === "bn" ? "অনুমোদিত" : "Approved", cls: "bg-success/10 text-success border-success/30", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
      pending: { label: lang === "bn" ? "অপেক্ষমাণ" : "Pending", cls: "bg-warning/10 text-warning border-warning/30", icon: <Clock className="h-3.5 w-3.5" /> },
      rejected: { label: lang === "bn" ? "প্রত্যাখ্যাত" : "Rejected", cls: "bg-destructive/10 text-destructive border-destructive/30", icon: <XCircle className="h-3.5 w-3.5" /> },
    };
    const m = map[s] ?? map.pending;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${m.cls}`}>
        {m.icon}{m.label}
      </span>
    );
  };

  const dl = (pr: PR) =>
    downloadReceiptPdf(
      pr,
      flat ? { flat_no: flat.flat_no, owner_name: flat.owner_name } : null,
      { number: bkash.number, fee_pct: bkash.fee_pct },
    );

  if (flatLoading) return <AppShell><Skeleton className="h-40 rounded-2xl" /></AppShell>;

  if (!flat) {
    return (
      <AppShell>
        <div className="rounded-2xl bg-card border border-border p-12 text-center text-muted-foreground">
          {lang === "bn" ? "আপনার অ্যাকাউন্টের সাথে কোনো ফ্ল্যাট যুক্ত নেই।" : "No flat linked to your account."}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <ReceiptText className="h-6 w-6 text-primary" />
              {lang === "bn" ? "রিসিপট ইতিহাস" : "Receipts History"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {lang === "bn" ? "সকল পেমেন্ট রিসিপট দেখুন ও পুনরায় ডাউনলোড করুন" : "View all generated receipts and re-download the PDF"}
            </p>
          </div>
          {latestApproved && (
            <Button onClick={() => dl(latestApproved)} className="gradient-primary text-primary-foreground gap-2">
              <Download className="h-4 w-4" />
              {lang === "bn" ? "সর্বশেষ রিসিপট" : "Latest Receipt"}
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={lang === "bn" ? "মাস, রেফারেন্স, পদ্ধতি..." : "Month, reference, method..."}
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{lang === "bn" ? "সকল স্ট্যাটাস" : "All statuses"}</SelectItem>
              <SelectItem value="approved">{lang === "bn" ? "অনুমোদিত" : "Approved"}</SelectItem>
              <SelectItem value="pending">{lang === "bn" ? "অপেক্ষমাণ" : "Pending"}</SelectItem>
              <SelectItem value="rejected">{lang === "bn" ? "প্রত্যাখ্যাত" : "Rejected"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-2xl bg-card border border-border shadow-soft divide-y divide-border">
          {loading && <div className="p-5 space-y-3">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-14"/>)}</div>}
          {!loading && filtered.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              {lang === "bn" ? "কোনো রিসিপট পাওয়া যায়নি।" : "No receipts found."}
            </div>
          )}
          {!loading && filtered.map((pr) => (
            <div key={pr.id} className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4 flex-wrap">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted shrink-0">
                <ReceiptText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground truncate">
                  #{pr.id.slice(0,8).toUpperCase()} · {pr.bills?.month ?? "-"} · <span className="capitalize">{pr.method}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {pr.reference && <>Ref: {pr.reference} · </>}
                  {new Date(pr.reviewed_at ?? pr.created_at).toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-foreground">{formatMoney(Number(pr.amount), lang)}</div>
                <div className="mt-1">{statusBadge(pr.status)}</div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => dl(pr)}
                disabled={pr.status !== "approved"}
                className="gap-1.5"
                title={pr.status !== "approved" ? (lang === "bn" ? "শুধু অনুমোদিত রিসিপট ডাউনলোড করা যাবে" : "Only approved receipts can be downloaded") : undefined}
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </Button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
