import { cn } from "@/lib/utils";
import { useLang } from "@/i18n/LangContext";
import { FlatStatus } from "@/data/mockData";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";

const map: Record<FlatStatus, { cls: string; icon: typeof CheckCircle2; key: "paid"|"unpaid"|"partial" }> = {
  paid:    { cls: "bg-success/15 text-success border-success/30",       icon: CheckCircle2, key: "paid" },
  unpaid:  { cls: "bg-destructive/15 text-destructive border-destructive/30", icon: AlertCircle,  key: "unpaid" },
  partial: { cls: "bg-warning/15 text-warning-foreground border-warning/40",  icon: Clock,        key: "partial" },
};

export function StatusBadge({ status }: { status: FlatStatus }) {
  const { t } = useLang();
  const cfg = map[status];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold", cfg.cls)}>
      <Icon className="h-3 w-3" />
      {t(cfg.key)}
    </span>
  );
}
