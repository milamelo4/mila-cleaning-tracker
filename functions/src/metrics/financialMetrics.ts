import type {PaymentSummary} from "../types/business";
import {getPaymentReferenceDate} from "../utils/paymentUtils";

export type FinancialMetrics = {
  billedRevenueByMonth: Record<string, number>;
  cashReceivedByMonth: Record<string, number>;
  helperPayoutsByMonth: Record<string, number>;
  netAfterHelperByMonth: Record<string, number>;
  unpaidBalance: number;
  unpaidByClient: Record<string, number>;
  billedRevenueByClient: Record<string, number>;
  helperPayoutsByClient: Record<string, number>;
  netAfterHelperByClient: Record<string, number>;
  totalBilledRevenue: number;
  totalCashReceived: number;
  totalHelperPayouts: number;
};

/**
 * Calculates financial metrics from payment records.
 * @param {PaymentSummary[]} payments Payment records.
 * @return {FinancialMetrics} Calculated financial metrics.
 */
export function calculateFinancialMetrics(
  payments: PaymentSummary[]
): FinancialMetrics {
  const billedRevenueByMonth:
    Record<string, number> = {};

  const cashReceivedByMonth:
    Record<string, number> = {};

  const helperPayoutsByMonth:
    Record<string, number> = {};

  const billedRevenueByClient:
    Record<string, number> = {};

  const helperPayoutsByClient:
    Record<string, number> = {};

  const unpaidByClient:
    Record<string, number> = {};

  let unpaidBalance = 0;
  let totalBilledRevenue = 0;
  let totalCashReceived = 0;
  let totalHelperPayouts = 0;

  for (const payment of payments) {
    const amountCharged =
      payment.amountCharged;

    const helperPayout =
      payment.helperPayout;

    const clientName =
      payment.clientName.trim() ||
      payment.clientId ||
      "Unknown client";

    totalBilledRevenue +=
      amountCharged;

    totalHelperPayouts +=
      helperPayout;

    billedRevenueByClient[clientName] =
      (
        billedRevenueByClient[
          clientName
        ] ?? 0
      ) + amountCharged;

    helperPayoutsByClient[clientName] =
      (
        helperPayoutsByClient[
          clientName
        ] ?? 0
      ) + helperPayout;

    const paymentReferenceDate =
      getPaymentReferenceDate(payment);

    if (
      paymentReferenceDate.length >= 7
    ) {
      const month =
        paymentReferenceDate.slice(0, 7);

      billedRevenueByMonth[month] =
        (
          billedRevenueByMonth[
            month
          ] ?? 0
        ) + amountCharged;

      helperPayoutsByMonth[month] =
        (
          helperPayoutsByMonth[
            month
          ] ?? 0
        ) + helperPayout;
    }

    if (
      payment.paid &&
      payment.paidDate.length >= 7
    ) {
      const paidMonth =
        payment.paidDate.slice(0, 7);

      cashReceivedByMonth[paidMonth] =
        (
          cashReceivedByMonth[
            paidMonth
          ] ?? 0
        ) + amountCharged;

      totalCashReceived +=
        amountCharged;
    }

    if (!payment.paid) {
      unpaidBalance +=
        amountCharged;

      unpaidByClient[clientName] =
        (
          unpaidByClient[
            clientName
          ] ?? 0
        ) + amountCharged;
    }
  }

  const netAfterHelperByMonth:
    Record<string, number> = {};

  for (
    const month of
    Object.keys(billedRevenueByMonth)
  ) {
    netAfterHelperByMonth[month] =
      billedRevenueByMonth[month] -
      (
        helperPayoutsByMonth[
          month
        ] ?? 0
      );
  }

  const netAfterHelperByClient:
    Record<string, number> = {};

  for (
    const clientName of
    Object.keys(billedRevenueByClient)
  ) {
    netAfterHelperByClient[
      clientName
    ] =
      billedRevenueByClient[
        clientName
      ] -
      (
        helperPayoutsByClient[
          clientName
        ] ?? 0
      );
  }

  return {
    billedRevenueByMonth,
    cashReceivedByMonth,
    helperPayoutsByMonth,
    netAfterHelperByMonth,
    unpaidBalance,
    unpaidByClient,
    billedRevenueByClient,
    helperPayoutsByClient,
    netAfterHelperByClient,
    totalBilledRevenue,
    totalCashReceived,
    totalHelperPayouts,
  };
}
