import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/i18n/LangContext";
import { toast } from "sonner";
import { formatMoney } from "@/i18n/translations";

/**
 * Tracks count of payment_requests that need admin/manager attention:
 *   - status = 'pending'  (new owner/tenant/accountant submission)
 *   - status = 'reviewed' (accountant-approved, awaiting admin)
 *
 * Fires a sonner toast on new inserts and on transitions into 'reviewed'.
 * Returns 0 (and is a no-op) for non-admin/manager roles.
 */
export function usePendingPaymentRequests() {
  const { role } = useAuth();
  const { lang } = useLang();
  const [count, setCount] = useState(0);
  const seenInitial = useRef(false);
  const enabled = role === "admin" || role === "manager";

  useEffect(() => {
    if (!enabled) { setCount(0); return; }

    const refresh = async () => {
      const { count: c } = await supabase
        .from("payment_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "reviewed"]);
      setCount(c ?? 0);
      seenInitial.current = true;
    };
    refresh();

    const describe = async (row: any, kind: "new" | "reviewed") => {
      const { data: f } = await supabase
        .from("flats")
        .select("flat_no, owner_name")
        .eq("id", row.flat_id)
        .maybeSingle();
      const who = f ? `${lang === "bn" ? "ফ্ল্যাট" : "Flat"} ${f.flat_no}${f.owner_name ? " · " + f.owner_name : ""}` : "";
      const title = kind === "new"
        ? (lang === "bn" ? "নতুন পেমেন্ট রিকোয়েস্ট" : "New payment request")
        : (lang === "bn" ? "অ্যাকাউন্ট্যান্ট অনুমোদন — অ্যাডমিন অপেক্ষায়" : "Accountant approved — awaiting admin");
      toast.info(title, { description: `${who} — ${formatMoney(Number(row.amount), lang)}` });
    };

    const channel = supabase
      .channel(`pending-pr-watch-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "payment_requests" },
        (payload) => {
          const row: any = payload.new;
          if (row?.status === "pending" || row?.status === "reviewed") {
            describe(row, "new");
            refresh();
          }
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "payment_requests" },
        (payload) => {
          const oldRow: any = payload.old;
          const row: any = payload.new;
          if (oldRow?.status !== "reviewed" && row?.status === "reviewed") {
            describe(row, "reviewed");
          }
          refresh();
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [enabled, lang]);

  return count;
}
