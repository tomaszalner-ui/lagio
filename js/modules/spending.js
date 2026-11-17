// modules/spending.js — the trip's expenses and totals.
// Uses only db.js; no screen code and no text.
//
// An expense (base fields are added by db.js), in the 'expenses' store:
//   date       '2026-12-20'
//   category   one of CATEGORIES (a key; the screen translates it)
//   amount     in the currency's minor units (cents): 1250 = 12,50
//   currency   'EUR', 'USD', …
//   amountEur  the same in euro cents. For EUR it equals amount; otherwise it
//              is the automatic rate's result, or what the user typed (e.g.
//              the real amount from their bank)
//   rateUsed   euros per 1 unit of the currency (1 for EUR), saved so the
//              totals never change later
//   rateSource 'same' (EUR), 'manual' (typed), 'auto' (exchange rate, rates.js)
//   rateDate   for 'auto': the day the bank published the rate, else null
//   note       'Picerija prie Panteono'
//   paidBy     a traveler's id, or null
// Totals are always in EUR. Booking prices count automatically (see
// summarize); a price in another currency counts once it has priceEur.

import { create, list, update, softDelete, restore } from '../db.js';

export const CATEGORIES = ['transport', 'accommodation', 'food', 'activities', 'shopping', 'other'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Which spending category each booking type counts as
const BOOKING_CATEGORY = {
  flight: 'transport', train: 'transport', bus: 'transport', ferry: 'transport', car: 'transport',
  stay: 'accommodation', event: 'activities', other: 'other'
};

// How many decimals a currency has (EUR 2, JPY 0)
function digits(currency) {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
}

// Euros per 1 unit, from the two amounts (both in minor units)
export function rateFrom(amount, currency, amountEur) {
  if (!amount) return null;
  const rate = (amountEur / 100) / (amount / 10 ** digits(currency));
  return Math.round(rate * 1e6) / 1e6; // 6 decimals: 0.92, not 0.9199999999999999
}

// Problems as codes, e.g. { amount: 'required', amountEur: 'required' }
export function validateExpense(input) {
  const errors = {};
  if (!(Number.isInteger(input.amount) && input.amount > 0)) {
    errors.amount = Number.isNaN(input.amount) ? 'invalid' : 'required';
  }
  if (!ISO_DATE.test(input.date || '')) errors.date = 'required';
  if (!CATEGORIES.includes(input.category)) errors.category = 'required';
  if (input.currency && input.currency !== 'EUR') {
    if (!(Number.isInteger(input.amountEur) && input.amountEur >= 0)) {
      errors.amountEur = Number.isNaN(input.amountEur) ? 'invalid' : 'required';
    }
  }
  return errors;
}

function cleanExpense(input) {
  const currency = input.currency || 'EUR';
  const isEur = currency === 'EUR';
  const amountEur = isEur ? input.amount : input.amountEur;
  // An automatic rate is kept as fetched; a typed amount gets its rate worked out
  const auto = !isEur && input.rateSource === 'auto' && typeof input.rateUsed === 'number';
  return {
    date: input.date,
    category: input.category,
    amount: input.amount,
    currency,
    amountEur,
    rateUsed: isEur ? 1 : auto ? input.rateUsed : rateFrom(input.amount, currency, amountEur),
    rateSource: isEur ? 'same' : auto ? 'auto' : 'manual',
    rateDate: auto ? input.rateDate || null : null,
    note: String(input.note || '').trim(),
    paidBy: input.paidBy || null
  };
}

function assertValid(input) {
  const errors = validateExpense(input);
  if (Object.keys(errors).length) throw new Error('Invalid expense: ' + JSON.stringify(errors));
}

// Newest day first; inside a day, the latest added first
export async function listExpenses(tripId) {
  const expenses = await list('expenses', { tripId });
  return expenses.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export function createExpense(tripId, input) {
  assertValid(input);
  return create('expenses', { ...cleanExpense(input), tripId });
}

export function updateExpense(expense, changes) {
  const merged = { ...expense, ...changes };
  assertValid(merged);
  return update('expenses', expense.id, cleanExpense(merged));
}

export async function deleteExpense(expense) {
  await softDelete('expenses', expense.id);
  return expense.id;
}

export function undoDeleteExpense(id) {
  return restore('expenses', id);
}

// ---------- totals ----------

// Bookings that have a price, as spending entries.
// counted: false for a price in another currency not yet converted to euros
export function bookingCosts(bookings) {
  return bookings
    .filter((booking) => Number.isInteger(booking.price) && booking.price > 0)
    .map((booking) => {
      const counted = (booking.currency || 'EUR') === 'EUR' || Number.isInteger(booking.priceEur);
      return {
        booking,
        category: BOOKING_CATEGORY[booking.type] || 'other',
        amountEur: (booking.currency || 'EUR') === 'EUR' ? booking.price : (booking.priceEur ?? null),
        counted
      };
    });
}

// { total, expensesTotal, bookingsTotal, byCategory: { food: 1250, … },
//   expenseCount, uncounted: [bookings in another currency] } — all in euro cents
export function summarize(expenses, bookings) {
  const byCategory = Object.fromEntries(CATEGORIES.map((category) => [category, 0]));
  let expensesTotal = 0;
  for (const expense of expenses) {
    expensesTotal += expense.amountEur || 0;
    byCategory[expense.category] = (byCategory[expense.category] || 0) + (expense.amountEur || 0);
  }
  let bookingsTotal = 0;
  const uncounted = [];
  for (const cost of bookingCosts(bookings)) {
    if (!cost.counted) {
      uncounted.push(cost.booking);
      continue;
    }
    bookingsTotal += cost.amountEur;
    byCategory[cost.category] += cost.amountEur;
  }
  return {
    total: expensesTotal + bookingsTotal,
    expensesTotal,
    bookingsTotal,
    byCategory,
    expenseCount: expenses.length,
    uncounted
  };
}

// Expenses grouped by day (already sorted newest first): [{ date, expenses, total }]
export function groupByDay(expenses) {
  const groups = [];
  for (const expense of expenses) {
    const last = groups[groups.length - 1];
    if (last && last.date === expense.date) {
      last.expenses.push(expense);
      last.total += expense.amountEur || 0;
    } else {
      groups.push({ date: expense.date, expenses: [expense], total: expense.amountEur || 0 });
    }
  }
  return groups;
}

// The day a new expense gets: today during the trip, otherwise the trip's
// first day (or today if the trip has no dates)
export function defaultExpenseDate(trip, today) {
  if (!trip.startDate) return today;
  const end = trip.endDate || trip.startDate;
  if (today >= trip.startDate && today <= end) return today;
  return today < trip.startDate ? trip.startDate : end;
}

// Who paid how much (expenses only; bookings have no payer):
// [{ id: travelerId or null for "not set", total }] in the travelers' order
export function totalsByPayer(expenses, travelers) {
  const totals = new Map((travelers || []).map((person) => [person.id, 0]));
  let unknown = 0;
  for (const expense of expenses) {
    if (expense.paidBy && totals.has(expense.paidBy)) {
      totals.set(expense.paidBy, totals.get(expense.paidBy) + (expense.amountEur || 0));
    } else {
      unknown += expense.amountEur || 0;
    }
  }
  const rows = [...totals].map(([id, total]) => ({ id, total }));
  if (unknown > 0) rows.push({ id: null, total: unknown });
  return rows;
}

// Spent compared with a budget (all euro cents):
// { spent, budget, left (negative when over), share (0..1+), over }
export function budgetUse(spent, budget) {
  return { spent, budget, left: budget - spent, share: budget ? spent / budget : 0, over: spent > budget };
}
