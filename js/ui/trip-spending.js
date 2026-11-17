// trip-spending.js — the trip's spending (#/trip/:id/spending).
// Top: total in EUR, the budget (if set), a breakdown by category and who
// paid. Then booking prices (they count automatically) and the expenses by
// day. "+ Nauja išlaida" opens a quick form: amount, currency, category, and
// optionally note, date, who paid. For other currencies the euro amount is
// filled in from the day's exchange rate (rates.js); the user can overwrite it.

import { useEffect, useRef, useState } from 'preact/hooks';
import { html } from './html.js';
import { useStore, reloadSpending, reloadBookings, reloadTrips } from '../store.js';
import { t, formatDate, formatMoney, formatNumber, currencyName, parseAmount, amountForInput } from '../i18n.js';
import { paths } from '../router.js';
import { todayIso, CURRENCIES, updateTrip } from '../modules/trips.js';
import { setPriceEur } from '../modules/bookings.js';
import {
  CATEGORIES, validateExpense, createExpense, updateExpense, deleteExpense, undoDeleteExpense,
  summarize, bookingCosts, groupByDay, defaultExpenseDate, totalsByPayer, budgetUse
} from '../modules/spending.js';
import { getRate, toEur } from '../rates.js';
import { Field } from './field.js';
import { EmptyState } from './empty-state.js';
import { Modal } from './dialog.js';
import { NotFound } from './not-found.js';
import { showToast } from './toast.js';
import { TypeIcon } from './booking-parts.js';
import { ChevronLeft, PlusIcon, BusIcon, BedIcon, FoodIcon, TicketIcon, BagIcon, StarIcon } from './illustrations.js';

// Text key and icon of each category
export const CATEGORY_INFO = {
  transport: { key: 'spending.category.transport', Icon: BusIcon },
  accommodation: { key: 'spending.category.accommodation', Icon: BedIcon },
  food: { key: 'spending.category.food', Icon: FoodIcon },
  activities: { key: 'spending.category.activities', Icon: TicketIcon },
  shopping: { key: 'spending.category.shopping', Icon: BagIcon },
  other: { key: 'spending.category.other', Icon: StarIcon }
};

// Error code from validateExpense() -> text key
const ERROR_TEXT = {
  amount: { required: 'spending.error.amountRequired', invalid: 'spending.error.amountInvalid' },
  amountEur: { required: 'spending.error.eurRequired', invalid: 'spending.error.amountInvalid' },
  date: { required: 'spending.error.dateRequired' },
  category: { required: 'spending.error.categoryRequired' }
};

// "1 USD = 0,9048 €"; tiny rates per 100 units: "100 JPY = 0,5713 €"
function rateText(currency, rate) {
  const units = rate < 0.1 ? 100 : 1;
  const value = formatNumber(rate * units, { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return t('spending.rate.pair', { units: String(units), currency, value });
}

// Converts booking prices in other currencies to euros, using the rate of
// the booking's start day (or the newest rate). Runs quietly in the
// background; without internet the bookings simply wait for the next time.
let converting = false;
export async function convertBookingPrices(tripId, bookings) {
  const waiting = bookingCosts(bookings).filter((cost) => !cost.counted);
  if (converting || !waiting.length) return;
  converting = true;
  try {
    let changed = false;
    for (const { booking } of waiting) {
      const found = await getRate(booking.currency, (booking.startAt || '').slice(0, 10) || null);
      if (!found) continue;
      await setPriceEur(booking.id, {
        priceEur: toEur(booking.price, booking.currency, found.rate),
        priceRate: found.rate,
        priceRateDate: found.date
      });
      changed = true;
    }
    if (changed) await reloadBookings(tripId);
  } catch (error) {
    console.error(error);
  } finally {
    converting = false;
  }
}

// The add / edit box for one expense
function ExpenseDialog({ trip, expense, onClose }) {
  const [values, setValues] = useState(() => {
    if (expense) {
      const auto = expense.rateSource === 'auto';
      const manual = expense.currency !== 'EUR' && !auto;
      return {
        amountText: amountForInput(expense.amount, expense.currency),
        currency: expense.currency,
        eurText: manual ? amountForInput(expense.amountEur, 'EUR') : '',
        eurSource: manual ? 'manual' : 'auto',
        // An automatic expense keeps its saved rate until currency or date change
        rate: auto ? { status: 'ok', rate: expense.rateUsed, date: expense.rateDate, saved: false } : { status: 'idle' },
        category: expense.category,
        date: expense.date,
        note: expense.note,
        paidBy: expense.paidBy || ''
      };
    }
    return {
      amountText: '', currency: trip.currency || 'EUR', eurText: '', eurSource: 'auto', rate: { status: 'idle' },
      category: '', date: defaultExpenseDate(trip, todayIso()), note: '', paidBy: ''
    };
  });
  const [errors, setErrors] = useState({});
  const latest = useRef(values);
  const titleId = useRef('expense-dialog').current;
  const keepSavedRate = useRef(Boolean(expense && expense.rateSource === 'auto'));
  const travelers = trip.travelers || [];
  const isEur = values.currency === 'EUR';

  function set(field, value) {
    latest.current = { ...latest.current, [field]: value };
    setValues(latest.current);
    const errorField = { amountText: 'amount', eurText: 'amountEur' }[field] || field;
    if (errors[errorField]) setErrors((current) => ({ ...current, [errorField]: undefined }));
  }

  // Look up the rate when the currency or the date changes
  useEffect(() => {
    if (values.currency === 'EUR') return undefined;
    if (keepSavedRate.current) {
      keepSavedRate.current = false; // the first time only: keep the saved rate
      return undefined;
    }
    let current = true;
    set('rate', { status: 'loading' });
    getRate(values.currency, values.date || null).then((found) => {
      if (current) set('rate', found ? { status: 'ok', ...found } : { status: 'none' });
    });
    return () => { current = false; };
  }, [values.currency, values.date]);

  // The euro amount from the rate (null when it cannot be worked out)
  function autoEur(v) {
    const amount = parseAmount(v.amountText, v.currency);
    if (v.currency === 'EUR' || v.eurSource !== 'auto' || v.rate.status !== 'ok' || !Number.isInteger(amount)) return null;
    return toEur(amount, v.currency, v.rate.rate);
  }

  const shownEur = autoEur(values);
  const eurInputValue = shownEur !== null ? amountForInput(shownEur, 'EUR') : values.eurText;

  const errorText = (field) => (errors[field] ? t(ERROR_TEXT[field][errors[field]]) : '');

  function toExpense(v) {
    const input = {
      amount: parseAmount(v.amountText, v.currency),
      currency: v.currency,
      category: v.category,
      date: v.date,
      note: v.note,
      paidBy: v.paidBy || null
    };
    if (v.currency === 'EUR') return input;
    const auto = autoEur(v);
    return auto !== null
      ? { ...input, amountEur: auto, rateSource: 'auto', rateUsed: v.rate.rate, rateDate: v.rate.date }
      : { ...input, amountEur: parseAmount(v.eurText, 'EUR'), rateSource: 'manual' };
  }

  // What the line under the euro field says
  function rateHint() {
    if (values.eurSource === 'manual') return t('spending.rate.manual');
    const { status, rate, date, saved } = values.rate;
    if (status === 'ok') {
      const params = { pair: rateText(values.currency, rate), date: date ? formatDate(date, 'medium') : '' };
      return t(saved ? 'spending.rate.saved' : 'spending.rate.auto', params);
    }
    if (status === 'none') return t('spending.rate.none');
    return t('spending.rate.loading');
  }

  async function save(event) {
    event.preventDefault();
    const input = toExpense(latest.current);
    const found = validateExpense(input);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(found.amount ? 'expense-amount' : found.amountEur ? 'expense-eur' : 'expense-date')?.focus();
      return;
    }
    try {
      if (expense) await updateExpense(expense, input);
      else await createExpense(trip.id, input);
      await reloadSpending(trip.id);
      onClose();
      if (!expense) showToast({ text: t('toast.expenseAdded') });
    } catch (error) {
      console.error(error);
      showToast({ text: t('common.error') });
    }
  }

  async function remove() {
    onClose();
    try {
      const id = await deleteExpense(expense);
      await reloadSpending(trip.id);
      showToast({
        text: t('toast.expenseDeleted'),
        actionLabel: t('common.undo'),
        onAction: async () => {
          await undoDeleteExpense(id);
          await reloadSpending(trip.id);
        }
      });
    } catch (error) {
      console.error(error);
      showToast({ text: t('common.error') });
    }
  }

  return html`
    <${Modal} open=${true} onClose=${onClose} titleId=${titleId}>
      <h2 class="modal-title" id=${titleId}>${expense ? t('spending.editTitle') : t('spending.newTitle')}</h2>
      <form class="form modal-form" onSubmit=${save} noValidate>
        <div class="field-row amount-row">
          <${Field} id="expense-amount" label=${t('spending.field.amount')} error=${errorText('amount')}>
            <input id="expense-amount" class="input input-amount" type="text" inputmode="decimal" autocomplete="off"
              value=${values.amountText} placeholder=${amountForInput(0, values.currency)}
              onInput=${(event) => set('amountText', event.currentTarget.value)} />
          <//>
          <${Field} id="expense-currency" label=${t('spending.field.currency')}>
            <select id="expense-currency" class="input" value=${values.currency}
              onChange=${(event) => set('currency', event.currentTarget.value)}>
              ${CURRENCIES.map((code) => html`<option key=${code} value=${code}>${code} · ${currencyName(code)}</option>`)}
            </select>
          <//>
        </div>

        ${!isEur && html`
          <${Field} id="expense-eur" label=${t('spending.field.eur')} hint=${rateHint()} error=${errorText('amountEur')}>
            <input id="expense-eur" class="input" type="text" inputmode="decimal" autocomplete="off"
              value=${eurInputValue} placeholder=${amountForInput(0, 'EUR')}
              onInput=${(event) => {
                // Typing makes it a hand-entered amount; clearing it brings the rate back
                const text = event.currentTarget.value;
                set('eurText', text);
                set('eurSource', text.trim() ? 'manual' : 'auto');
              }} />
          <//>`}

        <div class="field">
          <span class="field-label" id="expense-category-label">${t('spending.field.category')}</span>
          <div class="type-picker type-picker-3" role="radiogroup" aria-labelledby="expense-category-label">
            ${CATEGORIES.map((category) => {
              const { key, Icon } = CATEGORY_INFO[category];
              return html`
                <button type="button" key=${category} role="radio" class="type-option"
                  aria-checked=${values.category === category} onClick=${() => set('category', category)}>
                  <${Icon} /><span>${t(key)}</span>
                </button>`;
            })}
          </div>
          ${errors.category && html`<p class="field-error" role="alert">${errorText('category')}</p>`}
        </div>

        <${Field} id="expense-note" label=${t('spending.field.note')}>
          <input id="expense-note" class="input" type="text" maxLength="100" autocomplete="off"
            value=${values.note} placeholder=${t('spending.field.notePlaceholder')}
            onInput=${(event) => set('note', event.currentTarget.value)} />
        <//>

        <div class=${travelers.length ? 'field-row' : ''}>
          <${Field} id="expense-date" label=${t('spending.field.date')} error=${errorText('date')}>
            <input id="expense-date" class="input" type="date" value=${values.date}
              onInput=${(event) => set('date', event.currentTarget.value)} />
          <//>
          ${travelers.length > 0 && html`
            <${Field} id="expense-paid-by" label=${t('spending.field.paidBy')}>
              <select id="expense-paid-by" class="input" value=${values.paidBy}
                onChange=${(event) => set('paidBy', event.currentTarget.value)}>
                <option value="">${t('spending.paidByNobody')}</option>
                ${travelers.map((person) => html`<option key=${person.id} value=${person.id}>${person.name}</option>`)}
              </select>
            <//>`}
        </div>

        <div class="modal-buttons">
          ${expense && html`<button type="button" class="button button-danger-text" onClick=${remove}>${t('spending.delete')}</button>`}
          <button type="button" class="button" onClick=${onClose}>${t('common.cancel')}</button>
          <button type="submit" class="button button-primary">${t('common.save')}</button>
        </div>
      </form>
    <//>`;
}

// The budget box: one total and, optionally, an amount per category (EUR)
function BudgetDialog({ trip, onClose }) {
  const budget = trip.budget || null;
  // A total that is just the categories added up stays empty, so it keeps adding up
  const categorySum = budget ? Object.values(budget.byCategory).reduce((a, b) => a + b, 0) : 0;
  const [values, setValues] = useState(() => ({
    total: budget && budget.total !== categorySum ? amountForInput(budget.total, 'EUR') : '',
    ...Object.fromEntries(CATEGORIES.map((category) => [
      category, budget && budget.byCategory[category] ? amountForInput(budget.byCategory[category], 'EUR') : ''
    ]))
  }));
  const [errors, setErrors] = useState({});
  const latest = useRef(values);
  const titleId = useRef('budget-dialog').current;

  function set(field, value) {
    latest.current = { ...latest.current, [field]: value };
    setValues(latest.current);
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  // Saves a budget (or null) and offers Undo back to the one before
  async function store(next, toastKey) {
    const before = trip.budget || null;
    await updateTrip(trip.id, { budget: next });
    await reloadTrips();
    onClose();
    showToast({
      text: t(toastKey),
      actionLabel: t('common.undo'),
      onAction: async () => {
        await updateTrip(trip.id, { budget: before });
        await reloadTrips();
      }
    });
  }

  async function save(event) {
    event.preventDefault();
    const v = latest.current;
    const found = {};
    const read = (field) => {
      const value = parseAmount(v[field], 'EUR');
      if (Number.isNaN(value)) found[field] = true;
      return value;
    };
    const total = read('total');
    const byCategory = Object.fromEntries(CATEGORIES.map((category) => [category, read(category)]));
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById('budget-' + Object.keys(found)[0])?.focus();
      return;
    }
    try {
      await store({ total, byCategory }, 'toast.budgetSaved');
    } catch (error) {
      console.error(error);
      showToast({ text: t('common.error') });
    }
  }

  async function remove() {
    try {
      await store(null, 'toast.budgetRemoved');
    } catch (error) {
      console.error(error);
      showToast({ text: t('common.error') });
    }
  }

  const amountInput = (field) => html`
    <input id=${'budget-' + field} class="input" type="text" inputmode="decimal" autocomplete="off"
      value=${values[field]} placeholder=${amountForInput(0, 'EUR')}
      onInput=${(event) => set(field, event.currentTarget.value)} />`;

  return html`
    <${Modal} open=${true} onClose=${onClose} titleId=${titleId}>
      <h2 class="modal-title" id=${titleId}>${t('spending.budget.title')}</h2>
      <form class="form modal-form" onSubmit=${save} noValidate>
        <${Field} id="budget-total" label=${t('spending.budget.total')} hint=${t('spending.budget.totalHint')}
          error=${errors.total ? t('spending.error.amountInvalid') : ''}>
          ${amountInput('total')}
        <//>
        <p class="field-label">${t('spending.budget.byCategory')}</p>
        <div class="budget-grid">
          ${CATEGORIES.map((category) => html`
            <${Field} key=${category} id=${'budget-' + category} label=${t(CATEGORY_INFO[category].key)}
              error=${errors[category] ? t('spending.error.amountInvalid') : ''}>
              ${amountInput(category)}
            <//>`)}
        </div>
        <div class="modal-buttons">
          ${budget && html`<button type="button" class="button button-danger-text" onClick=${remove}>${t('spending.budget.remove')}</button>`}
          <button type="button" class="button" onClick=${onClose}>${t('common.cancel')}</button>
          <button type="submit" class="button button-primary">${t('common.save')}</button>
        </div>
      </form>
    <//>`;
}

// "of 2 000,00 € · 766,00 € left" (or "… over")
export function BudgetLine({ use }) {
  return html`
    <p class=${'spend-budget-line' + (use.over ? ' is-over' : '')}>
      ${t('spending.budget.of', { amount: formatMoney(use.budget, 'EUR') })}
      ${' · '}
      ${use.over
        ? t('spending.budget.over', { amount: formatMoney(-use.left, 'EUR') })
        : t('spending.budget.left', { amount: formatMoney(use.left, 'EUR') })}
    </p>`;
}

export function Bar({ share, over }) {
  const width = Math.max(0, Math.min(100, Math.round(share * 100)));
  return html`<span class=${'spend-bar' + (over ? ' is-over' : '')}><span style=${{ width: width + '%' }}></span></span>`;
}

function Summary({ trip, summary, expenses, onBudget }) {
  const budget = trip.budget || null;
  const catBudget = (category) => (budget && budget.byCategory[category]) || 0;
  const biggest = Math.max(1, ...Object.values(summary.byCategory));
  const rows = CATEGORIES.filter((category) => summary.byCategory[category] > 0 || catBudget(category) > 0);
  const travelers = trip.travelers || [];
  const payers = travelers.length && expenses.some((expense) => expense.paidBy)
    ? totalsByPayer(expenses, travelers) : [];
  const nameOf = (personId) => (travelers.find((p) => p.id === personId) || {}).name || '';
  const total = budget ? budgetUse(summary.total, budget.total) : null;

  return html`
    <div class="spend-summary">
      <p class="spend-label">${t('spending.total')}</p>
      <p class="spend-total">${formatMoney(summary.total, 'EUR')}</p>
      ${total && html`<${BudgetLine} use=${total} /><${Bar} share=${total.share} over=${total.over} />`}

      ${rows.length > 0 && html`
        <ul class="spend-bars">
          ${rows.map((category) => {
            const { key, Icon } = CATEGORY_INFO[category];
            const value = summary.byCategory[category];
            const limit = catBudget(category);
            const use = limit ? budgetUse(value, limit) : null;
            return html`
              <li class="spend-bar-row" key=${category}>
                <span class="spend-bar-name"><${Icon} />${t(key)}</span>
                <span class=${'spend-bar-amount' + (use && use.over ? ' is-over' : '')}>
                  ${use
                    ? t('spending.budget.amountOf', { amount: formatMoney(value, 'EUR'), budget: formatMoney(limit, 'EUR') })
                    : formatMoney(value, 'EUR')}
                </span>
                <${Bar} share=${use ? use.share : value / biggest} over=${use && use.over} />
              </li>`;
          })}
        </ul>`}

      ${payers.length > 0 && html`
        <p class="spend-label spend-payers-title">${t('spending.payers')}</p>
        <ul class="spend-payers">
          ${payers.map((row) => html`
            <li key=${row.id || 'none'}>
              <span>${row.id ? nameOf(row.id) : t('spending.paidByNobody')}</span>
              <span class="spend-bar-amount">${formatMoney(row.total, 'EUR')}</span>
            </li>`)}
        </ul>`}

      <button type="button" class="button button-small spend-budget-button" onClick=${onBudget}>
        ${budget ? t('spending.budget.edit') : t('spending.budget.set')}
      </button>
    </div>`;
}

export function TripSpending({ id }) {
  const trips = useStore((s) => s.trips);
  const spending = useStore((s) => s.spending);
  const bookings = useStore((s) => s.bookings);
  const [dialog, setDialog] = useState(null); // { expense } or {}
  const [budgetOpen, setBudgetOpen] = useState(false);

  useEffect(() => {
    Promise.all([reloadSpending(id), reloadBookings(id)]).catch((error) => console.error(error));
  }, [id]);

  const loaded = spending.tripId === id && bookings.tripId === id;

  // Booking prices in other currencies: convert them when we can
  useEffect(() => {
    if (loaded) convertBookingPrices(id, bookings.items);
  }, [loaded, bookings.items]);

  const trip = trips.find((item) => item.id === id);
  if (!trip) return html`<${NotFound} />`;

  const expenses = loaded ? spending.items : [];
  const tripBookings = loaded ? bookings.items : [];
  const summary = summarize(expenses, tripBookings);
  const costs = bookingCosts(tripBookings);
  const travelers = trip.travelers || [];
  const nameOf = (personId) => (travelers.find((p) => p.id === personId) || {}).name || '';

  return html`
    <section class="screen">
      <a class="back-link" href=${paths.trip(id)}><${ChevronLeft} /><span>${trip.name}</span></a>
      <h1 class="screen-title screen-head">${t('dashboard.tiles.spending')}</h1>

      <${Summary} trip=${trip} summary=${summary} expenses=${expenses} onBudget=${() => setBudgetOpen(true)} />
      <button type="button" class="button button-primary spend-add" onClick=${() => setDialog({})}>
        <${PlusIcon} /><span>${t('spending.add')}</span>
      </button>

      ${loaded && expenses.length === 0 && costs.length === 0 && html`
        <${EmptyState} title=${t('spending.emptyTitle')} text=${t('spending.emptyText')} />`}

      ${costs.length > 0 && html`
        <section class="spend-group">
          <h2 class="section-title">${t('spending.bookings')}</h2>
          <ul class="spend-list">
            ${costs.map(({ booking, counted, amountEur }) => {
              const currency = booking.currency || 'EUR';
              return html`
                <li key=${booking.id}>
                  <a class="spend-row" href=${paths.booking(trip.id, booking.id)}>
                    <span class="plan-icon"><${TypeIcon} type=${booking.type} /></span>
                    <span class="spend-text">
                      <span class="spend-title">${booking.title}</span>
                      ${!counted && html`<span class="spend-sub">${t('spending.notCounted')}</span>`}
                    </span>
                    <span class="spend-amount">
                      ${formatMoney(booking.price, currency)}
                      ${counted && currency !== 'EUR' && html`<span class="spend-eur">≈ ${formatMoney(amountEur, 'EUR')}</span>`}
                    </span>
                  </a>
                </li>`;
            })}
          </ul>
        </section>`}

      ${groupByDay(expenses).map((group) => html`
        <section class="spend-group" key=${group.date}>
          <h2 class="section-title spend-day">
            <span>${formatDate(group.date, 'day')}</span>
            <span class="spend-day-total">${formatMoney(group.total, 'EUR')}</span>
          </h2>
          <ul class="spend-list">
            ${group.expenses.map((expense) => {
              const { key, Icon } = CATEGORY_INFO[expense.category] || CATEGORY_INFO.other;
              return html`
                <li key=${expense.id}>
                  <button type="button" class="spend-row" onClick=${() => setDialog({ expense })}>
                    <span class="plan-icon is-own"><${Icon} /></span>
                    <span class="spend-text">
                      <span class="spend-title">${expense.note || t(key)}</span>
                      ${expense.paidBy && nameOf(expense.paidBy) && html`<span class="spend-sub">${t('spending.paidByName', { name: nameOf(expense.paidBy) })}</span>`}
                    </span>
                    <span class="spend-amount">
                      ${formatMoney(expense.amount, expense.currency)}
                      ${expense.currency !== 'EUR' && html`<span class="spend-eur">≈ ${formatMoney(expense.amountEur, 'EUR')}</span>`}
                    </span>
                  </button>
                </li>`;
            })}
          </ul>
        </section>`)}

      ${dialog && html`<${ExpenseDialog} trip=${trip} expense=${dialog.expense || null} onClose=${() => setDialog(null)} />`}
      ${budgetOpen && html`<${BudgetDialog} trip=${trip} onClose=${() => setBudgetOpen(false)} />`}
    </section>`;
}
