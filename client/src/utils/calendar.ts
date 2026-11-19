const escapeCalendarText = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

const formatCalendarDateTime = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("") +
  "T" +
  [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    "00",
  ].join("");

const formatCalendarUtcDateTime = (date: Date) =>
  [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("") +
  "T" +
  [
    String(date.getUTCHours()).padStart(2, "0"),
    String(date.getUTCMinutes()).padStart(2, "0"),
    String(date.getUTCSeconds()).padStart(2, "0"),
  ].join("") +
  "Z";

type AddCleaningToCalendarOptions = {
  clientName: string;
  date: string;
  startTime: string;
  estimatedHours: number;
  address: string;
  notes: string;
  eventId: string;
};

export const addCleaningToCalendar = ({
  clientName,
  date,
  startTime,
  estimatedHours,
  address,
  notes,
  eventId,
}: AddCleaningToCalendarOptions) => {
  const start = new Date(`${date}T${startTime}:00`);

  if (Number.isNaN(start.getTime())) {
    return;
  }

  const end = new Date(
    start.getTime() +
      estimatedHours * 60 * 60 * 1000
  );

  const calendarLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mila Cleaning Tracker//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeCalendarText(
      eventId
    )}@mila-cleaning-tracker`,
    `DTSTAMP:${formatCalendarUtcDateTime(
      new Date()
    )}`,
    `DTSTART:${formatCalendarDateTime(start)}`,
    `DTEND:${formatCalendarDateTime(end)}`,
    `SUMMARY:${escapeCalendarText(
      `Cleaning - ${clientName}`
    )}`,
    address
      ? `LOCATION:${escapeCalendarText(address)}`
      : "",
    notes
      ? `DESCRIPTION:${escapeCalendarText(notes)}`
      : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  const calendarFile = new Blob(
    [calendarLines.join("\r\n")],
    {
      type: "text/calendar;charset=utf-8",
    }
  );

  const calendarUrl =
    URL.createObjectURL(calendarFile);

  const link = document.createElement("a");

  link.href = calendarUrl;
  link.download = `${clientName
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")}-${date}.ics`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(calendarUrl);
  }, 1000);
};