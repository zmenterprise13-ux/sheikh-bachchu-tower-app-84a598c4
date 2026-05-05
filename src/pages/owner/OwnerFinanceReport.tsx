import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileBarChart, Printer } from "lucide-react";
import { MonthlyFinanceSummary } from "@/components/MonthlyFinanceSummary";
import { PublishedSpreadsheetReport } from "@/components/PublishedSpreadsheetReport";
import { useOwnerReportStyle } from "@/hooks/useOwnerReportStyle";
import { ReportPadBackground } from "@/components/ReportPadBackground";

const currentMonth = () => new Date().toISOString().slice(0, 7);
const STORAGE_KEY = "owner_finance_report_month";

export default function OwnerFinanceReport() {
  const { lang } = useLang();
  const { style } = useOwnerReportStyle();
  const [month, setMonth] = useState<string>(() => {
    if (typeof window === "undefined") return currentMonth();
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved && /^\d{4}-\d{2}$/.test(saved) ? saved : currentMonth();
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, month);
  }, [month]);

  const handlePrint = () => {
    const el = document.getElementById("owner-finance-print");
    const inner = document.getElementById("owner-finance-print-inner");
    if (el && inner) {
      // Force print-like layout so we measure the actual print height, not screen height.
      document.body.classList.add("print-measuring");
      el.style.setProperty("--print-scale", "1");
      // A4 usable area at 96dpi after 10mm page margins ≈ 718 × 1047 px.
      const usableW = 718;
      const usableH = 1047;
      // Force inner to A4 content width during measurement.
      inner.style.width = `${usableW}px`;
      // Defer measurement so styles apply.
      requestAnimationFrame(() => {
        const naturalH = inner.scrollHeight;
        const naturalW = inner.scrollWidth;
        const scale = Math.min(1, usableH / naturalH, usableW / naturalW);
        el.style.setProperty("--print-scale", String(scale));
        // Reserve only the scaled box size on the outer wrapper so the
        // printed layout consumes a single page (transform doesn't shrink layout box).
        el.style.height = `${Math.ceil(naturalH * scale)}px`;
        el.style.width = `${Math.ceil(naturalW * scale)}px`;
        el.style.overflow = "hidden";
        document.body.classList.remove("print-measuring");
        setTimeout(() => {
          window.print();
          setTimeout(() => {
            el.style.removeProperty("--print-scale");
            el.style.removeProperty("height");
            el.style.removeProperty("width");
            el.style.removeProperty("overflow");
            inner.style.removeProperty("width");
          }, 800);
        }, 80);
      });
    } else {
      window.print();
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 print:hidden">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <FileBarChart className="h-6 w-6 text-primary" />
              {lang === "bn" ? "মাসিক আয়-ব্যয় রিপোর্ট" : "Monthly Income & Expense Report"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {lang === "bn"
                ? "প্রকাশিত মাসিক আয় ও ব্যয়ের সারসংক্ষেপ।"
                : "Published monthly income and expense summary."}
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                {lang === "bn" ? "মাস" : "Month"}
              </Label>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-44"
              />
            </div>
            <Button onClick={handlePrint} variant="outline" size="sm" className="gap-1.5">
              <Printer className="h-4 w-4" />
              {lang === "bn" ? "প্রিন্ট / পিডিএফ" : "Print / PDF"}
            </Button>
          </div>
        </div>

        <div className="print-area print-fit-one-page" id="owner-finance-print">
          <div id="owner-finance-print-inner" className="relative isolate">
          <ReportPadBackground />
          <div className="hidden print:block text-center mb-4 pb-3 border-b-2 border-black">
            <h1 className="report-header-title text-2xl font-extrabold">
              {lang === "bn" ? "শেখ বাচ্চু টাওয়ার সোসাইটি" : "Sheikh Bachchu Tower Society"}
            </h1>
            <p className="text-xs text-black mt-1">
              {lang === "bn"
                ? "১৪/২, শেখ বাচ্চু টাওয়ার, মোক্তারবাড়ী রোড, আউচপাড়া, টঙ্গী, গাজীপুর।"
                : "14/2, Sheikh Bachchu Tower, Moktarbari Road, Auchpara, Tongi, Gazipur."}
            </p>
          </div>
          {style === "detailed" ? (
            <PublishedSpreadsheetReport month={month} />
          ) : (
            <MonthlyFinanceSummary
              month={month}
              variant="owner"
              title={lang === "bn" ? "আয়-ব্যয়ের হিসাব" : "Income & Expense Summary"}
            />
          )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
