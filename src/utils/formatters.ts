/**
 * Shared formatting utilities.
 */

/**
 * Derived, honest credit availability string.
 * e.g., formatCreditAvailability(250, 20, "scans") => "12 scans left · 20 CR each"
 */
export function formatCreditAvailability(
  walletBalance: number | string | undefined | null,
  costPerAction: number | string | undefined | null,
  label: string
): string {
  if (
    walletBalance === 'Unlimited' ||
    costPerAction === 'Unlimited' ||
    costPerAction === 0
  ) {
    return `Unlimited ${label} left · Free`;
  }

  const bal = typeof walletBalance === 'number' ? walletBalance : Number(walletBalance) || 0;
  const cost = typeof costPerAction === 'number' ? costPerAction : Number(costPerAction) || 1;

  const actionsLeft = Math.floor(bal / cost);
  return `${actionsLeft} ${label} left · ${cost} CR each`;
}
