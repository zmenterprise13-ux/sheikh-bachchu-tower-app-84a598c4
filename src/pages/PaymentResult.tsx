import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LangContext";

type Mode = "success" | "fail" | "cancel";

export default function PaymentResult({ mode }: { mode: Mode }) {
  const { lang } = useLang();
  const [params] = useSearchParams();
  const tran_id = params.get("tran_id") || "";
  const [state, setState] = useState<"checking"|"approved"|"pending"|"failed">("checking");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    if (!tran_id) {
      setState(mode === "success" ? "pending" : "failed");
      return;
    }
    (async () => {
      try {
        const SB_URL = import.meta.env.VITE_SUPABASE_URL;
        const r = await fetch(
          `${SB_URL}/functions/v1/sslcz-ipn?tran_id=${encodeURIComponent(tran_id)}&result=${mode}`
        );
        const j = await r.json();
        if (mode === "success") {
          if (j?.ok && j?.status === "approved") setState("approved");
          else { setState("pending"); setMsg(j?.error || j?.status || ""); }
        } else {
          setState("failed");
          setMsg(j?.reason || j?.status || "");
        }
      } catch (e: any) {
        setState(mode === "success" ? "pending" : "failed");
        setMsg(String(e));
      }
    })();
  }, [mode, tran_id]);

  const titleMap = {
    approved: lang === "bn" ? "পেমেন্ট সফল হয়েছে" : "Payment Successful",
    pending: lang === "bn" ? "পেমেন্ট যাচাই বাকি" : "Payment Verification Pending",
    failed: mode === "cancel"
      ? (lang === "bn" ? "পেমেন্ট বাতিল হয়েছে" : "Payment Cancelled")
      : (lang === "bn" ? "পেমেন্ট ব্যর্থ হয়েছে" : "Payment Failed"),
    checking: lang === "bn" ? "যাচাই করা হচ্ছে..." : "Verifying...",
  } as const;

  const icon = state === "approved" ? <CheckCircle2 className="h-14 w-14 text-success"/>
    : state === "checking" ? <Loader2 className="h-14 w-14 animate-spin text-primary"/>
    : state === "pending" ? <Clock className="h-14 w-14 text-warning"/>
    : <XCircle className="h-14 w-14 text-destructive"/>;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full rounded-2xl bg-card border border-border shadow-soft p-8 text-center space-y-4">
        <div className="flex justify-center">{icon}</div>
        <h1 className="text-2xl font-bold text-foreground">{titleMap[state]}</h1>
        {tran_id && <p className="text-xs text-muted-foreground font-mono break-all">Trx: {tran_id}</p>}
        {state === "pending" && (
          <p className="text-sm text-muted-foreground">
            {lang === "bn"
              ? "আপনার পেমেন্ট প্রসেসিং এ আছে। কিছুক্ষণ পর পেমেন্ট পেজে চেক করুন।"
              : "Your payment is being processed. Please check the payments page in a few moments."}
            {msg && <span className="block mt-1 text-xs">{msg}</span>}
          </p>
        )}
        {state === "approved" && (
          <p className="text-sm text-muted-foreground">
            {lang === "bn" ? "ধন্যবাদ! আপনার বিল পরিশোধিত হয়েছে।" : "Thank you! Your bill has been marked as paid."}
          </p>
        )}
        {(state === "failed") && (
          <p className="text-sm text-muted-foreground">
            {lang === "bn" ? "আপনি আবার চেষ্টা করতে পারেন।" : "You can try again."}
          </p>
        )}
        <div className="pt-2 flex flex-col gap-2">
          <Button asChild className="w-full"><Link to="/owner/payments">{lang === "bn" ? "পেমেন্ট পেজে যান" : "Go to Payments"}</Link></Button>
          <Button asChild variant="outline" className="w-full"><Link to="/owner">{lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard"}</Link></Button>
        </div>
      </div>
    </div>
  );
}
