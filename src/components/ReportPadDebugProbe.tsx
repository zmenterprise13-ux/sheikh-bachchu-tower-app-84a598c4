import { useEffect } from "react";
import { useReportPad } from "@/hooks/useReportPad";

const DEBUG_PARAM = "padDebug";

const getSelector = (el: Element) => {
  if (el.id) return `#${el.id}`;
  const classes = Array.from(el.classList).slice(0, 4).join(".");
  return `${el.tagName.toLowerCase()}${classes ? `.${classes}` : ""}`;
};

export function ReportPadDebugProbe() {
  const { settings } = useReportPad();

  useEffect(() => {
    const enabled = new URLSearchParams(window.location.search).get(DEBUG_PARAM) === "1";
    if (!enabled || !settings.url) return;

    const touched = new Map<HTMLElement, { outline: string; boxShadow: string }>();
    const padFile = decodeURIComponent(settings.url.split("?")[0].split("/").pop() || "");
    const matchesPad = (value: string) =>
      value && value !== "none" && (value.includes(settings.url) || (!!padFile && value.includes(padFile)));

    const scan = () => {
      const suspects = Array.from(document.querySelectorAll<HTMLElement>("body, body *"))
        .map((el) => ({
          el,
          selector: getSelector(el),
          inlineBackground: el.style.backgroundImage,
          computedBackground: window.getComputedStyle(el).backgroundImage,
          rect: el.getBoundingClientRect(),
        }))
        .filter((item) => matchesPad(item.inlineBackground) || matchesPad(item.computedBackground));

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
        el.style.outline = "3px solid hsl(var(--destructive))";
        el.style.boxShadow = "0 0 0 6px hsl(var(--destructive) / 0.2)";
      });

      console.groupCollapsed(`[ReportPadDebug] found ${suspects.length} pad background target(s)`);
      console.table(
        suspects.map(({ selector, inlineBackground, computedBackground, rect }) => ({
          selector,
          inlineBackground,
          computedBackground,
          size: `${Math.round(rect.width)}×${Math.round(rect.height)}`,
          top: Math.round(rect.top),
          left: Math.round(rect.left),
        })),
      );
      console.info("Pad URL:", settings.url);
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
  }, [settings.url]);

  return null;
}