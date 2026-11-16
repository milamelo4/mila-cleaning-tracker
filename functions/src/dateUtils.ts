/**
 * Returns today's date in Utah as YYYY-MM-DD.
 * @return {string} Utah date key.
 */
export function getUtahDateKey() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find(
    (part) => part.type === "year"
  )?.value;

  const month = parts.find(
    (part) => part.type === "month"
  )?.value;

  const day = parts.find(
    (part) => part.type === "day"
  )?.value;

  return `${year}-${month}-${day}`;
}

/**
 * Adds days to a YYYY-MM-DD date.
 * @param {string} dateKey Date key.
 * @param {number} numberOfDays Number of days to add.
 * @return {string} Updated date key.
 */
export function addDays(
  dateKey: string,
  numberOfDays: number
) {
  const [year, month, day] =
    dateKey.split("-").map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  date.setUTCDate(
    date.getUTCDate() + numberOfDays
  );

  return date.toISOString().slice(0, 10);
}

/**
 * Returns the Monday for the week containing dateKey.
 * @param {string} dateKey Date key.
 * @return {string} Monday date key.
 */
export function getMonday(dateKey: string) {
  const [year, month, day] =
    dateKey.split("-").map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  const weekday = date.getUTCDay();
  const daysFromMonday =
    weekday === 0 ? -6 : 1 - weekday;

  return addDays(dateKey, daysFromMonday);
}

/**
 * Returns the first day of a month.
 * @param {string} dateKey Date key.
 * @return {string} Month start date key.
 */
export function getMonthStart(dateKey: string) {
  return `${dateKey.slice(0, 7)}-01`;
}

/**
 * Returns the final day of a month.
 * @param {string} dateKey Date key.
 * @return {string} Month end date key.
 */
export function getMonthEnd(dateKey: string) {
  const [year, month] =
    dateKey.split("-").map(Number);

  const date = new Date(
    Date.UTC(year, month, 0)
  );

  return date.toISOString().slice(0, 10);
}

/**
 * Returns the first day of a month offset from dateKey.
 * @param {string} dateKey Date key.
 * @param {number} amount Number of months to move.
 * @return {string} Month start date key.
 */
export function addMonths(
  dateKey: string,
  amount: number
) {
  const [year, month] =
    dateKey.split("-").map(Number);

  const date = new Date(
    Date.UTC(year, month - 1 + amount, 1)
  );

  return date.toISOString().slice(0, 10);
}

/**
 * Calculates whole calendar days between two date keys.
 * @param {string} startDate Start date.
 * @param {string} endDate End date.
 * @return {number} Number of days.
 */
export function daysBetween(
  startDate: string,
  endDate: string
) {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);

  return Math.floor(
    (end - start) / 86400000
  );
}
