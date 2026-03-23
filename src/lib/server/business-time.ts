const DEFAULT_TIME_ZONE = process.env.SHOP_TIME_ZONE || "Africa/Casablanca";

function extractDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
}

function getOffsetMinutes(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  });

  const timeZoneName = formatter
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")
    ?.value;

  if (!timeZoneName || timeZoneName === "GMT") {
    return 0;
  }

  const match = timeZoneName.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    return 0;
  }

  const [, sign, hours, minutes = "0"] = match;
  const totalMinutes = Number(hours) * 60 + Number(minutes);
  return sign === "-" ? -totalMinutes : totalMinutes;
}

function buildZonedMidnight(date: Date, timeZone: string) {
  const { year, month, day } = extractDateParts(date, timeZone);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const offsetMinutes = getOffsetMinutes(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offsetMinutes * 60_000);
}

export function getBusinessTimeZone() {
  return DEFAULT_TIME_ZONE;
}

export function formatBusinessDateKey(date: Date, timeZone = DEFAULT_TIME_ZONE) {
  const { year, month, day } = extractDateParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getBusinessPeriodBounds(now = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const startOfDay = buildZonedMidnight(now, timeZone);
  const nextDay = new Date(startOfDay);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const { year, month, day } = extractDateParts(now, timeZone);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(now);
  const weekdayIndex =
    {
      Mon: 0,
      Tue: 1,
      Wed: 2,
      Thu: 3,
      Fri: 4,
      Sat: 5,
      Sun: 6,
    }[weekday] ?? 0;

  const startOfWeekSource = new Date(Date.UTC(year, month - 1, day - weekdayIndex, 12, 0, 0, 0));
  const startOfWeek = buildZonedMidnight(startOfWeekSource, timeZone);
  const startOfMonth = buildZonedMidnight(
    new Date(Date.UTC(year, month - 1, 1, 12, 0, 0, 0)),
    timeZone
  );

  return {
    timeZone,
    startOfDay,
    nextDay,
    startOfWeek,
    startOfMonth,
  };
}

export function getBusinessDayWindow(days: number, now = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const { startOfDay } = getBusinessPeriodBounds(now, timeZone);
  const start = new Date(startOfDay);
  start.setUTCDate(start.getUTCDate() - Math.max(0, days - 1));
  return { start, end: new Date(now) };
}
