import type {PaymentSummary} from "../types/business";

/**
 * Returns the date used for financial reporting.
 * Biweekly payments use the end of their 14-day period.
 * Per-cleaning and legacy payments use the cleaning date.
 * @param {PaymentSummary} payment Payment record.
 * @return {string} Reference date as YYYY-MM-DD when available.
 */
export function getPaymentReferenceDate(payment: PaymentSummary) {
  if (
    payment.billingType === "Biweekly" &&
    payment.periodEnd
  ) {
    return payment.periodEnd;
  }

  return payment.cleaningDate;
}
