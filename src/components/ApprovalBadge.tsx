import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/i18n/LangContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

type Status = "pending" | "approved" | "rejected" | string | null | undefined;

interface Props {
  table: "expenses" | "other_incomes" | "loans" | "loan_repayments";
  id: string;
  status: Status;
  rejectReason?: string | null;
  onChanged?: () => void;
}

export function ApprovalBadge({ table, id, status, rejectReason, onChanged }: Props) {
  const { role, user } = useAuth();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const canApprove = role === "admin" || role === "manager";
  const s = (status || "approved") as "pending" | "approved" | "rejected";

  const label =
    s === "approved"
      ? lang === "bn" ? "অনুমোদিত" : "Approved"
      : s === "rejected"
      ? lang === "bn" ? "প্রত্যাখ্যাত" : "Rejected"
      : lang === "bn" ? "অপেক্ষমান" : "Pending";

  const Icon = s === "approved" ? CheckCircle2 : s === "rejected" ? XCircle : Clock;
  const cls =
    s === "approved"
      ? "bg-success/15 text-success border-success/30"
      : s === "rejected"
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : "bg-warning/15 text-warning border-warning/30";

  const act = async (next: "approved" | "rejected", rj?: string) => {
    setBusy(true);
    const { error } = await supabase
      .from(table)
      .update({
        approval_status: next,
        approved_by: user?.id ?? null,
        approved_at: new Date().toISOString(),
        reject_reason: next === "rejected" ? rj || null : null,
      })
      .eq("id", id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(lang === "bn" ? "সম্পন্ন" : "Done");
    setOpen(false);
    setReason("");
    onChanged?.();
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="outline" className={`gap-1 ${cls}`}>
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
      {s === "rejected" && rejectReason && (
        <span className="text-xs italic text-muted-foreground">— {rejectReason}</span>
      )}
      {canApprove && s === "pending" && (
        <>
          <Button
            size="sm"
            disabled={busy}
            onClick={() => act("approved")}
            className="h-7 px-2 bg-success text-success-foreground hover:bg-success/90 gap-1"
          >
            <CheckCircle2 className="h-3 w-3" />
            {lang === "bn" ? "অনুমোদন" : "Approve"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => setOpen(true)}
            className="h-7 px-2 gap-1"
          >
            <XCircle className="h-3 w-3" />
            {lang === "bn" ? "বাতিল" : "Reject"}
          </Button>
        </>
      )}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{lang === "bn" ? "বাতিলের কারণ" : "Reject reason"}</AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "bn" ? "অ্যাকাউন্ট্যান্টকে দেখানোর জন্য কারণ লিখুন (বাধ্যতামূলক)।" : "Provide a reason for the accountant (required)."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={lang === "bn" ? "কারণ" : "Reason"}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{lang === "bn" ? "বন্ধ" : "Close"}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || !reason.trim()}
              onClick={(e) => {
                e.preventDefault();
                if (reason.trim()) act("rejected", reason.trim());
              }}
            >
              {lang === "bn" ? "নিশ্চিত করুন" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Helper for inserts: returns the approval fields based on current role.
 * - Accountant inserts go in as "pending"
 * - Admin/Manager inserts auto-approve
 */
export function approvalFieldsForInsert(role: string | null, userId: string | null | undefined) {
  if (role === "accountant") {
    return {
      approval_status: "pending",
      submitted_by: userId ?? null,
      approved_by: null,
      approved_at: null,
    };
  }
  return {
    approval_status: "approved",
    submitted_by: userId ?? null,
    approved_by: userId ?? null,
    approved_at: new Date().toISOString(),
  };
}
