// Generate up to 2 initials from a name or email-like string.
export function getInitials(input?: string | null): string {
  if (!input) return "?";
  const cleaned = input.trim();
  if (!cleaned) return "?";
  // If it looks like an email, use the local part.
  const base = cleaned.includes("@") ? cleaned.split("@")[0] : cleaned;
  const parts = base
    .replace(/[._-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const p = parts[0];
    return (p.length >= 2 ? p.slice(0, 2) : p).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic gradient class pair from a string seed.
const GRADIENTS = [
  "from-sky-400 to-blue-600",
  "from-violet-400 to-fuchsia-600",
  "from-emerald-400 to-teal-600",
  "from-amber-400 to-orange-600",
  "from-rose-400 to-pink-600",
  "from-indigo-400 to-purple-600",
  "from-cyan-400 to-sky-600",
  "from-lime-400 to-emerald-600",
];

export function getAvatarGradient(seed?: string | null): string {
  const s = (seed ?? "").trim() || "x";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}
