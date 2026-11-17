// trip-spending.js — the trip's spending (#/trip/:id/spending).
// Top: total in EUR and a breakdown by category. Then booking prices (they
// count automatically) and the expenses by day. "+ Nauja išlaida" opens a
// quick form: amount, currency, category, and optionally note, date, who paid.

import { useEffect, useRef, useState } from 'preact/hooks';
import { html } from './html.js';
import { useStore, reloadSpending, reloadBookings } from '../store.js';
import { t, formatDate, formatMoney, currencyName, parseAmount, amountForInput } from '../i18n.js';
import { paths } from '../router.js';
import { todayIso, CURRENCIES } from '../modules/trips.js';
import {
  CATEGORIES, validateExpense, createExpense, updateExpense, deleteExpense, undoDeleteExpense,
  summarize, bookingCosts, groupByDay, defaultExpenseDate
} from '../modules/spending.js';
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

// The add / edit box for one expense
function ExpenseDialog({ trip, expense, onClose }) {
  const [values, setValues] = useState(() => expense
    ? {
      amountText: amountForInput(expense.amount, expense.currency),
      currency: expense.currency,
      eurText: expense.currency === 'EUR' ? '' : amountForInput(expense.amountEur, 'EUR'),
      category: expense.category,
      date: expense.date,
      note: expense.note,
      paidBy: expense.paidBy || ''
    }
    : {
      amountText: '', currency: trip.currency || 'EUR', eurText: '', category: '',
      date: defaultExpenseDate(trip, todayIso()), note: '', paidBy: ''
    });
  const [errors, setErrors] = useState({});
  const latest = useRef(values);
  const titleId = useRef('expense-dialog').current;
  const travelers = trip.travelers || [];
  const isEur = values.currency === 'EUR';

  function set(field, value) {
    latest.current = { ...latest.current, [field]: value };
    setValues(latest.current);
    const errorField = { amountText: 'amount', eurText: 'amountEur' }[field] || field;
    if (errors[errorField]) setErrors((current) => ({ ...current, [errorField]: undefined }));
  }

  const errorText = (field) => (errors[field] ? t(ERROR_TEXT[field][errors[field]]) : '');

  function toExpense(v) {
    return {
      amount: parseAmount(v.amountText, v.currency),
      currency: v.currency,
      amountEur: v.currency === 'EUR' ? undefined : parseAmount(v.eurText, 'EUR'),
      category: v.category,
      date: v.date,
      note: v.note,
      paidBy: v.paidBy || null
    };
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
          <${Field} id="expense-eur" label=${t('spending.field.eur')} hint=${t('spending.field.eurHint')} error=${errorText('amountEur')}>
            <input id="expense-eur" class="input" type="text" inputmode="decimal" autocomplete="off"
              value=${values.eurText} placeholder=${amountForInput(0, 'EUR')}
              onInput=${(event) => set('eurText', event.currentTarget.value)} />
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

function Summary({ summary }) {
  const biggest = Math.max(1, ...Object.values(summary.byCategory));
  const rows = CATEGORIES.filter((category) => summary.byCategory[category] > 0);
  return html`
    <div class="spend-summary">
      <p class="spend-label">${t('spending.total')}</p>
      <p class="spend-total">${formatMoney(summary.total, 'EUR')}</p>
      ${rows.length > 0 && html`
        <ul class="spend-bars">
          ${rows.map((category) => {
            const { key, Icon } = CATEGORY_INFO[category];
            const value = summary.byCategory[category];
            return html`
              <li class="spend-bar-row" key=${category}>
                <span class="spend-bar-name"><${Icon} />${t(key)}</span>
                <span class="spend-bar-amount">${formatMoney(value, 'EUR')}</span>
                <span class="spend-bar"><span style=${{ width: Math.round((value / biggest) * 100) + '%' }}></span></span>
              </li>`;
          })}
        </ul>`}
    </div>`;
}

export function TripSpending({ id }) {
  const trips = useStore((s) => s.trips);
  const spending = useStore((s) => s.spending);
  const bookings = useStore((s) => s.bookings);
  const [dialog, setDialog] = useState(null); // { expense } or {}

  useEffect(() => {
    Promise.all([reloadSpending(id), reloadBookings(id)]).catch((error) => console.error(error));
  }, [id]);

  const trip = trips.find((item) => item.id === id);
  if (!trip) return html`<${NotFound} />`;

  const loaded = spending.tripId === id && bookings.tripId === id;
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

      <${Summary} summary=${summary} />
      <button type="button" class="button button-primary spend-add" onClick=${() => setDialog({})}>
        <${PlusIcon} /><span>${t('spending.add')}</span>
      </button>

      ${loaded && expenses.length === 0 && costs.length === 0 && html`
        <${EmptyState} title=${t('spending.emptyTitle')} text=${t('spending.emptyText')} />`}

      ${costs.length > 0 && html`
        <section class="spend-group">
          <h2 class="section-title">${t('spending.bookings')}</h2>
          <ul class="spend-list">
            ${costs.map(({ booking, counted }) => html`
              <li key=${booking.id}>
                <a class="spend-row" href=${paths.booking(trip.id, booking.id)}>
                  <span class="plan-icon"><${TypeIcon} type=${booking.type} /></span>
                  <span class="spend-text">
                    <span class="spend-title">${booking.title}</span>
                    ${!counted && html`<span class="spend-sub">${t('spending.notCounted')}</span>`}
                  </span>
                  <span class="spend-amount">${formatMoney(booking.price, booking.currency || 'EUR')}</span>
                </a>
              </li>`)}
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
    </section>`;
}
