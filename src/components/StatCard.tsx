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
      "group relative overflow-hidden rounded-2xl border border-border p-5 shadow-soft transition-all duration-300",
      "hover:shadow-elegant hover:-translate-y-0.5",
      variants[variant]
    )}>
      <div className={cn(
        "pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500",
        isColored ? "bg-white/30" : "bg-primary/20"
      )} />
      <div className="relative flex items-start justify-between gap-3">
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
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
          isColored ? "bg-white/20" : "bg-secondary"
        )}>
          <Icon className={cn("h-5 w-5", isColored ? "" : "text-primary")} />
        </div>
      </div>
    </div>
  );
}
