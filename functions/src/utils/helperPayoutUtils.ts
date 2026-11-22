/**
 * Calculates the default payout for a helper.
 * The helper receives half of the reference cleaning price.
 * @param {number} amountCharged Reference cleaning price.
 * @param {boolean} hasHelper Whether a helper is assigned.
 * @return {number} Helper payout.
 */
export function getDefaultHelperPayout(
  amountCharged: number,
  hasHelper: boolean
): number {
  if (
    !hasHelper ||
    !Number.isFinite(amountCharged) ||
    amountCharged <= 0
  ) {
    return 0;
  }

  return amountCharged / 2;
}
