import { cn } from "@/lib/utils";

type NexusFlowBrandProps = {
  className?: string;
  markClassName?: string;
  showSubtitle?: boolean;
  wordmarkClassName?: string;
};

export function NexusFlowBrand({
  className,
  markClassName,
  showSubtitle = true,
  wordmarkClassName,
}: NexusFlowBrandProps) {
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <svg
        aria-hidden="true"
        className={cn("landing-logo-glow h-11 w-11 shrink-0", markClassName)}
        viewBox="0 0 64 64"
        fill="none"
      >
        <defs>
          <linearGradient id="nexusflow-brand-gradient" x1="8" y1="10" x2="54" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F4C186" />
            <stop offset="45%" stopColor="#D79A69" />
            <stop offset="100%" stopColor="#B7774A" />
          </linearGradient>
        </defs>

        <rect
          x="6"
          y="6"
          width="52"
          height="52"
          rx="16"
          stroke="url(#nexusflow-brand-gradient)"
          strokeOpacity="0.9"
          strokeWidth="1.5"
        />

        <path
          d="M17 45V19L32 33L47 19V45"
          stroke="url(#nexusflow-brand-gradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17 45L32 33L47 45"
          stroke="url(#nexusflow-brand-gradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M23 24H17M47 24H41M32 33V40"
          stroke="url(#nexusflow-brand-gradient)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {[
          { cx: 17, cy: 19 },
          { cx: 32, cy: 33 },
          { cx: 47, cy: 19 },
          { cx: 17, cy: 45 },
          { cx: 47, cy: 45 },
        ].map((node) => (
          <circle
            key={`${node.cx}-${node.cy}`}
            cx={node.cx}
            cy={node.cy}
            r="2.8"
            fill="#0B0D10"
            stroke="url(#nexusflow-brand-gradient)"
            strokeWidth="2"
          />
        ))}
      </svg>

      <div className={cn("min-w-0", wordmarkClassName)}>
        <div className="landing-display text-lg font-semibold uppercase tracking-[0.22em] text-white">
          NexusFlow
        </div>
        {showSubtitle ? (
          <div className="text-[10px] uppercase tracking-[0.28em] text-white/45">
            Project Lifecycle Management
          </div>
        ) : null}
      </div>
    </div>
  );
}
