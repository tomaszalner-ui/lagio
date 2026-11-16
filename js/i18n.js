// i18n.js — translations and formatting ("i18n" = internationalisation).
//
// Every visible word comes from lang/lt.json or lang/en.json:
//   t('home.title')                  -> "Mano kelionės"
//   t('dashboard.days', { count: 5 }) -> "5 dienos" (plural form chosen for you)
// Dates, numbers and money also go through the functions here, so they look
// right in each language. Lithuanian is the default.

import { setState } from './store.js';
import { getSetting, setSetting } from './db.js';

export const LANGUAGES = ['lt', 'en'];
const DEFAULT_LANG = 'lt';

// Which regional format each language uses. en-GB gives "16 November 2026"
// and a 24-hour clock, which suits European travellers.
const LOCALES = { lt: 'lt-LT', en: 'en-GB' };

const dictionaries = {}; // loaded JSON files, by language
let lang = DEFAULT_LANG;
let pluralRules = new Intl.PluralRules(LOCALES[DEFAULT_LANG]);

// Loads lang/<code>.json. This is the app's own file (kept offline by the
// service worker), not a call to the internet.
async function loadDictionary(code) {
  if (!dictionaries[code]) {
    const response = await fetch(`lang/${code}.json`);
    if (!response.ok) throw new Error(`Could not load lang/${code}.json`);
    dictionaries[code] = await response.json();
  }
  return dictionaries[code];
}

async function applyLanguage(code) {
  await loadDictionary(code);
  lang = code;
  pluralRules = new Intl.PluralRules(LOCALES[code]);
  document.documentElement.lang = code;
  document.title = t('app.name');
  setState({ lang: code }); // screens redraw in the new language
}

// Called once at start: Lithuanian, or the language the user picked before.
export async function initI18n() {
  await loadDictionary(DEFAULT_LANG); // always loaded, used as a fallback
  let saved = null;
  try {
    saved = await getSetting('language');
  } catch (error) {
    // Storage not available: just use the default language
  }
  await applyLanguage(LANGUAGES.includes(saved) ? saved : DEFAULT_LANG);
}

// Switches language and remembers the choice on this device.
export async function setLanguage(code) {
  if (!LANGUAGES.includes(code) || code === lang) return;
  await applyLanguage(code);
  await setSetting('language', code);
}

export function getLanguage() {
  return lang;
}

// ---------- texts ----------

function lookup(key) {
  const own = dictionaries[lang] && dictionaries[lang][key];
  if (own !== undefined) return own;
  const fallback = dictionaries[DEFAULT_LANG] && dictionaries[DEFAULT_LANG][key];
  if (fallback !== undefined) return fallback;
  console.warn('Missing text key:', key);
  return key;
}

// Puts values into {placeholders}. Numbers are formatted for the language.
function fill(text, params) {
  return text.replace(/\{(\w+)\}/g, (whole, name) => {
    if (!(name in params)) return whole;
    const value = params[name];
    return typeof value === 'number' ? formatNumber(value) : String(value);
  });
}

// t(key, params): the text for `key` in the current language.
// If the text has plural forms ({ "one": …, "few": …, "other": … }),
// params.count chooses the right one. Lithuanian uses one / few / many / other:
// 1 kelionė, 2 kelionės, 10 kelionių, 1,5 kelionės.
export function t(key, params = {}) {
  let text = lookup(key);
  if (text && typeof text === 'object') {
    const form = pluralRules.select(Number(params.count) || 0);
    text = text[form] ?? text.other ?? key;
  }
  return fill(String(text), params);
}

// ---------- numbers and money ----------

function locale() {
  return LOCALES[lang];
}

// 1234.5 -> "1 234,5" (lt) / "1,234.5" (en)
export function formatNumber(value, options) {
  return new Intl.NumberFormat(locale(), options).format(value);
}

// How many decimals a currency uses: EUR 2, JPY 0.
function currencyDigits(currency) {
  return new Intl.NumberFormat('en', { style: 'currency', currency })
    .resolvedOptions().maximumFractionDigits;
}

// Money is stored as whole "minor units" (cents) so sums are always exact.
// formatMoney(1250, 'EUR') -> "12,50 €" (lt) / "€12.50" (en)
export function formatMoney(minorUnits, currency = 'EUR') {
  const value = minorUnits / 10 ** currencyDigits(currency);
  return new Intl.NumberFormat(locale(), { style: 'currency', currency }).format(value);
}

// ---------- dates ----------

// Dates are saved as ISO strings in the local time of the place:
// '2026-11-16' or '2026-11-16T14:30'. We read them as local time on purpose:
// new Date('2026-11-16') would treat it as UTC and could show the wrong day.
export function parseLocalDate(iso) {
  const [datePart, timePart = '00:00'] = String(iso).split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hours || 0, minutes || 0);
}

// (month: 'short' would give "11-16" in Lithuanian, so short uses the full month)
const DATE_STYLES = {
  short: { month: 'long', day: 'numeric' },                   // lapkričio 16 d. / 16 November
  medium: { year: 'numeric', month: 'long', day: 'numeric' }, // 2026 m. lapkričio 16 d.
  long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
};

// formatDate('2026-11-16', 'medium') -> "2026 m. lapkričio 16 d." / "16 November 2026"
export function formatDate(iso, style = 'medium') {
  return new Intl.DateTimeFormat(locale(), DATE_STYLES[style] || DATE_STYLES.medium)
    .format(parseLocalDate(iso));
}

// The month as it is written next to a day: "gruodžio" / "December"
function monthWithDay(date) {
  return new Intl.DateTimeFormat(locale(), { month: 'long', day: 'numeric' })
    .formatToParts(date)
    .find((part) => part.type === 'month').value;
}

// A trip's dates: "gruodžio 20–27 d." / "20–27 December".
// The year is shown only when the dates are not in the current year.
// Only a start date: just that date. No dates: ''.
// The patterns live in the language files (date.range.*), because the
// browser's own range format drops the Lithuanian "d." and "m.".
export function formatDateRange(startIso, endIso) {
  if (!startIso) return '';
  const thisYear = String(new Date().getFullYear());
  const start = parseLocalDate(startIso);
  if (!endIso || endIso === startIso) {
    return formatDate(startIso, String(start.getFullYear()) === thisYear ? 'short' : 'medium');
  }
  const end = parseLocalDate(endIso);
  // Strings, not numbers, so the year is not written as "2 026"
  const params = {
    day1: String(start.getDate()), month1: monthWithDay(start), year1: String(start.getFullYear()),
    day2: String(end.getDate()), month2: monthWithDay(end), year2: String(end.getFullYear())
  };
  if (params.year1 !== params.year2) return t('date.range.differentYears', params);
  const withYear = params.year1 !== thisYear;
  if (start.getMonth() === end.getMonth()) {
    return t(withYear ? 'date.range.sameMonthWithYear' : 'date.range.sameMonth', params);
  }
  return t(withYear ? 'date.range.sameYearWithYear' : 'date.range.sameYear', params);
}

// 'EUR' -> "euras" / "Euro". The names come from the browser (Intl), so they
// need no translation keys. Falls back to the code.
export function currencyName(code) {
  try {
    return new Intl.DisplayNames([locale()], { type: 'currency' }).of(code) || code;
  } catch (error) {
    return code;
  }
}

// When something was saved: '2026-11-16T09:51:00.000Z' -> "lapkričio 16 d."
// (a real moment in time, shown in this phone's time zone)
export function formatTimestamp(iso) {
  return new Intl.DateTimeFormat(locale(), DATE_STYLES.short).format(new Date(iso));
}

// File sizes: 3 560 000 -> "3,4 MB", 48 000 -> "47 kB"
export function formatFileSize(bytes) {
  const megabytes = bytes / (1024 * 1024);
  if (megabytes >= 1) {
    return formatNumber(megabytes, { style: 'unit', unit: 'megabyte', maximumFractionDigits: 1 });
  }
  return formatNumber(Math.max(1, Math.round(bytes / 1024)), { style: 'unit', unit: 'kilobyte' });
}

// formatTime('2026-11-16T14:30') -> "14:30"
export function formatTime(iso) {
  return new Intl.DateTimeFormat(locale(), { hour: '2-digit', minute: '2-digit' })
    .format(parseLocalDate(iso));
}
