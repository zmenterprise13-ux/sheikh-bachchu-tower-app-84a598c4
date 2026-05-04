import { AvatarFallback } from "@/components/ui/avatar";
import { getAvatarGradient, getInitials } from "@/lib/avatar";
import { cn } from "@/lib/utils";

type Props = {
  name?: string | null;
  seed?: string | null;
  className?: string;
};

/**
 * A polished default avatar fallback: shows up to 2 initials over a
 * deterministic gradient background, with a soft inner highlight.
 */
export function InitialsFallback({ name, seed, className }: Props) {
  const initials = getInitials(name ?? seed);
  const gradient = getAvatarGradient(seed ?? name);
  return (
    <AvatarFallback
      className={cn(
        "relative bg-gradient-to-br text-white font-semibold tracking-wide select-none",
        gradient,
        className
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent"
      />
      <span className="relative drop-shadow-sm">{initials}</span>
    </AvatarFallback>
  );
}
