import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangContext";
import { Megaphone, AlertTriangle } from "lucide-react";
import { useTickerSpeed } from "@/hooks/useTickerSpeed";

type Notice = {
  id: string;
  title: string;
  title_bn: string;
  body: string;
  body_bn: string;
  important: boolean;
  date: string;
};

export function NoticeTicker() {
  const { lang } = useLang();
  const [items, setItems] = useState<Notice[]>([]);
  const { speed } = useTickerSpeed();

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("notices")
        .select("id, title, title_bn, body, body_bn, important, date")
        .order("important", { ascending: false })
        .order("date", { ascending: false })
        .limit(15);
      if (active) setItems((data ?? []) as Notice[]);
    })();
    return () => { active = false; };
  }, []);

  if (items.length === 0) return null;

  // duplicate for seamless marquee
  const loop = [...items, ...items];

  return (
    <div className="relative z-10 border-y border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex items-center gap-3 py-2.5">
        <div className="flex items-center gap-2 shrink-0 text-xs font-bold uppercase tracking-wide text-primary">
          <Megaphone className="h-4 w-4" />
          <span>{lang === "bn" ? "নোটিশ" : "Notices"}</span>
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div
            className="flex gap-10 animate-marquee whitespace-nowrap"
            style={{ animationDuration: `${speed}s` }}
          >
            {loop.map((n, idx) => {
              const title = lang === "bn" ? n.title_bn : n.title;
              const body = lang === "bn" ? n.body_bn : n.body;
              return (
                <div key={`${n.id}-${idx}`} className="flex items-center gap-2 text-sm">
                  {n.important && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                  <span className={`font-semibold ${n.important ? "text-destructive" : "text-foreground"}`}>{title}</span>
                  <span className="text-muted-foreground">— {body}</span>
                  <span className="text-muted-foreground/70 text-xs">({n.date})</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
