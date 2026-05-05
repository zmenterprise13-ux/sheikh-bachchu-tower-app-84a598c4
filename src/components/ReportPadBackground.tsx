import { useEffect } from "react";
import { useReportPad } from "@/hooks/useReportPad";

/**
 * Applies the configured report pad (letterhead) as the background image of the
 * nearest ancestor matching `targetSelector` ONLY while printing. The pad must
 * never appear on screen (dashboard/system UI) — only on the printed page / PDF.
 */
export function ReportPadBackground({
  targetSelector = "#owner-finance-print-inner, #report-printable, .print-area",
}: { targetSelector?: string } = {}) {
  const { settings } = useReportPad();

  useEffect(() => {
    if (!settings.enabled || !settings.url) return;

    const findEl = () =>
      document.querySelector(targetSelector) as HTMLElement | null;

    let prev: Record<string, string> | null = null;
    let appliedEl: HTMLElement | null = null;

    const isPrintMode = () => window.matchMedia("print").matches;

    const scrubScreenPad = () => {
      if (isPrintMode()) return;
      const el = findEl();
      if (!el) return;
      if (el.style.backgroundImage.includes(settings.url)) {
        el.style.backgroundImage = "";
        el.style.backgroundRepeat = "";
        el.style.backgroundPosition = "";
        el.style.backgroundSize = "";
        el.style.printColorAdjust = "";
        (el.style as any).WebkitPrintColorAdjust = "";
      }
    };

    const apply = () => {
      const el = findEl();
      if (!el) return;
      if (appliedEl === el && prev) return;
      prev = {
        backgroundImage: el.style.backgroundImage,
        backgroundRepeat: el.style.backgroundRepeat,
        backgroundPosition: el.style.backgroundPosition,
        backgroundSize: el.style.backgroundSize,
        printColorAdjust: el.style.printColorAdjust,
        WebkitPrintColorAdjust: (el.style as any).WebkitPrintColorAdjust || "",
      };
      el.style.backgroundImage = `url("${settings.url}")`;
      el.style.backgroundRepeat = "no-repeat";
      el.style.backgroundPosition = "center top";
      el.style.backgroundSize = "100% 100%";
      el.style.printColorAdjust = "exact";
      (el.style as any).WebkitPrintColorAdjust = "exact";
      appliedEl = el;
    };

    const restore = () => {
      const el = appliedEl || findEl();
      if (!el) return;
      if (!prev) {
        scrubScreenPad();
        return;
      }
      el.style.backgroundImage = prev.backgroundImage;
      el.style.backgroundRepeat = prev.backgroundRepeat;
      el.style.backgroundPosition = prev.backgroundPosition;
      el.style.backgroundSize = prev.backgroundSize;
      el.style.printColorAdjust = prev.printColorAdjust;
      (el.style as any).WebkitPrintColorAdjust = prev.WebkitPrintColorAdjust;
      prev = null;
      appliedEl = null;
      scrubScreenPad();
    };

    const mql = window.matchMedia("print");
    const onChange = (e: MediaQueryListEvent) => (e.matches ? apply() : restore());
    const onScreenReturn = () => {
      if (!isPrintMode()) restore();
    };

    scrubScreenPad();

    window.addEventListener("beforeprint", apply);
    window.addEventListener("afterprint", restore);
    window.addEventListener("focus", onScreenReturn);
    window.addEventListener("pageshow", onScreenReturn);
    document.addEventListener("visibilitychange", onScreenReturn);
    mql.addEventListener?.("change", onChange);

    return () => {
      window.removeEventListener("beforeprint", apply);
      window.removeEventListener("afterprint", restore);
      window.removeEventListener("focus", onScreenReturn);
      window.removeEventListener("pageshow", onScreenReturn);
      document.removeEventListener("visibilitychange", onScreenReturn);
      mql.removeEventListener?.("change", onChange);
      restore();
    };
  }, [settings.enabled, settings.url, targetSelector]);

  return null;
}
