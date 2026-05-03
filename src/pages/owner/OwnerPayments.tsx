import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney } from "@/i18n/translations";
import { CheckCircle2, Clock, XCircle, Download, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerFlat } from "@/hooks/useOwnerFlat";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import jsPDF from "jspdf";
import { useBkashSettings } from "@/hooks/useBkashSettings";

type Bill = {
  id: string;
  month: string;
  total: number;
  paid_amount: number;
};
type PR = {
  id: string;
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

export default function OwnerPayments() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { flat, loading: flatLoading } = useOwnerFlat();
  const [bills, setBills] = useState<Bill[]>([]);
  const [requests, setRequests] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [billId, setBillId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [methodGroup, setMethodGroup] = useState<"bkash"|"others">("bkash");
  const [method, setMethod] = useState<string>("bkash");
  const { settings: bkash } = useBkashSettings();
  const BKASH_NUMBER = bkash.number;
  const BKASH_FEE_PCT = bkash.fee_pct;
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = async (fid: string) => {
    setLoading(true);
    const [b, r] = await Promise.all([
      supabase.from("bills").select("id, month, total, paid_amount").eq("flat_id", fid).order("month", { ascending: false }),
      supabase.from("payment_requests").select("id, bill_id, amount, method, reference, note, status, review_note, reviewed_at, created_at, bills(month)").eq("flat_id", fid).order("created_at", { ascending: false }),
    ]);
    if (b.error) toast.error(b.error.message);
    if (r.error) toast.error(r.error.message);
    setBills((b.data ?? []) as Bill[]);
    setRequests((r.data ?? []) as unknown as PR[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!flat) { setLoading(flatLoading); return; }
    refresh(flat.id);
  }, [flat, flatLoading]);

  const dueBills = useMemo(() => bills.filter(b => Number(b.total) - Number(b.paid_amount) > 0), [bills]);

  const openSubmit = (b?: Bill) => {
    const pick = b ?? dueBills[0];
    setBillId(pick?.id ?? "");
    setAmount(pick ? String(Number(pick.total) - Number(pick.paid_amount)) : "");
    setMethodGroup("bkash");
    setMethod("bkash");
    setReference("");
    setNote("");
    setOpen(true);
  };

  const submit = async () => {
    if (!flat || !billId || !amount) { toast.error(lang === "bn" ? "সব ফিল্ড পূরণ করুন" : "Fill all fields"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("payment_requests").insert({
      bill_id: billId,
      flat_id: flat.id,
      submitted_by: user?.id,
      amount: methodGroup === "bkash" ? Number(amount) * (1 + BKASH_FEE_PCT) : Number(amount),
      method, reference: reference || null, note: note || null,
      status: "pending",
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "জমা হয়েছে — অ্যাডমিন রিভিউ করবে" : "Submitted for admin review");
    setOpen(false);
    refresh(flat.id);
  };

  const downloadReceipt = (pr: PR) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Payment Receipt", 14, 18);
    doc.setFontSize(11);
    const total = Number(pr.amount);
    const isBkash = pr.method === "bkash";
    const due = isBkash ? total / (1 + BKASH_FEE_PCT) : total;
    const fee = isBkash ? total - due : 0;
    const lines = [
      `Flat: ${flat?.flat_no ?? "-"}`,
      `Owner: ${flat?.owner_name ?? "-"}`,
      `Month: ${pr.bills?.month ?? "-"}`,
      `Method: ${pr.method}`,
      `Reference: ${pr.reference ?? "-"}`,
      `Status: ${pr.status}`,
      `Submitted: ${new Date(pr.created_at).toLocaleString()}`,
      `Approved: ${pr.reviewed_at ? new Date(pr.reviewed_at).toLocaleString() : "-"}`,
      ``,
      `Due (base):     BDT ${due.toFixed(2)}`,
      `bKash Fee (2%): BDT ${fee.toFixed(2)}`,
      `Total Payable:  BDT ${total.toFixed(2)}`,
    ];
    lines.forEach((l, i) => doc.text(l, 14, 32 + i * 8));
    doc.save(`receipt-${pr.id.slice(0,8)}.pdf`);
  };

  const statusIcon = (s: string) => s === "approved" ? <CheckCircle2 className="h-4 w-4 text-success"/> : s === "rejected" ? <XCircle className="h-4 w-4 text-destructive"/> : <Clock className="h-4 w-4 text-warning"/>;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("myPayments")}</h1>
          {dueBills.length > 0 && (
            <Button onClick={() => openSubmit()} className="gradient-primary text-primary-foreground gap-2">
              <Plus className="h-4 w-4" /> {t("submitPayment")}
            </Button>
          )}
        </div>

        <div className="rounded-2xl bg-card border border-border shadow-soft divide-y divide-border">
          {loading && <div className="p-5 space-y-3">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-12"/>)}</div>}
          {!loading && requests.length === 0 && <div className="p-12 text-center text-muted-foreground">{t("noData")}</div>}
          {!loading && requests.map((pr) => (
            <div key={pr.id} className="p-5 flex items-center gap-4 flex-wrap">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted shrink-0">{statusIcon(pr.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground">{pr.bills?.month ?? "-"} · {t(pr.method as any) || pr.method}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {pr.reference && <>Ref: {pr.reference} · </>}
                  {new Date(pr.created_at).toLocaleString()}
                </div>
                {pr.review_note && <div className="text-xs text-muted-foreground mt-0.5 italic">{pr.review_note}</div>}
              </div>
              <div className="text-right">
                <div className="font-bold text-foreground">{formatMoney(Number(pr.amount), lang)}</div>
                <div className="text-[11px] text-muted-foreground capitalize">{t(pr.status as any) || pr.status}</div>
              </div>
              {pr.status === "approved" && (
                <Button size="sm" variant="outline" onClick={() => downloadReceipt(pr)} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" /> {t("receipt")}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("submitPayment")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("month")} / {t("dues")}</Label>
              <Select value={billId} onValueChange={(v)=>{setBillId(v); const b = dueBills.find(x=>x.id===v); if (b) setAmount(String(Number(b.total)-Number(b.paid_amount)));}}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {dueBills.map(b => <SelectItem key={b.id} value={b.id}>{b.month} — {formatMoney(Number(b.total)-Number(b.paid_amount), lang)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("amount")}</Label>
              <Input type="number" value={amount} onChange={(e)=>setAmount(e.target.value)}/>
            </div>
            <div>
              <Label>{t("paymentMethod")}</Label>
              <Select value={methodGroup} onValueChange={(v: "bkash"|"others")=>{ setMethodGroup(v); setMethod(v === "bkash" ? "bkash" : "cash"); }}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bkash">{t("bkash")}</SelectItem>
                  <SelectItem value="others">{lang === "bn" ? "অন্যান্য" : "Others"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {methodGroup === "bkash" ? (
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm space-y-1">
                <div>{lang === "bn" ? "বিকাশ নাম্বার" : "bKash Number"}: <span className="font-mono font-bold">{BKASH_NUMBER}</span> <span className="text-xs text-muted-foreground">({lang === "bn" ? "সেন্ড মানি" : "Send Money"})</span></div>
                <div className="flex justify-between"><span>{lang === "bn" ? "বকেয়া (মূল)" : "Due (base)"}</span><span className="font-medium">{formatMoney(Number(amount || 0), lang)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>{lang === "bn" ? "বিকাশ চার্জ (২%)" : "bKash Fee (2%)"}</span><span>{formatMoney(Number(amount || 0) * BKASH_FEE_PCT, lang)}</span></div>
                <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1"><span>{lang === "bn" ? "মোট প্রদেয়" : "Total Payable"}</span><span>{formatMoney(Number(amount || 0) * (1 + BKASH_FEE_PCT), lang)}</span></div>
              </div>
            ) : (
              <div>
                <Label>{lang === "bn" ? "মাধ্যম" : "Method"}</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nagad">{t("nagad")}</SelectItem>
                    <SelectItem value="rocket">{t("rocket")}</SelectItem>
                    <SelectItem value="bank">{t("bank")}</SelectItem>
                    <SelectItem value="cash">{t("cash")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>{t("reference")}</Label>
              <Input value={reference} onChange={(e)=>setReference(e.target.value)} placeholder="TrxID / last 4 digits"/>
            </div>
            <div>
              <Label>{t("otherNote")}</Label>
              <Textarea value={note} onChange={(e)=>setNote(e.target.value)} rows={2}/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setOpen(false)}>{t("cancel")}</Button>
            <Button onClick={submit} disabled={submitting} className="gradient-primary text-primary-foreground">{t("submit")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
