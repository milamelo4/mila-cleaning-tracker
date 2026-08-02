import type { Cleaning } from "../types/cleaning";
import type { Client } from "../types/client";

type CleaningCalendarProps = {
  year: number;
  month: number;
  cleanings: Cleaning[];
  clients: Client[];
  isAdmin: boolean;
  onEdit: (firestoreId: string) => void;
};

const weekdayLabels = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

const formatDateKey = (
  year: number,
  month: number,
  day: number
) => {
  return [
    year,
    String(month + 1).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
};

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2000, 0, 1, hours, minutes));
};

function CleaningCalendar({
  year,
  month,
  cleanings,
  clients,
  isAdmin,
  onEdit,
}: CleaningCalendarProps) {
  const firstWeekday = new Date(year, month, 1).getDay();

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const totalCalendarCells =
    Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const now = new Date();

  const today = formatDateKey(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const getClientName = (clientId: string) => {
    return (
      clients.find(
        (client) => client.firestoreId === clientId
      )?.name ?? "Client unavailable"
    );
  };

  const cleaningsByDate = cleanings.reduce<
    Record<string, Cleaning[]>
  >((groups, cleaning) => {
    if (!groups[cleaning.date]) {
      groups[cleaning.date] = [];
    }

    groups[cleaning.date].push(cleaning);

    return groups;
  }, {});

  Object.values(cleaningsByDate).forEach(
    (dateCleanings) => {
      dateCleanings.sort((first, second) =>
        first.startTime.localeCompare(second.startTime)
      );
    }
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border-soft)] bg-white shadow-sm">
      <div className="min-w-[650px]">
        <div className="grid grid-cols-7 border-b border-[var(--border-soft)] bg-[var(--cream)]">
          {weekdayLabels.map((weekday) => (
            <div
              key={weekday}
              className="border-r border-[var(--border-soft)] px-2 py-3 text-center text-xs font-bold uppercase tracking-wide text-[var(--blue-dark)] last:border-r-0"
            >
              {weekday}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({
            length: totalCalendarCells,
          }).map((_, index) => {
            const dayNumber =
              index - firstWeekday + 1;

            const isOutsideMonth =
              dayNumber < 1 ||
              dayNumber > daysInMonth;

            if (isOutsideMonth) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-32 border-b border-r border-[var(--border-soft)] bg-[var(--cream)] last:border-r-0"
                />
              );
            }

            const dateKey = formatDateKey(
              year,
              month,
              dayNumber
            );

            const dateCleanings =
              cleaningsByDate[dateKey] ?? [];

            return (
              <div
                key={dateKey}
                className="min-h-32 border-b border-r border-[var(--border-soft)] p-2 last:border-r-0"
              >
                <div className="mb-2">
                  <span
                    className={
                      dateKey === today
                        ? "inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--blue-dark)] text-xs font-bold text-white"
                        : "inline-flex h-7 w-7 items-center justify-center text-xs font-bold text-[var(--charcoal)]"
                    }
                  >
                    {dayNumber}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {dateCleanings.map((cleaning) => {
                    const clientName = getClientName(
                      cleaning.clientId
                    );

                    const cancelled =
                      cleaning.status === "Cancelled";

                    const appointmentContent = (
                      <>
                        <span className="block truncate font-semibold">
                          {clientName}
                        </span>

                        <span className="block truncate opacity-80">
                          {formatTime(cleaning.startTime)}
                        </span>
                      </>
                    );

                    if (
                      isAdmin &&
                      cleaning.firestoreId
                    ) {
                      return (
                        <button
                          key={cleaning.firestoreId}
                          type="button"
                          title={`${clientName} at ${formatTime(
                            cleaning.startTime
                          )}`}
                          onClick={() =>
                            onEdit(
                              cleaning.firestoreId as string
                            )
                          }
                          className={`w-full rounded-md border border-[var(--border-soft)] bg-white px-2 py-1.5 text-left text-xs text-[var(--blue-dark)] shadow-sm transition hover:border-[var(--blue-dark)] ${
                            cancelled
                              ? "opacity-50 line-through"
                              : ""
                          }`}
                        >
                          {appointmentContent}
                        </button>
                      );
                    }

                    return (
                      <div
                        key={
                          cleaning.firestoreId ??
                          `${cleaning.clientId}-${cleaning.date}-${cleaning.startTime}`
                        }
                        title={`${clientName} at ${formatTime(
                          cleaning.startTime
                        )}`}
                        className={`rounded-md border border-[var(--border-soft)] bg-white px-2 py-1.5 text-xs text-[var(--blue-dark)] shadow-sm ${
                          cancelled
                            ? "opacity-50 line-through"
                            : ""
                        }`}
                      >
                        {appointmentContent}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CleaningCalendar;