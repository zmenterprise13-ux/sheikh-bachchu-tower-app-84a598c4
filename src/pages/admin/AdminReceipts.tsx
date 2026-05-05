import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney } from "@/i18n/translations";
import { CheckCircle2, Clock, XCircle, Download, ReceiptText, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  flats?: { flat_no: string; owner_name: string | null; owner_name_bn: string | null } | null;
};

export default function AdminReceipts() {
  const { lang } = useLang();
  const { settings: bkash } = useBkashSettings();
  const [requests, setRequests] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("approved");
  const [flatFilter, setFlatFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("payment_requests")
        .select("id, receipt_seq, bill_id, flat_id, amount, method, reference, note, status, review_note, reviewed_at, created_at, bills(month), flats(flat_no, owner_name, owner_name_bn)")
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      setRequests((data ?? []) as unknown as PR[]);
      setLoading(false);
    })();
  }, []);

  const flatOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of requests) {
      if (r.flats) {
        const name = (lang === "bn" ? r.flats.owner_name_bn || r.flats.owner_name : r.flats.owner_name) || "-";
        map.set(r.flat_id, `${r.flats.flat_no} · ${name}`);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [requests, lang]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return requests.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (flatFilter !== "all" && r.flat_id !== flatFilter) return false;
      if (!s) return true;
      const ownerName = (lang === "bn" ? r.flats?.owner_name_bn || r.flats?.owner_name : r.flats?.owner_name) || "";
      return (
        (r.bills?.month ?? "").toLowerCase().includes(s) ||
        (r.reference ?? "").toLowerCase().includes(s) ||
        r.method.toLowerCase().includes(s) ||
        (r.flats?.flat_no ?? "").toLowerCase().includes(s) ||
        ownerName.toLowerCase().includes(s) ||
        formatReceiptNo(r.receipt_seq, r.id).toLowerCase().includes(s)
      );
    });
  }, [requests, q, status, flatFilter, lang]);

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
      pr.flats ? { flat_no: pr.flats.flat_no, owner_name: pr.flats.owner_name } : null,
      { number: bkash.number, fee_pct: bkash.fee_pct },
    );

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <ReceiptText className="h-6 w-6 text-primary" />
            {lang === "bn" ? "ফ্ল্যাট মালিকদের রিসিপট" : "Flat Owners' Receipts"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "bn"
              ? "প্রতিটি ফ্ল্যাট মালিকের জন্য জেনারেট হওয়া পেমেন্ট রিসিপট দেখুন ও PDF ডাউনলোড করুন।"
              : "View and download generated payment receipts for each flat owner."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={lang === "bn" ? "ফ্ল্যাট, মালিক, মাস, রেফ..." : "Flat, owner, month, ref..."}
              className="pl-9"
            />
          </div>
          <Select value={flatFilter} onValueChange={setFlatFilter}>
            <SelectTrigger className="sm:w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{lang === "bn" ? "সকল ফ্ল্যাট" : "All flats"}</SelectItem>
              {flatOptions.map(([id, label]) => (
                <SelectItem key={id} value={id}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          {loading && <div className="p-5 space-y-3">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-14"/>)}</div>}
          {!loading && filtered.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              {lang === "bn" ? "কোনো রিসিপট পাওয়া যায়নি।" : "No receipts found."}
            </div>
          )}
          {!loading && filtered.map((pr) => {
            const ownerName = (lang === "bn" ? pr.flats?.owner_name_bn || pr.flats?.owner_name : pr.flats?.owner_name) || "-";
            return (
              <div key={pr.id} className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4 flex-wrap">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted shrink-0">
                  <ReceiptText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground truncate">
                    {lang === "bn" ? "ফ্ল্যাট" : "Flat"} {pr.flats?.flat_no ?? "-"} · {ownerName}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {formatReceiptNo(pr.receipt_seq, pr.id)} · {pr.bills?.month ?? "-"} · <span className="capitalize">{pr.method}</span>
                    {pr.reference && <> · Ref: {pr.reference}</>}
                    {" · "}{new Date(pr.reviewed_at ?? pr.created_at).toLocaleString()}
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
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
