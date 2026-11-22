
import type {
  ClientSummary,
  CleaningSummary,
  PaymentSummary,
  HelperSummary,
} from "../types/business";

import {calculateFinancialMetrics} from "../metrics/financialMetrics";
import {calculateScheduleMetrics} from "../metrics/scheduleMetrics";
import {calculateClientInsights} from "../metrics/clientInsights";
import {
  calculateRevenueProjectionMetrics,
} from "../metrics/revenueProjectionMetrics";

type BuildBusinessMetricsInput = {
  clients: ClientSummary[];
  cleanings: CleaningSummary[];
  payments: PaymentSummary[];
  helpers: HelperSummary[];
  todayDate: string;
};

/**
 * Builds the calculated business metrics used by Mila Assistant.
 * @param {BuildBusinessMetricsInput} input Business data and current date.
 * @return {object} Calculated business metrics.
 */
export function buildBusinessMetrics({
  clients,
  cleanings,
  payments,
  helpers,
  todayDate,
}: BuildBusinessMetricsInput) {
  const {
    scheduleMetrics,
    cleaningsByWeekday,
    busiestWeekdays,
  } = calculateScheduleMetrics(
    cleanings,
    todayDate
  );

  const {
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
  } = calculateFinancialMetrics(payments);

  const revenueProjection =
    calculateRevenueProjectionMetrics(
      clients,
      cleanings,
      payments,
      todayDate,
      helpers
    );

  const projectedBilledRevenueByMonth = {
    ...billedRevenueByMonth,
  };

  for (
    const [month, remainingRevenue]
    of Object.entries(
      revenueProjection
        .remainingScheduledRevenueByMonth
    )
  ) {
    projectedBilledRevenueByMonth[month] =
      (
        projectedBilledRevenueByMonth[
          month
        ] ?? 0
      ) + remainingRevenue;
  }


  const projectedNetAfterHelperByMonth:
    Record<string, number> = {};

  const projectionMonths = new Set([
    ...Object.keys(projectedBilledRevenueByMonth),
    ...Object.keys(helperPayoutsByMonth),
    ...Object.keys(
      revenueProjection.remainingScheduledHelperPayoutsByMonth
    ),
  ]);

  for (const month of projectionMonths) {
    const billed =
      projectedBilledRevenueByMonth[month] ?? 0;

    const recordedHelperPayouts =
      helperPayoutsByMonth[month] ?? 0;

    const scheduledHelperPayouts =
      revenueProjection
        .remainingScheduledHelperPayoutsByMonth[month] ?? 0;

    projectedNetAfterHelperByMonth[month] =
      Math.round(
        (billed -
          recordedHelperPayouts -
          scheduledHelperPayouts) * 100
      ) / 100;
  }


  const {
    clientInsights,
    clientsByOldestLastCleaning,
    clientsByRevenue,
    clientsWithUnpaidBalance,
    clientsRequiringHelpers,
    pastScheduledCleanings,
    activeClientsWithoutHistory,
  } = calculateClientInsights(
    clients,
    cleanings,
    todayDate,
    {
      unpaidByClient,
      billedRevenueByClient,
      netAfterHelperByClient,
    }
  );

  return {
    currentDate: todayDate,
    scheduleMetrics,
    cleaningsByWeekday,
    busiestWeekdays,
    revenueProjection: {
      ...revenueProjection,
      projectedBilledRevenueByMonth,
      projectedNetAfterHelperByMonth,
    },
    financials: {
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
      totalNetAfterHelper:
        totalBilledRevenue -
        totalHelperPayouts,
    },
    clientInsights,
    clientsByOldestLastCleaning,
    clientsByRevenue,
    clientsWithUnpaidBalance,
    clientsRequiringHelpers,
    pastScheduledCleanings,
    activeClientsWithoutHistory,
  };
}
