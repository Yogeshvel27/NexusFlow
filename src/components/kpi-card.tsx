import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  delta?: number;
  hint?: string;
  icon?: ReactNode;
  accent?: "primary" | "success" | "warning" | "danger" | "muted";
}

const accentClass = {
  primary: "from-primary/15 to-accent/10 text-primary",
  success: "from-emerald-500/15 to-emerald-500/5 text-emerald-600",
  warning: "from-amber-500/15 to-amber-500/5 text-amber-600",
  danger: "from-red-500/15 to-red-500/5 text-red-600",
  muted: "from-stone-200/60 to-stone-100/40 text-stone-600",
};

export function KpiCard({ label, value, delta, hint, icon, accent = "primary" }: KpiCardProps) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="group relative bg-card border border-border rounded-2xl p-5 shadow-card hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        {icon && (
          <div className={`size-9 rounded-xl bg-gradient-to-br ${accentClass[accent]} grid place-items-center`}>
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-foreground tabular-nums">{value}</div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta !== undefined && (
          <span className={`inline-flex items-center gap-1 font-medium ${positive ? "text-emerald-600" : "text-red-600"}`}>
            {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {positive ? "+" : ""}{delta}%
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
