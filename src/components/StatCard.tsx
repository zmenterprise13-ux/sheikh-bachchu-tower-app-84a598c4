import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  variant?: "default" | "primary" | "success" | "warning" | "destructive";
}

const variants = {
  default: "bg-card text-foreground",
  primary: "gradient-primary text-primary-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  destructive: "bg-destructive text-destructive-foreground",
};

export function StatCard({ label, value, hint, icon: Icon, variant = "default" }: StatCardProps) {
  const isColored = variant !== "default";
  return (
    <div className={cn(
      "rounded-2xl border border-border p-5 shadow-soft hover:shadow-elegant transition-smooth",
      variants[variant]
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={cn("text-xs font-medium uppercase tracking-wide", isColored ? "opacity-90" : "text-muted-foreground")}>
            {label}
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold leading-tight truncate">{value}</div>
          {hint && (
            <div className={cn("mt-1 text-xs", isColored ? "opacity-80" : "text-muted-foreground")}>
              {hint}
            </div>
          )}
        </div>
        <div className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          isColored ? "bg-white/20" : "bg-secondary"
        )}>
          <Icon className={cn("h-5 w-5", isColored ? "" : "text-primary")} />
        </div>
      </div>
    </div>
  );
}
