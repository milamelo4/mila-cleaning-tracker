
import type {
  ClientSummary,
  CleaningSummary,
  PaymentSummary,
  HelperSummary,
} from "../types/business";

import {
  getBiweeklyPeriod,
} from "../utils/billingDateUtils";

import {
  getDefaultHelperPayout,
} from "../utils/helperPayoutUtils";

export type RevenueProjectionMetrics = {
  remainingScheduledCleaningsByMonth:
    Record<string, number>;

  remainingScheduledRevenueByMonth:
    Record<string, number>;

  remainingScheduledHelperPayoutsByMonth:
    Record<string, number>;

  unpricedScheduledCleaningsByMonth:
    Record<string, number>;

  unpricedHelperCleaningsByMonth:
    Record<string, number>;

  unassignedHelperCleaningsByMonth:
    Record<string, number>;
};

/**
 * Adds an amount to a monthly total.
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
 * Calculates scheduled revenue and helper payouts.
 * @param {ClientSummary[]} clients Business clients.
 * @param {CleaningSummary[]} cleanings Business cleanings.
 * @param {PaymentSummary[]} payments Existing payments.
 * @param {string} todayDate Current Utah date.
 * @param {HelperSummary[]} helpers Helper payment rates.
 * @return {RevenueProjectionMetrics} Projection data.
 */
export function calculateRevenueProjectionMetrics(
  clients: ClientSummary[],
  cleanings: CleaningSummary[],
  payments: PaymentSummary[],
  todayDate: string,
  helpers: HelperSummary[]
): RevenueProjectionMetrics {
  const remainingScheduledCleaningsByMonth:
    Record<string, number> = {};

  const remainingScheduledRevenueByMonth:
    Record<string, number> = {};

  const remainingScheduledHelperPayoutsByMonth:
    Record<string, number> = {};

  const unpricedScheduledCleaningsByMonth:
    Record<string, number> = {};

  const unpricedHelperCleaningsByMonth:
    Record<string, number> = {};

  const unassignedHelperCleaningsByMonth:
    Record<string, number> = {};

  const clientsById = new Map(
    clients.map((client) => [
      client.id,
      client,
    ])
  );

  const helpersById = new Map(
    helpers.map((helper) => [
      helper.uid,
      helper,
    ])
  );

  // Find cleanings already linked to payment records.
  const recordedCleaningIds = new Set<string>();

  // Identify billing periods already recorded.
  const recordedMonthlyBills = new Set<string>();
  const recordedBiweeklyBills = new Set<string>();

  for (const payment of payments) {
    if (payment.cleaningId) {
      recordedCleaningIds.add(payment.cleaningId);
    }

    for (
      const cleaningId of
      payment.includedCleaningIds ?? []
    ) {
      recordedCleaningIds.add(cleaningId);
    }

    // Compatibility with older payment IDs.
    recordedCleaningIds.add(payment.id);

    if (
      payment.billingType === "Fixed Monthly" &&
      payment.cleaningDate.length >= 7
    ) {
      recordedMonthlyBills.add(
        `${payment.clientId}_${payment.cleaningDate.slice(0, 7)}`
      );
    }

    if (
      payment.billingType === "Biweekly" &&
      payment.periodEnd
    ) {
      recordedBiweeklyBills.add(
        `${payment.clientId}_${payment.periodEnd}`
      );
    }

    // Compatibility with older deterministic IDs.
    if (payment.id.startsWith("monthly_")) {
      recordedMonthlyBills.add(
        `${payment.clientId}_${payment.id.slice(-7)}`
      );
    }

    if (
      payment.id.startsWith("biweekly_") &&
      payment.periodEnd
    ) {
      recordedBiweeklyBills.add(
        `${payment.clientId}_${payment.periodEnd}`
      );
    }
  }

  const projectedMonthlyBills = new Set<string>();
  const projectedBiweeklyBills = new Set<string>();

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

    // Avoid counting a recorded cleaning twice.
    if (recordedCleaningIds.has(cleaning.id)) {
      continue;
    }

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

    // Helper costs are calculated per cleaning,
    // not per monthly or biweekly invoice.
    const assignedHelperIds = [
      ...new Set(cleaning.assignedHelpers),
    ];

    if (
      client.helperNeeded &&
      assignedHelperIds.length === 0
    ) {
      addToMonth(
        unassignedHelperCleaningsByMonth,
        cleaningMonth,
        1
      );
    }

    if (assignedHelperIds.length > 0) {
      const referencePrice =
        client.pricePerCleaning;

      if (
        !Number.isFinite(referencePrice) ||
        referencePrice <= 0
      ) {
        addToMonth(
          unpricedHelperCleaningsByMonth,
          cleaningMonth,
          1
        );
      } else {
        let helperTotal = 0;

        for (const helperId of assignedHelperIds) {
          const helper = helpersById.get(helperId);

          const percentage =
            helper?.payoutPercentage ?? 50;

          helperTotal += getDefaultHelperPayout(
            referencePrice,
            true,
            percentage
          );
        }

        addToMonth(
          remainingScheduledHelperPayoutsByMonth,
          cleaningMonth,
          Math.round(helperTotal * 100) / 100
        );
      }
    }

    // Per-cleaning revenue.
    if (client.billingType === "Per Cleaning") {
      if (
        !Number.isFinite(client.pricePerCleaning) ||
        client.pricePerCleaning <= 0
      ) {
        addToMonth(
          unpricedScheduledCleaningsByMonth,
          cleaningMonth,
          1
        );

        continue;
      }

      addToMonth(
        remainingScheduledRevenueByMonth,
        cleaningMonth,
        client.pricePerCleaning
      );

      continue;
    }

    // Fixed monthly revenue: one bill per month.
    if (client.billingType === "Fixed Monthly") {
      if (
        !Number.isFinite(client.monthlyRate) ||
        client.monthlyRate <= 0
      ) {
        addToMonth(
          unpricedScheduledCleaningsByMonth,
          cleaningMonth,
          1
        );

        continue;
      }

      const billingKey =
        `${client.id}_${cleaningMonth}`;

      if (
        recordedMonthlyBills.has(billingKey) ||
        projectedMonthlyBills.has(billingKey)
      ) {
        continue;
      }

      projectedMonthlyBills.add(billingKey);

      addToMonth(
        remainingScheduledRevenueByMonth,
        cleaningMonth,
        client.monthlyRate
      );

      continue;
    }

    // Biweekly revenue: one bill per period.
    if (
      !Number.isFinite(client.biweeklyRate) ||
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
      const {periodEnd} = getBiweeklyPeriod(
        cleaning.date,
        client.biweeklyAnchorDate
      );

      const billingKey =
        `${client.id}_${periodEnd}`;

      if (
        recordedBiweeklyBills.has(billingKey) ||
        projectedBiweeklyBills.has(billingKey)
      ) {
        continue;
      }

      projectedBiweeklyBills.add(billingKey);

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
    remainingScheduledHelperPayoutsByMonth,
    unpricedScheduledCleaningsByMonth,
    unpricedHelperCleaningsByMonth,
    unassignedHelperCleaningsByMonth,
  };
}
