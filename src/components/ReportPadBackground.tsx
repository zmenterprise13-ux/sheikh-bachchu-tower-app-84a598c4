import { useReportPad } from "@/hooks/useReportPad";

/**
 * Renders the configured report pad (letterhead) as a background image
 * behind the printable report area. Place inside a position:relative parent.
 * The image stretches to cover the parent and prints with color.
 */
export function ReportPadBackground() {
  const { settings } = useReportPad();
  if (!settings.enabled || !settings.url) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 print:block"
      style={{
        backgroundImage: `url(${settings.url})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center top",
        backgroundSize: "100% 100%",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    />
  );
}
