import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileBarChart } from "lucide-react";
import { MonthlyFinanceSummary } from "@/components/MonthlyFinanceSummary";
import { PublishedDetailedReport } from "@/components/PublishedDetailedReport";
import { useOwnerReportStyle } from "@/hooks/useOwnerReportStyle";

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

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
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
        </div>

        {style === "detailed" ? (
          <PublishedDetailedReport month={month} />
        ) : (
          <MonthlyFinanceSummary
            month={month}
            variant="owner"
            title={lang === "bn" ? "আয়-ব্যয়ের হিসাব" : "Income & Expense Summary"}
          />
        )}
      </div>
    </AppShell>
  );
}
