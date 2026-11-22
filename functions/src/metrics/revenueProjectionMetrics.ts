import type {
  ClientSummary,
  CleaningSummary,
  PaymentSummary,
} from "../types/business";

import {
  getBiweeklyPeriod,
} from "../utils/billingDateUtils";

export type RevenueProjectionMetrics = {
  remainingScheduledCleaningsByMonth:
    Record<string, number>;

  remainingScheduledRevenueByMonth:
    Record<string, number>;

  unpricedScheduledCleaningsByMonth:
    Record<string, number>;
};

/**
 * Adds one to a numeric monthly total.
 * @param {Record<string, number>} totals Monthly totals.
 * @param {string} month YYYY-MM month.
 * @param {number} amount Amount to add.
 */
function addToMonth(
  totals: Record<string, number>,
  month: string,
  amount: number
): void {
  totals[month] =
    (totals[month] ?? 0) + amount;
}

/**
 * Calculates future revenue from scheduled cleanings.
 * Billing rules are respected for each client type.
 * @param {ClientSummary[]} clients Business clients.
 * @param {CleaningSummary[]} cleanings Business cleanings.
 * @param {PaymentSummary[]} payments Existing payments.
 * @param {string} todayDate Current Utah date.
 * @return {RevenueProjectionMetrics} Projection data.
 */
export function calculateRevenueProjectionMetrics(
  clients: ClientSummary[],
  cleanings: CleaningSummary[],
  payments: PaymentSummary[],
  todayDate: string
): RevenueProjectionMetrics {
  const remainingScheduledCleaningsByMonth:
    Record<string, number> = {};

  const remainingScheduledRevenueByMonth:
    Record<string, number> = {};

  const unpricedScheduledCleaningsByMonth:
    Record<string, number> = {};

  const clientsById = new Map(
    clients.map((client) => [
      client.id,
      client,
    ])
  );

  const existingPaymentIds = new Set(
    payments.map((payment) => payment.id)
  );

  const projectedBillingIds =
    new Set<string>();

  for (const cleaning of cleanings) {
    if (
      cleaning.status !== "Scheduled" ||
      !cleaning.date ||
      cleaning.date < todayDate
    ) {
      continue;
    }

    const cleaningMonth =
      cleaning.date.slice(0, 7);

    addToMonth(
      remainingScheduledCleaningsByMonth,
      cleaningMonth,
      1
    );

    const client =
      clientsById.get(cleaning.clientId);

    if (!client) {
      addToMonth(
        unpricedScheduledCleaningsByMonth,
        cleaningMonth,
        1
      );

      continue;
    }

    if (client.billingType === "Per Cleaning") {
      if (client.pricePerCleaning <= 0) {
        addToMonth(
          unpricedScheduledCleaningsByMonth,
          cleaningMonth,
          1
        );

        continue;
      }

      if (existingPaymentIds.has(cleaning.id)) {
        continue;
      }

      addToMonth(
        remainingScheduledRevenueByMonth,
        cleaningMonth,
        client.pricePerCleaning
      );

      continue;
    }

    if (client.billingType === "Fixed Monthly") {
      if (client.monthlyRate <= 0) {
        addToMonth(
          unpricedScheduledCleaningsByMonth,
          cleaningMonth,
          1
        );

        continue;
      }

      const paymentId =
        `monthly_${client.id}_${cleaningMonth}`;

      if (
        existingPaymentIds.has(paymentId) ||
        projectedBillingIds.has(paymentId)
      ) {
        continue;
      }

      projectedBillingIds.add(paymentId);

      addToMonth(
        remainingScheduledRevenueByMonth,
        cleaningMonth,
        client.monthlyRate
      );

      continue;
    }

    if (
      client.biweeklyRate <= 0 ||
      !client.biweeklyAnchorDate
    ) {
      addToMonth(
        unpricedScheduledCleaningsByMonth,
        cleaningMonth,
        1
      );

      continue;
    }

    try {
      const {
        periodEnd,
      } = getBiweeklyPeriod(
        cleaning.date,
        client.biweeklyAnchorDate
      );

      const paymentId =
        `biweekly_${client.id}_${periodEnd}`;

      if (
        existingPaymentIds.has(paymentId) ||
        projectedBillingIds.has(paymentId)
      ) {
        continue;
      }

      projectedBillingIds.add(paymentId);

      const billingMonth =
        periodEnd.slice(0, 7);

      addToMonth(
        remainingScheduledRevenueByMonth,
        billingMonth,
        client.biweeklyRate
      );
    } catch {
      addToMonth(
        unpricedScheduledCleaningsByMonth,
        cleaningMonth,
        1
      );
    }
  }

  return {
    remainingScheduledCleaningsByMonth,
    remainingScheduledRevenueByMonth,
    unpricedScheduledCleaningsByMonth,
  };
}
