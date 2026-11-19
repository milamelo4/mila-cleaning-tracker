import type {
  ClientSummary,
  CleaningSummary,
} from "../types/business";

import type {
  FinancialMetrics,
} from "./financialMetrics";

import {daysBetween} from "../utils/dateUtils";

type FinancialClientMetrics = Pick<
  FinancialMetrics,
  | "unpaidByClient"
  | "billedRevenueByClient"
  | "netAfterHelperByClient"
>;

type ClientInsight = {
  clientId: string;
  name: string;
  active: boolean;
  frequency: string;
  pricePerCleaning: number;
  helperNeeded: boolean;
  lastCompletedCleaning: string | null;
  daysSinceLastCompleted: number | null;
  nextScheduledCleaning: string | null;
  completedCleanings: number;
  scheduledCleanings: number;
  cancelledCleanings: number;
  unpaidBalance: number;
  billedRevenue: number;
  netAfterHelper: number;
};

type PastScheduledCleaning = {
  clientId: string;
  clientName: string;
  date: string;
  startTime: string;
};

export type ClientInsightsResult = {
  clientInsights: ClientInsight[];
  clientsByOldestLastCleaning: Array<{
    name: string;
    lastCompletedCleaning: string | null;
    daysSinceLastCompleted: number | null;
    nextScheduledCleaning: string | null;
  }>;
  clientsByRevenue: Array<{
    name: string;
    billedRevenue: number;
    netAfterHelper: number;
  }>;
  clientsWithUnpaidBalance: Array<{
    name: string;
    unpaidBalance: number;
  }>;
  clientsRequiringHelpers: string[];
  pastScheduledCleanings:
    PastScheduledCleaning[];
  activeClientsWithoutHistory: string[];
};

/**
 * Calculates client history and business insights.
 * @param {ClientSummary[]} clients Client records.
 * @param {CleaningSummary[]} cleanings Cleaning records.
 * @param {string} todayDate Current Utah date.
 * @param {FinancialClientMetrics} financials Client financial metrics.
 * @return {ClientInsightsResult} Calculated client insights.
 */
export function calculateClientInsights(
  clients: ClientSummary[],
  cleanings: CleaningSummary[],
  todayDate: string,
  financials: FinancialClientMetrics
): ClientInsightsResult {
  const {
    unpaidByClient,
    billedRevenueByClient,
    netAfterHelperByClient,
  } = financials;

  const lastCleaningByClient:
    Record<string, string> = {};

  const nextCleaningByClient:
    Record<string, string> = {};

  const completedCountByClient:
    Record<string, number> = {};

  const scheduledCountByClient:
    Record<string, number> = {};

  const cancelledCountByClient:
    Record<string, number> = {};

  const pastScheduledCleanings =
    cleanings
      .filter(
        (cleaning) =>
          cleaning.status === "Scheduled" &&
          cleaning.date < todayDate
      )
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date)
      )
      .map((cleaning) => ({
        clientId: cleaning.clientId,
        clientName: cleaning.clientName,
        date: cleaning.date,
        startTime: cleaning.startTime,
      }));

  for (const cleaning of cleanings) {
    const clientKey = cleaning.clientId;

    if (!clientKey) {
      continue;
    }

    if (cleaning.status === "Completed") {
      completedCountByClient[clientKey] =
        (
          completedCountByClient[
            clientKey
          ] ?? 0
        ) + 1;

      const currentLast =
        lastCleaningByClient[clientKey];

      if (
        !currentLast ||
        cleaning.date > currentLast
      ) {
        lastCleaningByClient[clientKey] =
          cleaning.date;
      }
    }

    if (cleaning.status === "Scheduled") {
      scheduledCountByClient[clientKey] =
        (
          scheduledCountByClient[
            clientKey
          ] ?? 0
        ) + 1;

      if (cleaning.date >= todayDate) {
        const currentNext =
          nextCleaningByClient[clientKey];

        if (
          !currentNext ||
          cleaning.date < currentNext
        ) {
          nextCleaningByClient[clientKey] =
            cleaning.date;
        }
      }
    }

    if (cleaning.status === "Cancelled") {
      cancelledCountByClient[clientKey] =
        (
          cancelledCountByClient[
            clientKey
          ] ?? 0
        ) + 1;
    }
  }

  const clientInsights = clients
    .map((client) => {
      const lastCleaning =
        lastCleaningByClient[
          client.id
        ] ?? null;

      const nextCleaning =
        nextCleaningByClient[
          client.id
        ] ?? null;

      const unpaid =
        unpaidByClient[
          client.name
        ] ?? 0;

      const billedRevenue =
        billedRevenueByClient[
          client.name
        ] ?? 0;

      return {
        clientId: client.id,
        name: client.name,
        active: client.active,
        frequency: client.frequency,
        pricePerCleaning:
          client.pricePerCleaning,
        helperNeeded: client.helperNeeded,
        lastCompletedCleaning:
          lastCleaning,
        daysSinceLastCompleted:
          lastCleaning ?
            daysBetween(
              lastCleaning,
              todayDate
            ) :
            null,
        nextScheduledCleaning:
          nextCleaning,
        completedCleanings:
          completedCountByClient[
            client.id
          ] ?? 0,
        scheduledCleanings:
          scheduledCountByClient[
            client.id
          ] ?? 0,
        cancelledCleanings:
          cancelledCountByClient[
            client.id
          ] ?? 0,
        unpaidBalance: unpaid,
        billedRevenue,
        netAfterHelper:
          netAfterHelperByClient[
            client.name
          ] ?? 0,
      };
    })
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name)
    );

  const activeClientsWithoutHistory =
    clientInsights
      .filter(
        (client) =>
          client.active &&
          client.lastCompletedCleaning ===
            null
      )
      .map((client) => client.name);

  const clientsByOldestLastCleaning =
    [...clientInsights]
      .filter((client) => client.active)
      .sort((a, b) => {
        if (
          a.daysSinceLastCompleted === null &&
          b.daysSinceLastCompleted !== null
        ) {
          return -1;
        }

        if (
          a.daysSinceLastCompleted !== null &&
          b.daysSinceLastCompleted === null
        ) {
          return 1;
        }

        return (
          (b.daysSinceLastCompleted ?? -1) -
          (a.daysSinceLastCompleted ?? -1)
        );
      })
      .map((client) => ({
        name: client.name,
        lastCompletedCleaning:
          client.lastCompletedCleaning,
        daysSinceLastCompleted:
          client.daysSinceLastCompleted,
        nextScheduledCleaning:
          client.nextScheduledCleaning,
      }));

  const clientsByRevenue =
    [...clientInsights]
      .sort(
        (a, b) =>
          b.billedRevenue -
          a.billedRevenue
      )
      .map((client) => ({
        name: client.name,
        billedRevenue:
          client.billedRevenue,
        netAfterHelper:
          client.netAfterHelper,
      }));

  const clientsWithUnpaidBalance =
    clientInsights
      .filter(
        (client) =>
          client.unpaidBalance > 0
      )
      .sort(
        (a, b) =>
          b.unpaidBalance -
          a.unpaidBalance
      )
      .map((client) => ({
        name: client.name,
        unpaidBalance:
          client.unpaidBalance,
      }));

  const clientsRequiringHelpers =
    clientInsights
      .filter(
        (client) =>
          client.active &&
          client.helperNeeded
      )
      .map((client) => client.name);

  return {
    clientInsights,
    clientsByOldestLastCleaning,
    clientsByRevenue,
    clientsWithUnpaidBalance,
    clientsRequiringHelpers,
    pastScheduledCleanings,
    activeClientsWithoutHistory,
  };
}
