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
    <div className="relative z-10 border-y border-border bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/65 shadow-soft">
      <div className="container flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-1.5 sm:py-2.5">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-primary">
          <Megaphone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline sm:inline">{lang === "bn" ? "নোটিশ" : "Notices"}</span>
        </div>
        <div className="relative flex-1 min-w-0 overflow-hidden">
          <div
            className="flex gap-6 sm:gap-10 animate-marquee whitespace-nowrap"
            style={{ animationDuration: `${speed}s` }}
          >
            {loop.map((n, idx) => {
              const title = lang === "bn" ? n.title_bn : n.title;
              const body = lang === "bn" ? n.body_bn : n.body;
              return (
                <div key={`${n.id}-${idx}`} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                  {n.important && <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-destructive shrink-0" />}
                  <span className={`font-semibold ${n.important ? "text-destructive" : "text-foreground"}`}>{title}</span>
                  <span className="text-muted-foreground">— {body}</span>
                  <span className="hidden sm:inline text-muted-foreground/70 text-xs">({n.date})</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
