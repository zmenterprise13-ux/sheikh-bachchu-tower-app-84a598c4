import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { Megaphone, AlertTriangle, BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { NoticeBody } from "@/components/NoticeBody";

type Notice = {
  id: string;
  title: string;
  title_bn: string;
  body: string;
  body_bn: string;
  important: boolean;
  date: string;
};

type DuesNotice = {
  id: string;
  title: string;
  body: string;
  due_amount: number;
  month: string | null;
  created_at: string;
  read_at: string | null;
};

export default function OwnerNotices() {
  const { t, lang } = useLang();
  const [items, setItems] = useState<Notice[]>([]);
  const [personal, setPersonal] = useState<DuesNotice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [noticesRes, duesRes] = await Promise.all([
        supabase
          .from("notices")
          .select("id, title, title_bn, body, body_bn, important, date")
          .order("date", { ascending: false }),
        supabase
          .from("dues_notifications")
          .select("id, title, body, due_amount, month, created_at, read_at")
          .order("created_at", { ascending: false }),
      ]);
      if (noticesRes.error) toast.error(noticesRes.error.message);
      setItems((noticesRes.data ?? []) as Notice[]);
      const dn = (duesRes.data ?? []) as DuesNotice[];
      setPersonal(dn);
      // Mark unread as read
      const unreadIds = dn.filter((d) => !d.read_at).map((d) => d.id);
      if (unreadIds.length > 0) {
        await supabase
          .from("dues_notifications")
          .update({ read_at: new Date().toISOString() })
          .in("id", unreadIds);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("notices")}</h1>

        {!loading && personal.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BellRing className="h-4 w-4 text-primary" />
              {lang === "bn" ? "ব্যক্তিগত বার্তা" : "Personal messages"}
              <span className="text-[10px] font-bold bg-primary/15 text-primary rounded-full px-2 py-0.5">
                {lang === "bn" ? personal.length.toLocaleString("bn-BD") : personal.length}
              </span>
            </h2>
            <div className="grid gap-3">
              {personal.map((n) => (
                <div key={n.id} className="rounded-2xl bg-card border border-primary/30 p-5 shadow-soft">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 bg-primary/15 text-primary">
                      <BellRing className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{n.title}</h3>
                      <NoticeBody text={n.body} lang={lang as "bn" | "en"} className="text-sm text-muted-foreground mt-1.5" />
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(n.created_at).toLocaleString(lang === "bn" ? "bn-BD" : "en-US")}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          {!loading && items.length === 0 && personal.length === 0 && (
            <div className="rounded-2xl bg-card border border-border p-12 text-center text-muted-foreground">{t("noData")}</div>
          )}
          {!loading && items.map((n) => (
            <div key={n.id} className="rounded-2xl bg-card border border-border p-5 shadow-soft flex items-start gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${n.important ? "bg-destructive/15 text-destructive" : "bg-secondary text-primary"}`}>
                {n.important ? <AlertTriangle className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground">{lang === "bn" ? n.title_bn : n.title}</h3>
                  {n.important && <span className="text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-2 py-0.5">{lang === "bn" ? "জরুরি" : "URGENT"}</span>}
                </div>
                <p className="text-sm text-muted-foreground mt-1.5">{lang === "bn" ? n.body_bn : n.body}</p>
                <div className="text-xs text-muted-foreground mt-2">{n.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
