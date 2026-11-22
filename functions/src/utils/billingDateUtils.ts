const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Parses a YYYY-MM-DD string as a UTC date.
 * @param {string} value ISO date string.
 * @return {Date} Parsed UTC date.
 */
function parseIsoDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Billing date is invalid.");
  }

  const [year, month, day] =
    value.split("-").map(Number);

  const date =
    new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Billing date is invalid.");
  }

  return date;
}

/**
 * Formats a date as YYYY-MM-DD.
 * @param {Date} date Date to format.
 * @return {string} ISO date string.
 */
function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Gets the 14-day billing period for a date.
 * The anchor date represents a known period end date.
 * @param {string} date Cleaning date.
 * @param {string} anchorDate Known biweekly period end date.
 * @return {{periodStart: string, periodEnd: string}} Billing period.
 */
export function getBiweeklyPeriod(
  date: string,
  anchorDate: string
): {
  periodStart: string;
  periodEnd: string;
} {
  const cleaningDate = parseIsoDate(date);
  const anchor = parseIsoDate(anchorDate);

  const differenceInDays = Math.round(
    (
      cleaningDate.getTime() -
      anchor.getTime()
    ) / DAY_IN_MS
  );

  const cycleOffset =
    Math.ceil(differenceInDays / 14);

  const periodEndDate = new Date(
    anchor.getTime() +
    cycleOffset * 14 * DAY_IN_MS
  );

  const periodStartDate = new Date(
    periodEndDate.getTime() -
    13 * DAY_IN_MS
  );

  return {
    periodStart: formatIsoDate(
      periodStartDate
    ),
    periodEnd: formatIsoDate(
      periodEndDate
    ),
  };
}
