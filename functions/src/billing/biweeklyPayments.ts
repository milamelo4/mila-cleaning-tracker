import {getBiweeklyPeriod} from "../utils/billingDateUtils";
import {getDefaultHelperPayout} from "../utils/helperPayoutUtils";

export type BillingDocument = {
  id: string;
  data: Record<string, unknown>;
};

type Payment = {
  cleaningId: string;
  clientId: string;
  clientName: string;
  cleaningDate: string;
  billingType: "Biweekly";
  periodStart: string;
  periodEnd: string;
  includedCleaningIds: string[];
  amountCharged: number;
  actualHours: number;
  helperPayout: number;
  paid: false;
  paidDate: string;
  notes: string;
};

/**
 * Checks an ISO calendar date without accepting impossible dates.
 * @param {unknown} value Date to check.
 * @return {boolean} Whether it is a valid date.
 */
function isDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    getBiweeklyPeriod(value, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks whether a prior payment might already cover a billing cycle.
 * Unknown legacy payment dates are deliberately treated as conflicts.
 * @param {BillingDocument} payment Existing payment.
 * @param {string} start Period start.
 * @param {string} end Period end.
 * @param {Set<string>} ids Cleaning IDs in the period.
 * @return {boolean} Whether the payment overlaps.
 */
function overlaps(
  payment: BillingDocument,
  start: string,
  end: string,
  ids: Set<string>
): boolean {
  const data = payment.data;
  if (typeof data.cleaningId === "string" && ids.has(data.cleaningId)) {
    return true;
  }
  if (Array.isArray(data.includedCleaningIds) &&
      data.includedCleaningIds.some((id) => ids.has(id))) {
    return true;
  }
  if (isDate(data.periodStart) && isDate(data.periodEnd)) {
    return data.periodStart <= end && data.periodEnd >= start;
  }
  if (isDate(data.cleaningDate)) {
    // Legacy monthly records may cover more than one 14-day period.
    if (data.billingType === "Fixed Monthly" ||
        payment.id.startsWith("monthly_")) {
      const month = data.cleaningDate.slice(0, 7);
      return month >= start.slice(0, 7) && month <= end.slice(0, 7);
    }
    return data.cleaningDate >= start && data.cleaningDate <= end;
  }
  return true;
}

/**
 * Plans missing biweekly invoices without modifying any existing invoice.
 * Historical rates are not stored; use current configured rates and limit
 * recovery to the anchor cycle or later (or an earlier verified cycle).
 * @param {BillingDocument} client Client record.
 * @param {BillingDocument[]} cleanings Client's cleaning records.
 * @param {BillingDocument[]} payments Client's existing payment records.
 * @param {Map<string, number>} helperRates Current helper rates.
 * @param {string} today Business-local ISO date.
 * @return {Array} Candidate records and deterministic document IDs.
 */
export function planMissingBiweeklyPayments(
  client: BillingDocument,
  cleanings: BillingDocument[],
  payments: BillingDocument[],
  helperRates: ReadonlyMap<string, number>,
  today: string
): Array<{id: string; data: Payment}> {
  const {name, billingType, active, biweeklyAnchorDate: anchor,
    biweeklyRate: rate, pricePerCleaning: price} = client.data;
  if (billingType !== "Biweekly" || active !== true) return [];
  if (typeof name !== "string" || !name.trim() || !isDate(anchor) ||
      !isDate(today) || typeof rate !== "number" || !Number.isFinite(rate) ||
      rate <= 0 || typeof price !== "number" || !Number.isFinite(price) ||
      price <= 0) {
    throw new Error("Invalid biweekly client billing configuration.");
  }

  let earliestEnd = anchor;
  for (const {data} of payments) {
    if (data.billingType === "Biweekly" && isDate(data.periodEnd) &&
        isDate(data.periodStart)) {
      const expected = getBiweeklyPeriod(data.periodEnd, anchor);
      if (expected.periodEnd === data.periodEnd &&
          expected.periodStart === data.periodStart &&
          data.periodEnd < earliestEnd) {
        earliestEnd = data.periodEnd;
      }
    }
  }

  const periods = new Map<string, BillingDocument[]>();
  for (const cleaning of cleanings) {
    const {date, status} = cleaning.data;
    if (!isDate(date)) {
      throw new Error("Invalid cleaning date; billing needs review.");
    }
    if (status !== "Scheduled" && status !== "Completed" &&
        status !== "Cancelled") {
      throw new Error("Unknown cleaning status; billing needs review.");
    }
    const {periodEnd} = getBiweeklyPeriod(date, anchor);
    if (periodEnd < earliestEnd || periodEnd > today) continue;
    const group = periods.get(periodEnd) ?? [];
    group.push(cleaning);
    periods.set(periodEnd, group);
  }

  const candidates: Array<{id: string; data: Payment}> = [];
  for (const [end, group] of periods) {
    if (group.some(({data}) => data.status === "Scheduled")) continue;
    const completed = group.filter(({data}) => data.status === "Completed");
    if (!completed.length) continue;
    const {periodStart: start} = getBiweeklyPeriod(end, anchor);
    const id = `biweekly_${client.id}_${end}`;
    const ids = new Set(group.map((cleaning) => cleaning.id));
    if (payments.some((payment) => payment.id === id ||
        overlaps(payment, start, end, ids))) continue;

    completed.sort((a, b) =>
      String(a.data.date).localeCompare(String(b.data.date)) ||
      a.id.localeCompare(b.id)
    );
    let actualHours = 0;
    let payoutCents = 0;
    for (const {data} of completed) {
      const hours = data.estimatedHours;
      if (typeof hours !== "number" || !Number.isFinite(hours) || hours < 0) {
        throw new Error("Invalid cleaning hours; billing needs review.");
      }
      if (!Array.isArray(data.assignedHelpers) ||
          data.assignedHelpers.some((helper) => typeof helper !== "string")) {
        throw new Error("Invalid helper assignment; billing needs review.");
      }
      actualHours += hours;
      for (const helper of new Set<string>(data.assignedHelpers)) {
        const payout = getDefaultHelperPayout(
          price, true, helperRates.get(helper) ?? 50
        );
        payoutCents += Math.round(payout * 100);
      }
    }
    if (payoutCents > Math.round(rate * 100)) {
      throw new Error("Helper payouts exceed the biweekly rate.");
    }
    candidates.push({id, data: {
      cleaningId: "",
      clientId: client.id,
      clientName: name,
      cleaningDate: "",
      billingType: "Biweekly",
      periodStart: start,
      periodEnd: end,
      includedCleaningIds: completed.map((cleaning) => cleaning.id),
      amountCharged: rate,
      actualHours,
      helperPayout: payoutCents / 100,
      paid: false,
      paidDate: "",
      notes: "",
    }});
  }
  return candidates.sort((a, b) =>
    a.data.periodEnd.localeCompare(b.data.periodEnd)
  );
}
