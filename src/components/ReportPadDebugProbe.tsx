import { useEffect, useState } from "react";
import { useReportPad } from "@/hooks/useReportPad";

const DEBUG_PARAM = "padDebug";
const DEBUG_STORAGE_KEY = "report_pad_debug";

type DebugRow = {
  selector: string;
  inlineBackground: string;
  computedBackground?: string;
  size: string;
  top: number;
  left: number;
};

const getSelector = (el: Element) => {
  if (el.id) return `#${el.id}`;
  const classes = Array.from(el.classList).slice(0, 4).join(".");
  return `${el.tagName.toLowerCase()}${classes ? `.${classes}` : ""}`;
};

export function ReportPadDebugProbe() {
  const { settings } = useReportPad();
  const [debugEnabled, setDebugEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    const param = new URLSearchParams(window.location.search).get(DEBUG_PARAM);
    return param === "1" || (param !== "0" && window.sessionStorage.getItem(DEBUG_STORAGE_KEY) === "1");
  });
  const [summary, setSummary] = useState<{ suspects: DebugRow[]; candidates: DebugRow[]; backgrounds: number }>({
    suspects: [],
    candidates: [],
    backgrounds: 0,
  });

  useEffect(() => {
    const syncDebugFlag = () => {
      const param = new URLSearchParams(window.location.search).get(DEBUG_PARAM);
      if (param === "1") {
        window.sessionStorage.setItem(DEBUG_STORAGE_KEY, "1");
        setDebugEnabled(true);
      } else if (param === "0") {
        window.sessionStorage.removeItem(DEBUG_STORAGE_KEY);
        setDebugEnabled(false);
      }
    };
    syncDebugFlag();
    window.addEventListener("popstate", syncDebugFlag);
    return () => window.removeEventListener("popstate", syncDebugFlag);
  }, []);

  useEffect(() => {
    if (!debugEnabled) return;

    const touched = new Map<HTMLElement, { outline: string; boxShadow: string }>();
    const padFile = settings.url ? decodeURIComponent(settings.url.split("?")[0].split("/").pop() || "") : "";
    const matchesPad = (value: string) =>
      value && value !== "none" && ((!!settings.url && value.includes(settings.url)) || (!!padFile && value.includes(padFile)));

    const scan = () => {
      const allBackgrounds = Array.from(document.querySelectorAll<HTMLElement>("body, body *"))
        .map((el) => ({
          el,
          selector: getSelector(el),
          inlineBackground: el.style.backgroundImage,
          computedBackground: window.getComputedStyle(el).backgroundImage,
          rect: el.getBoundingClientRect(),
        }))
        .filter((item) => item.inlineBackground || (item.computedBackground && item.computedBackground !== "none"));
      const suspects = allBackgrounds
        .filter((item) => matchesPad(item.inlineBackground) || matchesPad(item.computedBackground));
      const candidates = Array.from(document.querySelectorAll<HTMLElement>("#owner-finance-print-inner, #report-printable, .print-area"))
        .map((el) => ({ selector: getSelector(el), rect: el.getBoundingClientRect(), inlineBackground: el.style.backgroundImage }));
      const suspectRows = suspects.map(({ selector, inlineBackground, computedBackground, rect }) => ({
        selector,
        inlineBackground,
        computedBackground,
        size: `${Math.round(rect.width)}×${Math.round(rect.height)}`,
        top: Math.round(rect.top),
        left: Math.round(rect.left),
      }));
      const candidateRows = candidates.map(({ selector, rect, inlineBackground }) => ({
        selector,
        inlineBackground,
        size: `${Math.round(rect.width)}×${Math.round(rect.height)}`,
        top: Math.round(rect.top),
        left: Math.round(rect.left),
      }));

      setSummary({ suspects: suspectRows, candidates: candidateRows, backgrounds: allBackgrounds.length });

      touched.forEach((style, el) => {
        if (!suspects.some((item) => item.el === el)) {
          el.style.outline = style.outline;
          el.style.boxShadow = style.boxShadow;
          touched.delete(el);
        }
      });

      suspects.forEach(({ el }) => {
        if (!touched.has(el)) {
          touched.set(el, { outline: el.style.outline, boxShadow: el.style.boxShadow });
        }
        if (el.style.outline !== "3px solid hsl(var(--destructive))") el.style.outline = "3px solid hsl(var(--destructive))";
        if (el.style.boxShadow !== "0 0 0 6px hsl(var(--destructive) / 0.2)") el.style.boxShadow = "0 0 0 6px hsl(var(--destructive) / 0.2)";
      });

      console.groupCollapsed(`[ReportPadDebug] found ${suspects.length} pad background target(s)`);
      console.info("Pad settings:", settings);
      console.table(suspectRows);
      console.table(candidateRows);
      console.table(allBackgrounds.slice(0, 30).map(({ selector, inlineBackground, computedBackground }) => ({ selector, inlineBackground, computedBackground })));
      console.info("To disable this overlay, remove ?padDebug=1 from the URL.");
      console.groupEnd();
    };

    (window as any).__debugReportPad = scan;
    scan();

    const observer = new MutationObserver(scan);
    observer.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ["style", "class"] });
    window.addEventListener("focus", scan);
    window.addEventListener("pageshow", scan);

    return () => {
      observer.disconnect();
      window.removeEventListener("focus", scan);
      window.removeEventListener("pageshow", scan);
      touched.forEach((style, el) => {
        el.style.outline = style.outline;
        el.style.boxShadow = style.boxShadow;
      });
      delete (window as any).__debugReportPad;
    };
  }, [debugEnabled, settings, settings.url]);

  if (!debugEnabled) return null;

  return (
    <div className="fixed bottom-3 right-3 z-[9999] w-[min(92vw,440px)] rounded-lg border border-border bg-card p-3 text-card-foreground shadow-lg print:hidden">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Report pad debug</div>
        <div className="text-xs text-muted-foreground">?padDebug=1</div>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <div>Pad: {settings.enabled ? "enabled" : "disabled"} · URL: {settings.url ? "loaded" : "missing"}</div>
        <div>Suspects: {summary.suspects.length} · Candidates: {summary.candidates.length} · Backgrounds: {summary.backgrounds}</div>
        <div className="font-medium text-foreground">Suspect elements</div>
        {summary.suspects.length ? summary.suspects.map((row) => (
          <div key={`${row.selector}-${row.top}-${row.left}`} className="rounded border border-destructive/30 p-2 text-destructive">
            {row.selector} · {row.size} · top {row.top}
          </div>
        )) : <div className="rounded border border-border p-2">No pad background found on screen.</div>}
        <div className="pt-1 font-medium text-foreground">Print candidates</div>
        {summary.candidates.slice(0, 4).map((row) => (
          <div key={`${row.selector}-${row.top}-${row.left}`} className="rounded border border-border p-2">
            {row.selector} · {row.size} · bg {row.inlineBackground ? "inline" : "none"}
          </div>
        ))}
      </div>
    </div>
  );
}