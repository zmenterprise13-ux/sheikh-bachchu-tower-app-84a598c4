import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { Megaphone, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Notice = {
  id: string;
  title: string;
  title_bn: string;
  body: string;
  body_bn: string;
  important: boolean;
  date: string;
};

export default function OwnerNotices() {
  const { t, lang } = useLang();
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("notices")
        .select("id, title, title_bn, body, body_bn, important, date")
        .order("date", { ascending: false });
      if (error) toast.error(error.message);
      setItems((data ?? []) as Notice[]);
      setLoading(false);
    })();
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("notices")}</h1>
        <div className="grid gap-4">
          {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          {!loading && items.length === 0 && (
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
