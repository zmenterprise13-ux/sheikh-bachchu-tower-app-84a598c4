import { useEffect } from "react";
import { useReportPad } from "@/hooks/useReportPad";

/**
 * Applies the configured report pad (letterhead) as the background image of the
 * nearest ancestor matching `targetSelector`. We attach to a real ancestor so
 * the pad sits underneath inner cards (which have their own white backgrounds)
 * by being painted on the page itself, not as an overlay.
 *
 * Default targets the printable wrappers used across reports.
 */
export function ReportPadBackground({
  targetSelector = "#owner-finance-print-inner, #report-printable, .print-area",
}: { targetSelector?: string } = {}) {
  const { settings } = useReportPad();

  useEffect(() => {
    const el = document.querySelector(targetSelector) as HTMLElement | null;
    if (!el) return;
    const prev = {
      backgroundImage: el.style.backgroundImage,
      backgroundRepeat: el.style.backgroundRepeat,
      backgroundPosition: el.style.backgroundPosition,
      backgroundSize: el.style.backgroundSize,
      printColorAdjust: el.style.printColorAdjust,
    };
    if (settings.enabled && settings.url) {
      el.style.backgroundImage = `url("${settings.url}")`;
      el.style.backgroundRepeat = "no-repeat";
      el.style.backgroundPosition = "center top";
      el.style.backgroundSize = "100% 100%";
      el.style.printColorAdjust = "exact";
      (el.style as any).WebkitPrintColorAdjust = "exact";
    } else {
      el.style.backgroundImage = "";
    }
    return () => {
      el.style.backgroundImage = prev.backgroundImage;
      el.style.backgroundRepeat = prev.backgroundRepeat;
      el.style.backgroundPosition = prev.backgroundPosition;
      el.style.backgroundSize = prev.backgroundSize;
      el.style.printColorAdjust = prev.printColorAdjust;
    };
  }, [settings.enabled, settings.url, targetSelector]);

  return null;
}
