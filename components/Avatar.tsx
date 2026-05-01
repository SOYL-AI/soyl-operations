import { avatarUrl, initialsOf, cn } from "@/lib/utils";

export function Avatar({
  name,
  src,
  size = 32,
  className,
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={src || avatarUrl(name || "soyl")}
      alt={initialsOf(name)}
      width={size}
      height={size}
      className={cn("rounded-lg bg-ink-700 ring-1 ring-white/10", className)}
      style={{ width: size, height: size }}
    />
  );
}
