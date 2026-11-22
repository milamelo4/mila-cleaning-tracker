
import type {Client} from "../types/client";
import type {Cleaning} from "../types/cleaning";
import type {Payment} from "../types/payment";
import type {Member} from "../context/MemberContext";

type ProjectionInput = {
  clients: Client[];
  cleanings: Cleaning[];
  payments: Payment[];
  helpers: Member[];
  today: string;
  matchesPeriod: (date: string) => boolean;
  matchesClient: (clientId: string) => boolean;
};

const roundMoney = (amount: number) =>
  Math.round((amount + Number.EPSILON) * 100) / 100;

function getBiweeklyPeriodEnd(
  date: string,
  anchorDate: string
): string | null {
  const parseDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }

    const parsed = new Date(`${value}T00:00:00Z`);

    return !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value ?
      parsed :
      null;
  };

  const cleaningDate = parseDate(date);
  const anchor = parseDate(anchorDate);

  if (!cleaningDate || !anchor) {
    return null;
  }

  const days = Math.round(
    (cleaningDate.getTime() - anchor.getTime()) /
    86400000
  );

  const cycle = Math.ceil(days / 14);

  return new Date(
    anchor.getTime() + cycle * 14 * 86400000
  ).toISOString().slice(0, 10);
}

export function calculateFinanceProjection({
  clients,
  cleanings,
  payments,
  helpers,
  today,
  matchesPeriod,
  matchesClient,
}: ProjectionInput) {
  const clientsById = new Map(
    clients
      .filter((client) => client.firestoreId)
      .map((client) => [client.firestoreId, client])
  );

  const helpersById = new Map(
    helpers.map((helper) => [helper.uid, helper])
  );

  const recordedCleaningIds = new Set<string>();
  const recordedMonthlyBills = new Set<string>();
  const recordedBiweeklyBills = new Set<string>();

  for (const payment of payments) {
    if (payment.cleaningId) {
      recordedCleaningIds.add(payment.cleaningId);
    }

    for (const id of payment.includedCleaningIds ?? []) {
      recordedCleaningIds.add(id);
    }

    if (
      payment.billingType === "Fixed Monthly" &&
      payment.cleaningDate
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
  }

  const projectedMonthlyBills = new Set<string>();
  const projectedBiweeklyBills = new Set<string>();

  const remainingScheduledCleanings: Cleaning[] = [];

  let remainingRevenue = 0;
  let remainingHelperPayouts = 0;
  let hasIncompleteEstimates = false;

  for (const cleaning of cleanings) {
    if (
      cleaning.status !== "Scheduled" ||
      !cleaning.date ||
      cleaning.date < today ||
      !matchesClient(cleaning.clientId) ||
      (
        cleaning.firestoreId !== undefined &&
        recordedCleaningIds.has(cleaning.firestoreId)
      )
    ) {
      continue;
    }

    const client = clientsById.get(cleaning.clientId);

    if (!client) {
      hasIncompleteEstimates = true;
      continue;
    }

    const cleaningInPeriod = matchesPeriod(cleaning.date);

    if (cleaningInPeriod) {
      remainingScheduledCleanings.push(cleaning);

      const helperIds = [
        ...new Set(cleaning.assignedHelpers),
      ];

      if (client.helperNeeded && helperIds.length === 0) {
        hasIncompleteEstimates = true;
      }

      if (helperIds.length > 0) {
        if (
          !Number.isFinite(client.pricePerCleaning) ||
          client.pricePerCleaning <= 0
        ) {
          hasIncompleteEstimates = true;
        } else {
          for (const helperId of helperIds) {
            const helper = helpersById.get(helperId);

            if (!helper) {
              hasIncompleteEstimates = true;
            }

            const percentage =
              helper?.payoutPercentage ?? 50;

            remainingHelperPayouts += roundMoney(
              client.pricePerCleaning * percentage / 100
            );
          }
        }
      }
    }

    if (client.billingType === "Per Cleaning") {
      if (client.pricePerCleaning <= 0) {
        hasIncompleteEstimates = true;
        continue;
      }

      if (cleaningInPeriod) {
        remainingRevenue += client.pricePerCleaning;
      }

      continue;
    }

    if (client.billingType === "Fixed Monthly") {
      if (client.monthlyRate <= 0) {
        hasIncompleteEstimates = true;
        continue;
      }

      const month = cleaning.date.slice(0, 7);
      const key = `${cleaning.clientId}_${month}`;

      if (
        recordedMonthlyBills.has(key) ||
        projectedMonthlyBills.has(key)
      ) {
        continue;
      }

      projectedMonthlyBills.add(key);

      if (matchesPeriod(cleaning.date)) {
        remainingRevenue += client.monthlyRate;
      }

      continue;
    }

    if (
      client.biweeklyRate <= 0 ||
      !client.biweeklyAnchorDate
    ) {
      hasIncompleteEstimates = true;
      continue;
    }

    const periodEnd = getBiweeklyPeriodEnd(
      cleaning.date,
      client.biweeklyAnchorDate
    );

    if (!periodEnd) {
      hasIncompleteEstimates = true;
      continue;
    }

    const key = `${cleaning.clientId}_${periodEnd}`;

    if (
      recordedBiweeklyBills.has(key) ||
      projectedBiweeklyBills.has(key)
    ) {
      continue;
    }

    projectedBiweeklyBills.add(key);

    if (matchesPeriod(periodEnd)) {
      remainingRevenue += client.biweeklyRate;
    }
  }

  return {
    remainingScheduledCleanings,
    remainingScheduledNet: roundMoney(
      remainingRevenue - remainingHelperPayouts
    ),
    hasIncompleteEstimates,
  };
}
