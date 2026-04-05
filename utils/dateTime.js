import { env } from '../config/env.js';

const DEFAULT_TIME_ZONE = env.APP_TIMEZONE || 'Africa/Porto-Novo';

function pad2(value) {
  return String(value).padStart(2, '0');
}

function parsePlainDateTime(raw) {
  const normalized = String(raw ?? '').trim().replace(' ', 'T');
  const matches = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/,
  );
  if (!matches) return null;

  const [, year, month, day, hours, minutes, seconds = '00', millis = '0'] = matches;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hours: Number(hours),
    minutes: Number(minutes),
    seconds: Number(seconds),
    millis: Number(String(millis).padEnd(3, '0')),
  };
}

function getFormatter(timeZone, locale = 'en-CA') {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
}

function getPartsInTimeZone(date, timeZone) {
  const parts = getFormatter(timeZone).formatToParts(date);
  const lookup = {};
  for (const part of parts) {
    if (part.type !== 'literal') lookup[part.type] = part.value;
  }
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hours: Number(lookup.hour),
    minutes: Number(lookup.minute),
    seconds: Number(lookup.second),
  };
}

function getOffsetMinutes(date, timeZone) {
  const localParts = getPartsInTimeZone(date, timeZone);
  const zonedUtc = Date.UTC(
    localParts.year,
    localParts.month - 1,
    localParts.day,
    localParts.hours,
    localParts.minutes,
    localParts.seconds,
  );
  return Math.round((zonedUtc - date.getTime()) / 60000);
}

function parseStoredUtcDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const explicitDate = new Date(raw);
  if (!Number.isNaN(explicitDate.getTime()) && /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw)) {
    return explicitDate;
  }

  const parts = parsePlainDateTime(raw);
  if (!parts) {
    return Number.isNaN(explicitDate.getTime()) ? null : explicitDate;
  }

  return new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hours,
      parts.minutes,
      parts.seconds,
      parts.millis,
    ),
  );
}

function formatUtcSqlDateTime(date) {
  return [
    `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`,
    `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}`,
  ].join(' ');
}

function toUtcDateFromZonedLocal(parts, timeZone) {
  const baseUtcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hours,
    parts.minutes,
    parts.seconds,
    parts.millis ?? 0,
  );

  let candidateMs = baseUtcMs;
  for (let index = 0; index < 3; index += 1) {
    const offsetMinutes = getOffsetMinutes(new Date(candidateMs), timeZone);
    const nextCandidateMs = baseUtcMs - offsetMinutes * 60 * 1000;
    if (nextCandidateMs === candidateMs) break;
    candidateMs = nextCandidateMs;
  }

  return new Date(candidateMs);
}

export function getAppTimeZone() {
  return DEFAULT_TIME_ZONE;
}

export function normalizeDateTimeLocalToUtcSql(value, timeZone = getAppTimeZone()) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    const err = new Error('Selectionne la date et l heure de debut.');
    err.statusCode = 400;
    throw err;
  }

  const parts = parsePlainDateTime(raw);
  if (!parts) {
    const err = new Error('Le format de debut est invalide.');
    err.statusCode = 400;
    throw err;
  }

  return formatUtcSqlDateTime(toUtcDateFromZonedLocal(parts, timeZone));
}

export function formatDateTimeLocalInputValue(value, timeZone = getAppTimeZone()) {
  const date = parseStoredUtcDate(value);
  if (!date) return '';
  const parts = getPartsInTimeZone(date, timeZone);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hours)}:${pad2(parts.minutes)}`;
}

export function formatDateTimeForDisplay(value, timeZone = getAppTimeZone(), locale = 'fr-FR') {
  const date = parseStoredUtcDate(value);
  if (!date) return 'Non renseigne';
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    dateStyle: 'short',
    timeStyle: 'short',
    hourCycle: 'h23',
  }).format(date);
}
