/** "$45", or "Free" for 0. */
export function formatFee(cents: number) {
  return cents === 0 ? "Free" : `$${Math.round(cents / 100)}`;
}
