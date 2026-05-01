import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function Kpi({
  label,
  value,
  delta,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  delta?: number;
  hint?: string;
  className?: string;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className={cn("card card-pad", className)}>
      <div className="stat-label">{label}</div>
      <div className="mt-2 flex items-baseline gap-3">
        <div className="stat-num">{value}</div>
        {typeof delta === "number" && (
          <span className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs",
            positive ? "bg-mint/15 text-mint" : "bg-red-500/10 text-red-300",
          )}>
            {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(delta).toFixed(0)}%
          </span>
        )}
      </div>
      {hint && <div className="mt-1 text-xs text-bone-300/60">{hint}</div>}
    </div>
  );
}
