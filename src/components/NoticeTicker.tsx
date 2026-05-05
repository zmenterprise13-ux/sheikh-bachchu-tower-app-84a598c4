import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangContext";
import { Megaphone, AlertTriangle, Pause, Play } from "lucide-react";
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
  const [paused, setPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const { speed, direction } = useTickerSpeed();
  const regionRef = useRef<HTMLElement>(null);
  const seenIdsRef = useRef<Set<string> | null>(null);
  const announceTimerRef = useRef<number | null>(null);

  const announceNewNotices = (incoming: Notice[]) => {
    const seen = seenIdsRef.current;
    // First load — record ids but don't announce (avoid noise on page open).
    if (!seen) {
      seenIdsRef.current = new Set(incoming.map((n) => n.id));
      return;
    }
    const fresh = incoming.filter((n) => !seen.has(n.id));
    if (fresh.length === 0) return;
    fresh.forEach((n) => seen.add(n.id));

    const importantLabel = lang === "bn" ? "জরুরি" : "Important";
    const newLabel =
      lang === "bn"
        ? fresh.length === 1
          ? "নতুন নোটিশ"
          : `${fresh.length}টি নতুন নোটিশ`
        : fresh.length === 1
          ? "New notice"
          : `${fresh.length} new notices`;
    const lines = fresh.map((n) => {
      const title = lang === "bn" ? n.title_bn : n.title;
      const body = lang === "bn" ? n.body_bn : n.body;
      return `${n.important ? `${importantLabel}: ` : ""}${title} — ${body}`;
    });
    const message = `${newLabel}. ${lines.join(". ")}`;

    // Toggle to empty first so AT re-announces when text repeats.
    setAnnouncement("");
    if (announceTimerRef.current) window.clearTimeout(announceTimerRef.current);
    announceTimerRef.current = window.setTimeout(() => setAnnouncement(message), 60);
  };

  const fetchNotices = async () => {
    const { data } = await supabase
      .from("notices")
      .select("id, title, title_bn, body, body_bn, important, date")
      .order("important", { ascending: false })
      .order("date", { ascending: false })
      .limit(15);
    const next = (data ?? []) as Notice[];
    setItems(next);
    announceNewNotices(next);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      if (!active) return;
      await fetchNotices();
    })();

    // Realtime: re-fetch whenever notices change so new entries are announced.
    const channel = supabase
      .channel("notice-ticker")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notices" },
        () => { if (active) fetchNotices(); },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
      if (announceTimerRef.current) window.clearTimeout(announceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Respect prefers-reduced-motion: pause by default for those users.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setPrefersReducedMotion(mq.matches);
      if (mq.matches) setPaused(true);
    };
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  if (items.length === 0) return null;

  // duplicate for seamless marquee
  const loop = [...items, ...items];

  const labels = {
    region: lang === "bn" ? "সাম্প্রতিক নোটিশ" : "Latest notices",
    pause: lang === "bn" ? "বিরতি দিন" : "Pause notices",
    play: lang === "bn" ? "চালু করুন" : "Play notices",
    important: lang === "bn" ? "জরুরি" : "Important",
    keyboardHint:
      lang === "bn"
        ? "স্পেস বা K চাপুন বিরতি/চালুর জন্য, এস্কেপ চাপলে থামবে"
        : "Press Space or K to toggle pause, Escape to pause",
  };
  const toggleLabel = paused ? labels.play : labels.pause;

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    // Don't hijack typing in inputs nested anywhere.
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, select, [contenteditable='true']")) return;
    if (e.key === " " || e.key.toLowerCase() === "k") {
      e.preventDefault();
      setPaused((p) => !p);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setPaused(true);
    }
  };

  return (
    <section
      ref={regionRef}
      role="region"
      aria-label={labels.region}
      aria-roledescription={lang === "bn" ? "নোটিশ স্ক্রলার" : "notice ticker"}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onFocus={() => setPaused(true)}
      className="relative z-10 border-y border-border bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/65 shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
    >
      {/* Keyboard usage hint for screen readers */}
      <span className="sr-only">{labels.keyboardHint}.</span>

      {/* Live region: announces new notices to screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-relevant="additions text"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Accessible, static list of notices for assistive tech */}
      <ul className="sr-only" aria-label={labels.region}>
        {items.map((n) => {
          const title = lang === "bn" ? n.title_bn : n.title;
          const body = lang === "bn" ? n.body_bn : n.body;
          return (
            <li key={n.id}>
              {n.important ? `${labels.important}: ` : ""}
              {title} — {body} ({n.date})
            </li>
          );
        })}
      </ul>

      <div className="container flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-1.5 sm:py-2.5">
        <div
          className="flex items-center gap-1.5 sm:gap-2 shrink-0 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-primary"
          aria-hidden="true"
        >
          <Megaphone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline sm:inline">{lang === "bn" ? "নোটিশ" : "Notices"}</span>
        </div>

        {/* Visual marquee — hidden from assistive tech (the sr-only list above is the source of truth) */}
        <div
          className="relative flex-1 min-w-0 overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => !prefersReducedMotion && setPaused(false)}
          aria-hidden="true"
        >
          <div
            className="flex gap-6 sm:gap-10 animate-marquee whitespace-nowrap motion-reduce:animate-none"
            style={{
              animationDuration: `${speed}s`,
              animationPlayState: paused ? "paused" : "running",
            }}
          >
            {loop.map((n, idx) => {
              const title = lang === "bn" ? n.title_bn : n.title;
              const body = lang === "bn" ? n.body_bn : n.body;
              return (
                <div key={`${n.id}-${idx}`} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm shrink-0">
                  {n.important && <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-destructive shrink-0" />}
                  <span className={`font-semibold ${n.important ? "text-destructive" : "text-foreground"}`}>{title}</span>
                  <span className="text-muted-foreground">— {body}</span>
                  <span className="hidden sm:inline text-muted-foreground/70 text-xs">({n.date})</span>
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={toggleLabel}
          aria-pressed={paused}
          aria-controls="notice-ticker-marquee"
          title={toggleLabel}
          className="shrink-0 inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-border bg-background/60 text-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        >
          {paused
            ? <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            : <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />}
        </button>
      </div>
    </section>
  );
}
