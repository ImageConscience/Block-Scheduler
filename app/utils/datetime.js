import { DateTime } from "luxon";

const buildOffsetZone = (offsetMinutes) => {
  if (offsetMinutes === undefined || offsetMinutes === null || Number.isNaN(Number(offsetMinutes))) {
    return null;
  }

  const numericOffset = Number(offsetMinutes);
  const sign = numericOffset >= 0 ? "+" : "-";
  const absolute = Math.abs(numericOffset);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const minutes = String(absolute % 60).padStart(2, "0");
  return `UTC${sign}${hours}:${minutes}`;
};

export const parseLocalDateTimeToUTC = (value, timeZone, fallbackOffsetMinutes) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const hasExplicitOffset = /([+-]\d{2}:\d{2}|Z)$/i.test(trimmed);

  if (hasExplicitOffset) {
    const explicit = DateTime.fromISO(trimmed, { setZone: true });
    if (explicit.isValid) {
      return explicit.toUTC().toISO({ suppressMilliseconds: true });
    }
  }

  const resolvedZones = [timeZone && timeZone.trim(), buildOffsetZone(fallbackOffsetMinutes), "UTC"].filter(Boolean);

  const parseWithZone = (zone) => {
    const parseCandidates = [
      () => DateTime.fromISO(trimmed, { zone: "UTC" }),
      () => DateTime.fromFormat(trimmed, "yyyy-MM-dd'T'HH:mm", { zone: "UTC" }),
      () => DateTime.fromFormat(trimmed, "yyyy-MM-dd'T'HH:mm:ss", { zone: "UTC" }),
    ];

    for (const candidate of parseCandidates) {
      let dateTime = candidate();
      if (!dateTime.isValid) {
        continue;
      }

      if (zone) {
        dateTime = dateTime.setZone(zone, { keepLocalTime: true });
      }

      if (dateTime.isValid) {
        return dateTime.toUTC().toISO({ suppressMilliseconds: true });
      }
    }

    return null;
  };

  for (const zone of resolvedZones) {
    const result = parseWithZone(zone);
    if (result) {
      return result;
    }
  }

  return null;
};

export const getDefaultDateBounds = (timeZone, fallbackOffsetMinutes) => {
  const resolvedZone = timeZone || buildOffsetZone(fallbackOffsetMinutes) || "UTC";

  const start = DateTime.fromObject(
    { year: 2000, month: 1, day: 1, hour: 0, minute: 0, second: 0 },
    { zone: resolvedZone },
  )
    .setZone(resolvedZone, { keepLocalTime: true })
    .toUTC()
    .toISO({ suppressMilliseconds: true });

  const end = DateTime.fromObject(
    { year: 2100, month: 12, day: 31, hour: 23, minute: 59, second: 59 },
    { zone: resolvedZone },
  )
    .setZone(resolvedZone, { keepLocalTime: true })
    .toUTC()
    .toISO({ suppressMilliseconds: true });

  return { start, end };
};

/**
 * Format a UTC ISO string for datetime-local input (yyyy-MM-ddTHH:mm) in store timezone.
 * Store timezone is the source of truth for scheduling.
 */
export const formatUTCForDateTimeLocalInput = (utcIsoString, storeTimeZone) => {
  if (!utcIsoString) return "";
  const dt = DateTime.fromISO(utcIsoString, { zone: "UTC" });
  if (!dt.isValid) return "";
  const inStoreZone = dt.setZone(storeTimeZone || "UTC");
  return inStoreZone.toFormat("yyyy-MM-dd'T'HH:mm");
};

/**
 * Format a UTC ISO string for display in store timezone.
 */
export const formatUTCInStoreTime = (utcIsoString, storeTimeZone) => {
  if (!utcIsoString) return "";
  const dt = DateTime.fromISO(utcIsoString, { zone: "UTC" });
  if (!dt.isValid) return "";
  return dt.setZone(storeTimeZone || "UTC").toLocaleString(DateTime.DATETIME_MED);
};

/**
 * Format a UTC ISO string for display in user's local timezone.
 * Used for "In your timezone: X" note.
 */
export const formatUTCInUserTime = (utcIsoString, userTimeZone) => {
  if (!utcIsoString) return "";
  const dt = DateTime.fromISO(utcIsoString, { zone: "UTC" });
  if (!dt.isValid) return "";
  return dt.setZone(userTimeZone || "UTC").toLocaleString(DateTime.DATETIME_MED);
};

