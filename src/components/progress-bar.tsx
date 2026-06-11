interface ProgressBarProps {
  value: number;
  tone?: "primary" | "success" | "warning" | "danger";
}
export function ProgressBar({ value, tone = "primary" }: ProgressBarProps) {
  const color = tone === "success" ? "bg-emerald-500"
    : tone === "warning" ? "bg-amber-500"
    : tone === "danger" ? "bg-red-500"
    : "bg-gradient-to-r from-primary to-accent";
  return (
    <div className="h-1.5 w-full rounded-sm bg-secondary overflow-hidden">
      <div className={`h-full rounded-sm ${color} transition-all`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
