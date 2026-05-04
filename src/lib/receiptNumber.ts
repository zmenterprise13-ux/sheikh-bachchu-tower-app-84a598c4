export function formatReceiptNo(seq?: number | null, fallbackId?: string): string {
  if (seq && Number.isFinite(seq)) {
    return `BTW${String(seq).padStart(7, "0")}`;
  }
  // Fallback for any legacy row without a seq
  return `BTW-${(fallbackId ?? "").slice(0, 8).toUpperCase()}`;
}
