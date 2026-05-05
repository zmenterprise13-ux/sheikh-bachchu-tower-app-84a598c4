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

    const apply = () => {
      const el = findEl();
      if (!el) return;
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
    };

    const restore = () => {
      const el = findEl();
      if (!el || !prev) return;
      el.style.backgroundImage = prev.backgroundImage;
      el.style.backgroundRepeat = prev.backgroundRepeat;
      el.style.backgroundPosition = prev.backgroundPosition;
      el.style.backgroundSize = prev.backgroundSize;
      el.style.printColorAdjust = prev.printColorAdjust;
      (el.style as any).WebkitPrintColorAdjust = prev.WebkitPrintColorAdjust;
      prev = null;
    };

    const mql = window.matchMedia("print");
    const onChange = (e: MediaQueryListEvent) => (e.matches ? apply() : restore());

    window.addEventListener("beforeprint", apply);
    window.addEventListener("afterprint", restore);
    mql.addEventListener?.("change", onChange);

    return () => {
      window.removeEventListener("beforeprint", apply);
      window.removeEventListener("afterprint", restore);
      mql.removeEventListener?.("change", onChange);
      restore();
    };
  }, [settings.enabled, settings.url, targetSelector]);

  return null;
}
