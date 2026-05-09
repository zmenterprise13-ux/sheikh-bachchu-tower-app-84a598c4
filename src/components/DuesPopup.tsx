import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/i18n/LangContext";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BellRing } from "lucide-react";
import { NoticeBody } from "@/components/NoticeBody";
import { formatMoney } from "@/i18n/translations";
import { useNavigate } from "react-router-dom";

type Row = {
  id: string;
  title: string;
  body: string;
  due_amount: number;
  month: string | null;
  bill_id: string | null;
  created_at: string;
  bills?: { status: string } | null;
};



export function DuesPopup() {
  const { user, role } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [items, setItems] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (role !== "owner" && role !== "tenant") return;
    

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("dues_notifications")
        .select("id, title, body, due_amount, month, bill_id, created_at")
        .order("created_at", { ascending: false });
      if (error || cancelled) return;
      const rows = (data ?? []) as Row[];
      const billIds = Array.from(new Set(rows.map((r) => r.bill_id).filter(Boolean))) as string[];
      let statusMap = new Map<string, string>();
      if (billIds.length > 0) {
        const { data: bs } = await supabase.from("bills").select("id, status").in("id", billIds);
        (bs ?? []).forEach((b: any) => statusMap.set(b.id, b.status));
      }
      const unpaid = rows.filter((r) => {
        if (r.bill_id) return statusMap.get(r.bill_id) !== "paid";
        return true;
      });
      if (unpaid.length > 0) {
        setItems(unpaid);
        setOpen(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user, role]);

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setOpen(false);
  };

  const goPay = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setOpen(false);
    navigate(role === "tenant" ? "/owner/dues" : "/owner/dues");
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
              <BellRing className="h-5 w-5" />
            </span>
            {lang === "bn" ? "বকেয়া পরিশোধের অনুরোধ" : "Pending dues reminder"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {items.map((n) => (
            <div key={n.id} className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <div className="font-semibold text-foreground">{n.title}</div>
              <NoticeBody text={n.body} lang={lang as "bn" | "en"} className="text-sm text-muted-foreground mt-1" />
              {Number(n.due_amount) > 0 && (
                <div className="mt-2 text-sm font-bold text-destructive">
                  {lang === "bn" ? "বকেয়া: " : "Due: "}
                  {formatMoney(Number(n.due_amount), lang)}
                </div>
              )}
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={dismiss}>
            {lang === "bn" ? "পরে দেখব" : "Later"}
          </Button>
          <Button className="gradient-primary text-primary-foreground" onClick={goPay}>
            {lang === "bn" ? "এখনই পরিশোধ করুন" : "Pay now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
