
/**
 * Calculates a helper's payout based on a percentage.
 * Defaults to 50% when no custom rate is provided.
 *
 * @param {number} amountCharged Reference cleaning price.
 * @param {boolean} hasHelper Whether a helper is assigned.
 * @param {number} payoutPercentage Helper's percentage.
 * @return {number} Helper payout.
 */
export function getDefaultHelperPayout(
  amountCharged: number,
  hasHelper: boolean,
  payoutPercentage = 50
): number {
  if (
    !Number.isFinite(amountCharged) ||
    amountCharged <= 0 ||
    !Number.isFinite(payoutPercentage) ||
    payoutPercentage < 0 ||
    payoutPercentage > 100
  ) {
    throw new RangeError("Invalid helper payout values.");
  }

  if (!hasHelper) {
    return 0;
  }

  return Math.round(
    amountCharged * payoutPercentage
  ) / 100;
}
