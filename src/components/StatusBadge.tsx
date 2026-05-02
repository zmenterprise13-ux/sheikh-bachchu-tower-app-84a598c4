import { cn } from "@/lib/utils";
import { useLang } from "@/i18n/LangContext";
import { CheckCircle2, AlertCircle, Clock, FileCheck2, XCircle } from "lucide-react";

export type FlatStatus = "paid" | "unpaid" | "partial";
export type GenerationStatus = "generated" | "failed";

const map: Record<FlatStatus, { cls: string; icon: typeof CheckCircle2; key: "paid" | "unpaid" | "partial" }> = {
  paid:    { cls: "bg-success/15 text-success border-success/30",       icon: CheckCircle2, key: "paid" },
  unpaid:  { cls: "bg-destructive/15 text-destructive border-destructive/30", icon: AlertCircle,  key: "unpaid" },
  partial: { cls: "bg-warning/15 text-warning-foreground border-warning/40",  icon: Clock,        key: "partial" },
};

const genMap: Record<GenerationStatus, { cls: string; icon: typeof CheckCircle2; key: "generated" | "failed" }> = {
  generated: { cls: "bg-primary/10 text-primary border-primary/30",             icon: FileCheck2, key: "generated" },
  failed:    { cls: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle,    key: "failed" },
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

export function GenerationBadge({ status }: { status: GenerationStatus }) {
  const { t } = useLang();
  const cfg = genMap[status];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold", cfg.cls)}>
      <Icon className="h-3 w-3" />
      {t(cfg.key)}
    </span>
  );
}

export function CombinedBillStatus({
  generation,
  payment,
}: { generation: GenerationStatus; payment: FlatStatus }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <GenerationBadge status={generation} />
      <StatusBadge status={payment} />
    </span>
  );
}
