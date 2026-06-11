import type { ReactNode } from "react";

type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "primary";

const map: Record<Tone, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/20",
  danger: "bg-red-50 text-red-700 ring-red-600/15",
  info: "bg-sky-50 text-sky-700 ring-sky-600/15",
  neutral: "bg-stone-100 text-stone-700 ring-stone-600/10",
  primary: "bg-primary/10 text-primary ring-primary/20",
};

export function StatusChip({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ring-1 ring-inset ${map[tone]}`}>
      <span className={`size-1.5 rounded-full ${
        tone === "success" ? "bg-emerald-500" :
        tone === "warning" ? "bg-amber-500" :
        tone === "danger" ? "bg-red-500" :
        tone === "info" ? "bg-sky-500" :
        tone === "primary" ? "bg-primary" : "bg-stone-400"
      }`} />
      {children}
    </span>
  );
}

export function statusTone(status: string): Tone {
  const s = status.toLowerCase();
  if (s.includes("track") || s === "approved" || s === "paid" || s === "completed") return "success";
  if (s.includes("risk") || s === "pending" || s === "mitigating" || s === "monitoring") return "warning";
  if (s.includes("delay") || s === "overdue" || s === "rejected" || s === "open" || s === "critical" || s === "high") return "danger";
  if (s === "draft" || s === "bench") return "neutral";
  return "info";
}
