import type {CleaningSummary} from "../types/business";

import {
  addDays,
  addMonths,
  getMonday,
  getMonthEnd,
  getMonthStart,
} from "../utils/dateUtils";

type ScheduleRangeMetrics = {
  startDate: string;
  endDate: string;
  total: number;
  scheduled: number;
  completed: number;
  estimatedHours: number;
};

export type ScheduleMetricsResult = {
  scheduleMetrics: {
    today: ScheduleRangeMetrics;
    tomorrow: ScheduleRangeMetrics;
    yesterday: ScheduleRangeMetrics;
    thisWeek: ScheduleRangeMetrics;
    nextWeek: ScheduleRangeMetrics;
    thisMonth: ScheduleRangeMetrics;
    lastMonth: ScheduleRangeMetrics;
    nextMonth: ScheduleRangeMetrics;
  };
  cleaningsByWeekday: Record<string, number>;
  busiestWeekdays: string[];
};

/**
 * Returns schedule totals for a date range.
 * @param {CleaningSummary[]} cleanings Cleaning records.
 * @param {string} startDate Range start.
 * @param {string} endDate Range end.
 * @return {ScheduleRangeMetrics} Schedule totals.
 */
function countCleanings(
  cleanings: CleaningSummary[],
  startDate: string,
  endDate: string
): ScheduleRangeMetrics {
  const matchingCleanings = cleanings.filter(
    (cleaning) =>
      cleaning.date >= startDate &&
      cleaning.date <= endDate &&
      cleaning.status !== "Cancelled"
  );

  return {
    startDate,
    endDate,
    total: matchingCleanings.length,
    scheduled: matchingCleanings.filter(
      (cleaning) =>
        cleaning.status === "Scheduled"
    ).length,
    completed: matchingCleanings.filter(
      (cleaning) =>
        cleaning.status === "Completed"
    ).length,
    estimatedHours: matchingCleanings.reduce(
      (total, cleaning) =>
        total + cleaning.estimatedHours,
      0
    ),
  };
}

/**
 * Calculates schedule and weekday metrics.
 * @param {CleaningSummary[]} cleanings Cleaning records.
 * @param {string} todayDate Current Utah date.
 * @return {ScheduleMetricsResult} Calculated schedule metrics.
 */
export function calculateScheduleMetrics(
  cleanings: CleaningSummary[],
  todayDate: string
): ScheduleMetricsResult {
  const tomorrowDate =
    addDays(todayDate, 1);

  const yesterdayDate =
    addDays(todayDate, -1);

  const thisWeekStart =
    getMonday(todayDate);

  const thisWeekEnd =
    addDays(thisWeekStart, 6);

  const nextWeekStart =
    addDays(thisWeekStart, 7);

  const nextWeekEnd =
    addDays(nextWeekStart, 6);

  const thisMonthStart =
    getMonthStart(todayDate);

  const thisMonthEnd =
    getMonthEnd(todayDate);

  const lastMonthStart =
    addMonths(todayDate, -1);

  const lastMonthEnd =
    getMonthEnd(lastMonthStart);

  const nextMonthStart =
    addMonths(todayDate, 1);

  const nextMonthEnd =
    getMonthEnd(nextMonthStart);

  const scheduleMetrics = {
    today: countCleanings(
      cleanings,
      todayDate,
      todayDate
    ),
    tomorrow: countCleanings(
      cleanings,
      tomorrowDate,
      tomorrowDate
    ),
    yesterday: countCleanings(
      cleanings,
      yesterdayDate,
      yesterdayDate
    ),
    thisWeek: countCleanings(
      cleanings,
      thisWeekStart,
      thisWeekEnd
    ),
    nextWeek: countCleanings(
      cleanings,
      nextWeekStart,
      nextWeekEnd
    ),
    thisMonth: countCleanings(
      cleanings,
      thisMonthStart,
      thisMonthEnd
    ),
    lastMonth: countCleanings(
      cleanings,
      lastMonthStart,
      lastMonthEnd
    ),
    nextMonth: countCleanings(
      cleanings,
      nextMonthStart,
      nextMonthEnd
    ),
  };

  const weekdayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const cleaningsByWeekday:
    Record<string, number> = {
      Sunday: 0,
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
    };

  for (const cleaning of cleanings) {
    if (
      cleaning.status === "Cancelled" ||
      !cleaning.date
    ) {
      continue;
    }

    const [year, month, day] =
      cleaning.date
        .split("-")
        .map(Number);

    const date = new Date(
      Date.UTC(year, month - 1, day)
    );

    const weekday =
      weekdayNames[date.getUTCDay()];

    cleaningsByWeekday[weekday] += 1;
  }

  const highestCleaningCount =
    Math.max(
      ...Object.values(
        cleaningsByWeekday
      )
    );

  const busiestWeekdays =
    Object.entries(cleaningsByWeekday)
      .filter(
        ([, count]) =>
          count === highestCleaningCount &&
          count > 0
      )
      .map(([weekday]) => weekday);

  return {
    scheduleMetrics,
    cleaningsByWeekday,
    busiestWeekdays,
  };
}
