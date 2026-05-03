import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
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
import { fromDue, fromTotal, noFee } from "@/lib/bkashMath";
import bkashLogo from "@/assets/bkash-logo.png";

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

  const [searchParams, setSearchParams] = useSearchParams();
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current || loading || !flat) return;
    const wantPay = searchParams.get("pay") === "1";
    const wantBill = searchParams.get("bill");
    if (!wantPay && !wantBill) return;
    const target = wantBill ? bills.find(b => b.id === wantBill && Number(b.total) - Number(b.paid_amount) > 0) : undefined;
    if (target || dueBills.length > 0) {
      openSubmit(target);
      autoOpenedRef.current = true;
      const next = new URLSearchParams(searchParams);
      next.delete("pay"); next.delete("bill");
      setSearchParams(next, { replace: true });
    }
  }, [loading, flat, bills, dueBills, searchParams, setSearchParams]);

  const submit = async () => {
    if (!flat || !billId || !amount) { toast.error(lang === "bn" ? "সব ফিল্ড পূরণ করুন" : "Fill all fields"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("payment_requests").insert({
      bill_id: billId,
      flat_id: flat.id,
      submitted_by: user?.id,
      amount: methodGroup === "bkash" ? fromDue(Number(amount), BKASH_FEE_PCT).total : noFee(Number(amount)).total,
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
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const isBkash = pr.method === "bkash";
    const { due, fee, total } = isBkash
      ? fromTotal(Number(pr.amount), BKASH_FEE_PCT)
      : noFee(Number(pr.amount));

    // Header band
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, W, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("PAYMENT RECEIPT", 14, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Apartment Owners Association", 14, 26);

    // Receipt # / date on the right
    doc.setFontSize(9);
    const rNo = `Receipt #: ${pr.id.slice(0, 8).toUpperCase()}`;
    const rDate = `Date: ${new Date(pr.reviewed_at ?? pr.created_at).toLocaleDateString()}`;
    doc.text(rNo, W - 14, 18, { align: "right" });
    doc.text(rDate, W - 14, 24, { align: "right" });

    // Status badge
    doc.setTextColor(15, 23, 42);
    const badgeColor: [number, number, number] =
      pr.status === "approved" ? [34, 197, 94] : pr.status === "rejected" ? [239, 68, 68] : [234, 179, 8];
    doc.setFillColor(...badgeColor);
    doc.roundedRect(W - 44, 38, 30, 8, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(pr.status.toUpperCase(), W - 29, 43.5, { align: "center" });

    // Bill-to section
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("BILLED TO", 14, 44);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`${flat?.owner_name ?? "-"}`, 14, 51);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Flat: ${flat?.flat_no ?? "-"}`, 14, 57);
    doc.text(`For Month: ${pr.bills?.month ?? "-"}`, 14, 63);

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 70, W - 14, 70);

    // Payment method block (with bKash logo if applicable)
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("PAYMENT METHOD", 14, 80);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    if (isBkash) {
      try { doc.addImage(bkashLogo, "PNG", 14, 84, 12, 12); } catch {}
      doc.setTextColor(226, 19, 110);
      doc.text("bKash", 30, 92);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Send Money to: ${BKASH_NUMBER}`, 30, 97);
    } else {
      doc.text(pr.method.toUpperCase(), 14, 88);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Reference: ${pr.reference ?? "-"}`, W - 14, 88, { align: "right" });
    doc.text(`Submitted: ${new Date(pr.created_at).toLocaleString()}`, W - 14, 94, { align: "right" });
    if (pr.reviewed_at) doc.text(`Approved: ${new Date(pr.reviewed_at).toLocaleString()}`, W - 14, 100, { align: "right" });

    // Amount table
    const tY = 112;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, tY, W - 28, 9, "F");
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("DESCRIPTION", 18, tY + 6);
    doc.text("AMOUNT (BDT)", W - 18, tY + 6, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    let row = tY + 17;
    doc.text("Due (base)", 18, row);
    doc.text(due.toFixed(2), W - 18, row, { align: "right" });
    if (isBkash) {
      row += 8;
      doc.text(`bKash Fee (${(BKASH_FEE_PCT * 100).toFixed(2)}%)`, 18, row);
      doc.text(fee.toFixed(2), W - 18, row, { align: "right" });
    }
    row += 4;
    doc.setDrawColor(203, 213, 225);
    doc.line(14, row, W - 14, row);
    row += 8;

    // Total row
    doc.setFillColor(15, 23, 42);
    doc.rect(14, row - 6, W - 28, 11, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("TOTAL PAID", 18, row + 1);
    doc.text(`BDT ${total.toFixed(2)}`, W - 18, row + 1, { align: "right" });

    // Footer
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text("This is a system-generated receipt and does not require a signature.", W / 2, 280, { align: "center" });
    doc.text("Thank you for your payment.", W / 2, 285, { align: "center" });

    doc.save(`receipt-${pr.id.slice(0, 8)}.pdf`);
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
                {(() => { const b = fromDue(Number(amount || 0), BKASH_FEE_PCT); return (<>
                  <div className="flex justify-between"><span>{lang === "bn" ? "বকেয়া (মূল)" : "Due (base)"}</span><span className="font-medium">৳ {b.due.toFixed(2)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>{lang === "bn" ? `বিকাশ চার্জ (${(BKASH_FEE_PCT*100).toFixed(2)}%)` : `bKash Fee (${(BKASH_FEE_PCT*100).toFixed(2)}%)`}</span><span>৳ {b.fee.toFixed(2)}</span></div>
                  <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1"><span>{lang === "bn" ? "মোট প্রদেয়" : "Total Payable"}</span><span>৳ {b.total.toFixed(2)}</span></div>
                </>); })()}
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
