// rates.js — exchange rates to EUR. The app's ONE network call (rule 5).
// Source: Frankfurter, free daily rates published by the European Central Bank.
// Every rate we get is saved in the 'rates' setting, so a rate seen once still
// works offline. Without internet and without a saved rate we return null and
// the user types the euro amount themselves.
//
// getRate('USD', '2026-11-14') ->
//   { rate: 0.90481, date: '2026-11-13', saved: false }
//   rate  = euros per 1 unit; date = the day the bank published it (weekends
//   and holidays use the last working day); saved = taken from the saved copy
//   because we could not go online.

import { getSetting, setSetting } from './db.js';

const API = 'https://api.frankfurter.dev/v1/'; // allowed network call (exchange rates)
const TIMEOUT_MS = 8000;
const MAX_SAVED = 300; // keep the saved copy small

function todayIso() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Asks the service; returns { rate, date }, 'unsupported' or null (offline / error)
async function fetchRate(currency, day) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = API + day + '?from=' + encodeURIComponent(currency) + '&to=EUR';
    const response = await fetch(url, { signal: controller.signal });
    if (response.status === 404) return 'unsupported';
    if (!response.ok) return null;
    const data = await response.json();
    const rate = data && data.rates && data.rates.EUR;
    return typeof rate === 'number' && rate > 0 ? { rate, date: data.date } : null;
  } catch {
    return null; // offline, timeout or a broken answer
  } finally {
    clearTimeout(timer);
  }
}

// The newest saved rate for a currency (used when offline)
function newestSaved(saved, currency) {
  return Object.entries(saved)
    .filter(([key]) => key.startsWith(currency + ':'))
    .map(([, value]) => value)
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

// The rate for a day (future days use the newest rate). Null when unknown.
export async function getRate(currency, date) {
  if (!currency || currency === 'EUR') return { rate: 1, date, saved: false };
  const today = todayIso();
  const wanted = !date || date >= today ? 'latest' : date;
  const key = currency + ':' + wanted;
  const saved = (await getSetting('rates', {})) || {};

  // Past days never change; "latest" is reused on the day it was fetched
  const hit = saved[key];
  if (hit && (wanted !== 'latest' || hit.fetchedOn === today)) {
    return { rate: hit.rate, date: hit.date, saved: false };
  }

  const answer = await fetchRate(currency, wanted);
  if (answer === 'unsupported') return null;
  if (answer) {
    saved[key] = { rate: answer.rate, date: answer.date, fetchedOn: today };
    await setSetting('rates', trim(saved));
    return { rate: answer.rate, date: answer.date, saved: false };
  }

  // Could not go online: the closest thing we have
  const fallback = hit || newestSaved(saved, currency);
  return fallback ? { rate: fallback.rate, date: fallback.date, saved: true } : null;
}

// Drops the oldest fetched entries when the saved copy grows too big
function trim(saved) {
  const entries = Object.entries(saved);
  if (entries.length <= MAX_SAVED) return saved;
  entries.sort((a, b) => b[1].fetchedOn.localeCompare(a[1].fetchedOn));
  return Object.fromEntries(entries.slice(0, MAX_SAVED));
}

// amount (minor units of currency) × rate -> euro cents
export function toEur(amount, currency, rate) {
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
  return Math.round((amount / 10 ** digits) * rate * 100);
}
