import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney, formatNumber } from "@/i18n/translations";
import { CheckCircle2, Clock, XCircle, Download, Plus, Building2, Home, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerFlats, OwnerFlat } from "@/hooks/useOwnerFlat";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useBkashSettings } from "@/hooks/useBkashSettings";
import { fromDue } from "@/lib/bkashMath";
import { downloadReceiptPdf } from "@/lib/receiptPdf";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useSelectedFlatId } from "@/hooks/useSelectedFlatId";

type Bill = {
  id: string;
  flat_id: string;
  month: string;
  total: number;
  paid_amount: number;
};
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
  bills?: { month: string } | null;
};

export default function OwnerPayments() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { flats, loading: flatsLoading } = useOwnerFlats();
  const [bills, setBills] = useState<Bill[]>([]);
  const [requests, setRequests] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitFlatId, setSubmitFlatId] = useState<string>("");
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
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const refresh = async (flatIds: string[]) => {
    if (flatIds.length === 0) { setLoading(false); return; }
    setLoading(true);
    const [b, r] = await Promise.all([
      supabase.from("bills").select("id, flat_id, month, total, paid_amount").in("flat_id", flatIds).order("month", { ascending: false }),
      supabase.from("payment_requests").select("id, flat_id, bill_id, amount, method, reference, note, status, review_note, reviewed_at, created_at, bills(month)").in("flat_id", flatIds).order("created_at", { ascending: false }),
    ]);
    if (b.error) toast.error(b.error.message);
    if (r.error) toast.error(r.error.message);
    setBills((b.data ?? []) as Bill[]);
    setRequests((r.data ?? []) as unknown as PR[]);
    setLoading(false);
  };

  useEffect(() => {
    if (flats.length === 0) { setLoading(flatsLoading); return; }
    refresh(flats.map(f => f.id));
  }, [flats, flatsLoading]);

  const dueBills = useMemo(
    () => bills.filter(b => Number(b.total) - Number(b.paid_amount) > 0),
    [bills]
  );

  const dueBillsByFlat = useMemo(() => {
    const m: Record<string, Bill[]> = {};
    allFlats.forEach(f => { m[f.id] = []; });
    dueBills.forEach(b => { (m[b.flat_id] ??= []).push(b); });
    return m;
  }, [dueBills, allFlats]);

  const openSubmit = (b?: Bill, fid?: string) => {
    const flatId = fid ?? b?.flat_id ?? flats.find(f => (dueBillsByFlat[f.id] ?? []).length > 0)?.id ?? flats[0]?.id ?? "";
    setSubmitFlatId(flatId);
    const flatDueBills = dueBillsByFlat[flatId] ?? [];
    const pick = b ?? flatDueBills[0];
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
    if (autoOpenedRef.current || loading || flats.length === 0) return;
    const wantPay = searchParams.get("pay") === "1";
    const wantBill = searchParams.get("bill");
    const wantFlat = searchParams.get("flat");
    if (!wantPay && !wantBill) return;
    const target = wantBill ? bills.find(b => b.id === wantBill && Number(b.total) - Number(b.paid_amount) > 0) : undefined;
    if (target || dueBills.length > 0) {
      openSubmit(target, wantFlat ?? undefined);
      autoOpenedRef.current = true;
      const next = new URLSearchParams(searchParams);
      next.delete("pay"); next.delete("bill"); next.delete("flat");
      setSearchParams(next, { replace: true });
    }
  }, [loading, flats, bills, dueBills, searchParams, setSearchParams]);

  const submit = async () => {
    if (!submitFlatId || !billId || !amount) { toast.error(lang === "bn" ? "সব ফিল্ড পূরণ করুন" : "Fill all fields"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("payment_requests").insert({
      bill_id: billId,
      flat_id: submitFlatId,
      submitted_by: user?.id,
      amount: Number(amount),
      method, reference: reference || null, note: note || null,
      status: "pending",
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "জমা হয়েছে — অ্যাডমিন রিভিউ করবে" : "Submitted for admin review");
    setOpen(false);
    refresh(flats.map(f => f.id));
  };

  const downloadReceipt = (pr: PR) => {
    const f = flats.find(x => x.id === pr.flat_id);
    return downloadReceiptPdf(pr as any, f ? { flat_no: f.flat_no, owner_name: f.owner_name } : null, { number: BKASH_NUMBER, fee_pct: BKASH_FEE_PCT });
  };

  const statusIcon = (s: string) => s === "approved" ? <CheckCircle2 className="h-4 w-4 text-success"/> : s === "rejected" ? <XCircle className="h-4 w-4 text-destructive"/> : <Clock className="h-4 w-4 text-warning"/>;

  // Group requests by flat
  const groups = useMemo(() => {
    return flats.map(f => {
      const list = requests.filter(r => r.flat_id === f.id);
      const isRented = !!(user && f.owner_user_id === user.id && f.tenant_user_id && f.tenant_user_id !== user.id);
      return { flat: f, items: list, isRented };
    });
  }, [flats, requests, user]);

  // default open: groups with items, or first group
  useEffect(() => {
    if (groups.length === 0) return;
    setOpenMap(prev => {
      const next = { ...prev };
      const anyHadItems = groups.some(g => g.items.length > 0);
      groups.forEach((g, idx) => {
        if (next[g.flat.id] === undefined) {
          next[g.flat.id] = anyHadItems ? g.items.length > 0 : idx === 0;
        }
      });
      return next;
    });
  }, [groups]);

  const submitFlatDueBills = useMemo(() => dueBillsByFlat[submitFlatId] ?? [], [dueBillsByFlat, submitFlatId]);

  const renderItem = (pr: PR) => (
    <div key={pr.id} className="p-4 flex items-center gap-3 flex-wrap">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted shrink-0">{statusIcon(pr.status)}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-foreground text-sm">{pr.bills?.month ?? "-"} · {t(pr.method as any) || pr.method}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {pr.reference && <>Ref: {pr.reference} · </>}
          {new Date(pr.created_at).toLocaleString()}
        </div>
        {pr.review_note && <div className="text-xs text-muted-foreground mt-0.5 italic">{pr.review_note}</div>}
      </div>
      <div className="text-right">
        <div className="font-bold text-foreground text-sm">{formatMoney(Number(pr.amount), lang)}</div>
        <div className="text-[11px] text-muted-foreground capitalize">{t(pr.status as any) || pr.status}</div>
      </div>
      {pr.status === "approved" && (
        <Button size="sm" variant="outline" onClick={() => downloadReceipt(pr)} className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> {t("receipt")}
        </Button>
      )}
    </div>
  );

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

        {loading && <div className="space-y-3">{Array.from({length:2}).map((_,i)=><Skeleton key={i} className="h-20 rounded-2xl"/>)}</div>}

        {!loading && requests.length === 0 && (
          <div className="rounded-2xl bg-card border border-border p-12 text-center text-muted-foreground">{t("noData")}</div>
        )}

        {!loading && requests.length > 0 && flats.length === 1 && (
          <div className="rounded-2xl bg-card border border-border shadow-soft divide-y divide-border">
            {requests.map(renderItem)}
          </div>
        )}

        {!loading && flats.length > 1 && groups.map((g) => {
          const isOpen = !!openMap[g.flat.id];
          return (
            <Collapsible key={g.flat.id} open={isOpen} onOpenChange={(v) => setOpenMap(p => ({ ...p, [g.flat.id]: v }))}>
              <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
                <CollapsibleTrigger className="w-full p-4 flex items-center gap-3 hover:bg-muted/40 transition-colors text-left">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                    g.isRented ? "bg-accent/20 text-accent-foreground" : "bg-primary/10 text-primary"
                  )}>
                    {g.isRented ? <Home className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-bold text-foreground">{lang === "bn" ? "ফ্ল্যাট" : "Flat"} {g.flat.flat_no}</div>
                      {g.isRented && (
                        <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-accent/20 text-accent-foreground">
                          {lang === "bn" ? "ভাড়া" : "Rented"}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {formatNumber(g.items.length, lang)} {lang === "bn" ? "পেমেন্ট" : "payments"}
                    </div>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="divide-y divide-border border-t border-border">
                    {g.items.length === 0
                      ? <div className="p-6 text-center text-sm text-muted-foreground">{t("noData")}</div>
                      : g.items.map(renderItem)}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("submitPayment")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {flats.length > 1 && (
              <div>
                <Label>{lang === "bn" ? "ফ্ল্যাট" : "Flat"}</Label>
                <Select value={submitFlatId} onValueChange={(v) => {
                  setSubmitFlatId(v);
                  const list = dueBillsByFlat[v] ?? [];
                  const first = list[0];
                  setBillId(first?.id ?? "");
                  setAmount(first ? String(Number(first.total) - Number(first.paid_amount)) : "");
                }}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {flats.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.flat_no} {(dueBillsByFlat[f.id]?.length ?? 0) > 0 ? `· ${formatNumber(dueBillsByFlat[f.id].length, lang)}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>{t("month")} / {t("dues")}</Label>
              <Select value={billId} onValueChange={(v)=>{setBillId(v); const b = submitFlatDueBills.find(x=>x.id===v); if (b) setAmount(String(Number(b.total)-Number(b.paid_amount)));}}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {submitFlatDueBills.map(b => <SelectItem key={b.id} value={b.id}>{b.month} — {formatMoney(Number(b.total)-Number(b.paid_amount), lang)}</SelectItem>)}
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
