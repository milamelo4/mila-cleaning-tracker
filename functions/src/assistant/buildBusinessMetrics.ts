import type {
  ClientSummary,
  CleaningSummary,
  PaymentSummary,
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
    todayDate
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
