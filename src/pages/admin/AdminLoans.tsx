import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, HandCoins, ArrowDownCircle, CheckCircle2, RotateCcw, Trash2, ChevronDown, ChevronUp, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Flat = {
  id: string;
  flat_no: string;
  floor: number;
  owner_name: string | null;
  owner_name_bn: string | null;
};

type Repayment = {
  id: string;
  loan_id: string;
  amount: number;
  paid_date: string;
  note: string | null;
};

type Loan = {
  id: string;
  lender_flat_id: string | null;
  lender_name: string;
  lender_name_bn: string | null;
  principal: number;
  loan_date: string;
  purpose: string | null;
  note: string | null;
  status: string;
  created_at: string;
};

export default function AdminLoans() {
  const { lang } = useLang();
  const { user } = useAuth();

  const [flats, setFlats] = useState<Flat[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [loading, setLoading] = useState(true);

  const [openLoan, setOpenLoan] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [form, setForm] = useState({
    lender_flat_id: "",
    principal: "",
    loan_date: new Date().toISOString().slice(0, 10),
    purpose: "",
    note: "",
  });

  // Repayment dialog
  const [repayFor, setRepayFor] = useState<Loan | null>(null);
  const [repayForm, setRepayForm] = useState({
    amount: "",
    paid_date: new Date().toISOString().slice(0, 10),
    note: "",
  });

  // Delete loan
  const [deleteLoan, setDeleteLoan] = useState<Loan | null>(null);

  const load = async () => {
    setLoading(true);
    const [flatsRes, loansRes, repayRes] = await Promise.all([
      supabase.from("flats").select("id, flat_no, floor, owner_name, owner_name_bn").order("floor").order("flat_no"),
      supabase.from("loans").select("*").order("loan_date", { ascending: false }),
      supabase.from("loan_repayments").select("*").order("paid_date", { ascending: false }),
    ]);
    if (flatsRes.error) toast.error(flatsRes.error.message);
    if (loansRes.error) toast.error(loansRes.error.message);
    if (repayRes.error) toast.error(repayRes.error.message);
    setFlats((flatsRes.data ?? []) as Flat[]);
    setLoans((loansRes.data ?? []) as Loan[]);
    setRepayments((repayRes.data ?? []) as Repayment[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Per-loan repaid totals
  const repaidByLoan = useMemo(() => {
    const map = new Map<string, number>();
    repayments.forEach((r) => {
      map.set(r.loan_id, (map.get(r.loan_id) ?? 0) + Number(r.amount || 0));
    });
    return map;
  }, [repayments]);

  const totals = useMemo(() => {
    const principal = loans.reduce((s, l) => s + Number(l.principal || 0), 0);
    const repaid = repayments.reduce((s, r) => s + Number(r.amount || 0), 0);
    const outstanding = principal - repaid;
    const activeCount = loans.filter((l) => l.status === "active").length;
    return { principal, repaid, outstanding, activeCount };
  }, [loans, repayments]);

  const submitLoan = async () => {
    const amt = Number(form.principal);
    if (!form.lender_flat_id || !amt || amt <= 0) {
      toast.error(lang === "bn" ? "Lender ও amount দিন" : "Pick lender & amount");
      return;
    }
    const flat = flats.find((f) => f.id === form.lender_flat_id);
    if (!flat) return;
    setSubmitting(true);
    const { error } = await supabase.from("loans").insert({
      lender_flat_id: flat.id,
      lender_name: flat.owner_name || flat.flat_no,
      lender_name_bn: flat.owner_name_bn,
      principal: amt,
      loan_date: form.loan_date,
      purpose: form.purpose.trim() || null,
      note: form.note.trim() || null,
      status: "active",
      created_by: user?.id ?? null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(lang === "bn" ? "Loan যোগ হয়েছে" : "Loan added");
    setForm({
      lender_flat_id: "",
      principal: "",
      loan_date: new Date().toISOString().slice(0, 10),
      purpose: "",
      note: "",
    });
    setOpenLoan(false);
    load();
  };

  const submitRepayment = async () => {
    if (!repayFor) return;
    const amt = Number(repayForm.amount);
    if (!amt || amt <= 0) {
      toast.error(lang === "bn" ? "সঠিক amount দিন" : "Enter valid amount");
      return;
    }
    const outstanding =
      Number(repayFor.principal) - (repaidByLoan.get(repayFor.id) ?? 0);
    if (amt > outstanding + 0.001) {
      toast.error(lang === "bn" ? "Outstanding-এর বেশি দেওয়া যাবে না" : "Cannot exceed outstanding");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("loan_repayments").insert({
      loan_id: repayFor.id,
      amount: amt,
      paid_date: repayForm.paid_date,
      note: repayForm.note.trim() || null,
      created_by: user?.id ?? null,
    });
    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }
    // Auto-settle if fully paid
    const newOutstanding = outstanding - amt;
    if (newOutstanding <= 0.001 && repayFor.status !== "settled") {
      await supabase.from("loans").update({ status: "settled" }).eq("id", repayFor.id);
    }
    setSubmitting(false);
    toast.success(lang === "bn" ? "Repayment যোগ হয়েছে" : "Repayment added");
    setRepayFor(null);
    setRepayForm({ amount: "", paid_date: new Date().toISOString().slice(0, 10), note: "" });
    load();
  };

  const toggleStatus = async (loan: Loan) => {
    const next = loan.status === "settled" ? "active" : "settled";
    const { error } = await supabase.from("loans").update({ status: next }).eq("id", loan.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(next === "settled" ? (lang === "bn" ? "Settled" : "Marked settled") : (lang === "bn" ? "Active" : "Reopened"));
    load();
  };

  const removeLoan = async () => {
    if (!deleteLoan) return;
    const { error } = await supabase.from("loans").delete().eq("id", deleteLoan.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(lang === "bn" ? "Loan মুছে ফেলা হয়েছে" : "Loan deleted");
    setDeleteLoan(null);
    load();
  };

  const removeRepayment = async (id: string) => {
    const { error } = await supabase.from("loan_repayments").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(lang === "bn" ? "Repayment মুছে ফেলা হয়েছে" : "Repayment deleted");
    load();
  };

  const lenderName = (l: Loan) => (lang === "bn" ? l.lender_name_bn || l.lender_name : l.lender_name);
  const flatLabel = (l: Loan) => {
    const f = flats.find((x) => x.id === l.lender_flat_id);
    return f ? `${f.flat_no} (${lang === "bn" ? "ফ্লোর" : "Floor"} ${f.floor})` : "—";
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <HandCoins className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {lang === "bn" ? "লোন ব্যবস্থাপনা" : "Loans"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {lang === "bn"
                  ? "ফ্ল্যাট ওনারদের কাছ থেকে নেওয়া লোন ও ফেরত"
                  : "Loans taken from flat owners & repayments"}
              </p>
            </div>
          </div>

          <Dialog open={openLoan} onOpenChange={setOpenLoan}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground gap-2 shadow-elegant">
                <Plus className="h-4 w-4" /> {lang === "bn" ? "নতুন লোন" : "New Loan"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{lang === "bn" ? "নতুন লোন যোগ করুন" : "Add New Loan"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{lang === "bn" ? "Lender (ফ্ল্যাট ওনার)" : "Lender (Flat Owner)"}</Label>
                  <Select value={form.lender_flat_id} onValueChange={(v) => setForm({ ...form, lender_flat_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={lang === "bn" ? "ফ্ল্যাট নির্বাচন করুন" : "Select flat"} />
                    </SelectTrigger>
                    <SelectContent>
                      {flats.map((f) => {
                        const name = lang === "bn" ? f.owner_name_bn || f.owner_name : f.owner_name;
                        return (
                          <SelectItem key={f.id} value={f.id}>
                            {f.flat_no} — {name || (lang === "bn" ? "নাম নেই" : "no name")}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{lang === "bn" ? "তারিখ" : "Date"}</Label>
                    <Input
                      type="date"
                      value={form.loan_date}
                      onChange={(e) => setForm({ ...form, loan_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{lang === "bn" ? "Amount" : "Amount"}</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form.principal}
                      onChange={(e) => setForm({ ...form, principal: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{lang === "bn" ? "কারণ (ঐচ্ছিক)" : "Purpose (optional)"}</Label>
                  <Input
                    placeholder={lang === "bn" ? "যেমন: লিফট মেরামত" : "e.g. lift repair"}
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{lang === "bn" ? "নোট" : "Note"}</Label>
                  <Textarea
                    rows={2}
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    maxLength={300}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenLoan(false)} disabled={submitting}>
                  {lang === "bn" ? "বাতিল" : "Cancel"}
                </Button>
                <Button className="gradient-primary text-primary-foreground" onClick={submitLoan} disabled={submitting}>
                  {submitting ? "..." : lang === "bn" ? "সংরক্ষণ" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label={lang === "bn" ? "মোট নেওয়া" : "Total Borrowed"} value={formatMoney(totals.principal, lang)} />
          <SummaryCard label={lang === "bn" ? "মোট ফেরত" : "Total Repaid"} value={formatMoney(totals.repaid, lang)} tone="success" />
          <SummaryCard label={lang === "bn" ? "বাকি" : "Outstanding"} value={formatMoney(totals.outstanding, lang)} tone={totals.outstanding > 0 ? "destructive" : "default"} />
          <SummaryCard label={lang === "bn" ? "চলমান লোন" : "Active Loans"} value={String(totals.activeCount)} />
        </div>

        {/* List */}
        <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
          {loading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : loans.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              {lang === "bn" ? "এখনো কোনো লোন রেকর্ড নেই।" : "No loans recorded yet."}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {loans.map((l) => {
                const repaid = repaidByLoan.get(l.id) ?? 0;
                const outstanding = Number(l.principal) - repaid;
                const isOpen = expanded === l.id;
                const loanRepays = repayments.filter((r) => r.loan_id === l.id);
                return (
                  <li key={l.id} className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">{lenderName(l)}</span>
                          <span className="text-xs text-muted-foreground">{flatLabel(l)}</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            l.status === "settled"
                              ? "bg-success/15 text-success"
                              : "bg-warning/15 text-warning"
                          )}>
                            {l.status}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {l.loan_date}
                          {l.purpose && <> · {l.purpose}</>}
                        </div>
                        {l.note && <div className="text-xs text-muted-foreground italic mt-1">{l.note}</div>}
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">{lang === "bn" ? "Principal" : "Principal"}</div>
                        <div className="font-bold text-foreground">{formatMoney(l.principal, lang)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">{lang === "bn" ? "ফেরত" : "Repaid"}</div>
                        <div className="font-bold text-success">{formatMoney(repaid, lang)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">{lang === "bn" ? "বাকি" : "Outstanding"}</div>
                        <div className={cn("font-bold", outstanding > 0 ? "text-destructive" : "text-success")}>
                          {formatMoney(outstanding, lang)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRepayFor(l);
                          setRepayForm({
                            amount: outstanding > 0 ? String(outstanding) : "",
                            paid_date: new Date().toISOString().slice(0, 10),
                            note: "",
                          });
                        }}
                        disabled={outstanding <= 0}
                        className="gap-1.5"
                      >
                        <ArrowDownCircle className="h-4 w-4" /> {lang === "bn" ? "ফেরত যোগ" : "Add Repayment"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleStatus(l)} className="gap-1.5">
                        {l.status === "settled" ? <RotateCcw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        {l.status === "settled" ? (lang === "bn" ? "পুনরায় চালু" : "Reopen") : (lang === "bn" ? "Settled চিহ্নিত" : "Mark Settled")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpanded(isOpen ? null : l.id)}
                        className="gap-1.5"
                      >
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {loanRepays.length} {lang === "bn" ? "ফেরত" : "repayments"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteLoan(l)}
                        className="gap-1.5 text-destructive hover:text-destructive ml-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {isOpen && (
                      <div className="mt-3 rounded-lg border border-border bg-muted/30 overflow-hidden">
                        {loanRepays.length === 0 ? (
                          <div className="p-3 text-xs text-muted-foreground text-center">
                            {lang === "bn" ? "কোনো ফেরত নেই" : "No repayments yet"}
                          </div>
                        ) : (
                          <ul className="divide-y divide-border">
                            {loanRepays.map((r) => (
                              <li key={r.id} className="p-2.5 flex items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <ArrowDownCircle className="h-3.5 w-3.5 text-success shrink-0" />
                                  <span className="font-medium">{r.paid_date}</span>
                                  {r.note && <span className="text-muted-foreground italic truncate">· {r.note}</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-success">{formatMoney(r.amount, lang)}</span>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeRepayment(r.id)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Repayment dialog */}
      <Dialog open={!!repayFor} onOpenChange={(o) => !o && setRepayFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {lang === "bn" ? "ফেরত যোগ করুন" : "Add Repayment"}
              {repayFor && <span className="block text-xs text-muted-foreground font-normal mt-1">{lenderName(repayFor)} · {formatMoney(repayFor.principal, lang)}</span>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{lang === "bn" ? "তারিখ" : "Date"}</Label>
                <Input type="date" value={repayForm.paid_date} onChange={(e) => setRepayForm({ ...repayForm, paid_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{lang === "bn" ? "Amount" : "Amount"}</Label>
                <Input type="number" min="0" placeholder="0" value={repayForm.amount} onChange={(e) => setRepayForm({ ...repayForm, amount: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{lang === "bn" ? "নোট" : "Note"}</Label>
              <Textarea rows={2} maxLength={200} value={repayForm.note} onChange={(e) => setRepayForm({ ...repayForm, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRepayFor(null)} disabled={submitting}>{lang === "bn" ? "বাতিল" : "Cancel"}</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={submitRepayment} disabled={submitting}>
              {submitting ? "..." : lang === "bn" ? "সংরক্ষণ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteLoan} onOpenChange={(o) => !o && setDeleteLoan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{lang === "bn" ? "লোন মুছবেন?" : "Delete this loan?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "bn"
                ? "সব ফেরতের রেকর্ডসহ এই লোন স্থায়ীভাবে মুছে যাবে।"
                : "This loan and all its repayments will be permanently removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lang === "bn" ? "বাতিল" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={removeLoan} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {lang === "bn" ? "মুছুন" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "destructive";
}) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("text-lg font-bold mt-1", toneClass)}>{value}</div>
    </div>
  );
}
