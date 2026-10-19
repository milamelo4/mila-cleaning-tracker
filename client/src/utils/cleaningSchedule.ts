import type { Cleaning } from "../types/cleaning";

export type RepeatPattern =
  | "none"
  | "weekly"
  | "biweekly"
  | "monthly";

export type CleaningConflict =
  | {
      type: "same-client";
      date: string;
    }
  | {
      type: "overlap";
      date: string;
    };

const validDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const parseLocalDate = (date: string) => {
  return new Date(`${date}T00:00:00`);
};

const formatLocalDate = (date: Date) => {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const generateWeeklyIntervalDates = (
  start: Date,
  end: Date,
  intervalInDays: number
) => {
  const dates: string[] = [];
  const currentDate = new Date(start);

  while (currentDate <= end) {
    dates.push(formatLocalDate(currentDate));

    currentDate.setDate(
      currentDate.getDate() + intervalInDays
    );
  }

  return dates;
};

const generateMonthlyDates = (
  start: Date,
  end: Date
) => {
  const dates: string[] = [];
  const preferredDay = start.getDate();
  let monthOffset = 0;

  while (true) {
    const year = start.getFullYear();
    const month = start.getMonth() + monthOffset;

    const lastDayOfMonth = new Date(
      year,
      month + 1,
      0
    ).getDate();

    const currentDate = new Date(
      year,
      month,
      Math.min(preferredDay, lastDayOfMonth)
    );

    if (currentDate > end) {
      break;
    }

    dates.push(formatLocalDate(currentDate));
    monthOffset += 1;
  }

  return dates;
};

export const generateRecurringDates = (
  startDate: string,
  endDate: string,
  repeatPattern: RepeatPattern
) => {
  if (!validDatePattern.test(startDate)) {
    return [];
  }

  if (repeatPattern === "none") {
    return [startDate];
  }

  if (!validDatePattern.test(endDate)) {
    return [];
  }

  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  if (end < start) {
    return [];
  }

  if (repeatPattern === "weekly") {
    return generateWeeklyIntervalDates(start, end, 7);
  }

  if (repeatPattern === "biweekly") {
    return generateWeeklyIntervalDates(start, end, 14);
  }

  return generateMonthlyDates(start, end);
};

/*
  Temporarily retained so the current AddCleaning file
  continues working until we update it next.
*/
export const generateWeeklyDates = (
  startDate: string,
  endDate: string
) => {
  return generateRecurringDates(
    startDate,
    endDate,
    "weekly"
  );
};

export const timeToMinutes = (time: string) => {
  const [hours, minutes] = time
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
};

type FindCleaningConflictOptions = {
  dates: string[];
  clientId: string;
  startTime: string;
  estimatedHours: number;
  existingCleanings: Cleaning[];
};

export const findCleaningConflict = ({
  dates,
  clientId,
  startTime,
  estimatedHours,
  existingCleanings,
}: FindCleaningConflictOptions): CleaningConflict | null => {
  const newStart = timeToMinutes(startTime);
  const newEnd = newStart + estimatedHours * 60;

  for (const date of dates) {
    const sameClientSameDay =
      existingCleanings.some(
        (cleaning) =>
          cleaning.clientId === clientId &&
          cleaning.date === date &&
          cleaning.status !== "Cancelled"
      );

    if (sameClientSameDay) {
      return {
        type: "same-client",
        date,
      };
    }

    const overlappingCleaning =
      existingCleanings.some((cleaning) => {
        if (
          cleaning.date !== date ||
          cleaning.status === "Cancelled"
        ) {
          return false;
        }

        const existingStart = timeToMinutes(
          cleaning.startTime
        );

        const existingEnd =
          existingStart +
          cleaning.estimatedHours * 60;

        return (
          newStart < existingEnd &&
          newEnd > existingStart
        );
      });

    if (overlappingCleaning) {
      return {
        type: "overlap",
        date,
      };
    }
  }

  return null;
};