import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("card card-pad text-center", className)}>
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-mint/10 text-mint border border-mint/25">
        <Inbox className="h-5 w-5" />
      </div>
      <h3 className="font-display text-bone mt-4">{title}</h3>
      {body && <p className="mt-1 text-sm text-bone-300/70">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
