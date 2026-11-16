// home.js — the Home screen: trips grouped into "now and upcoming",
// "no dates yet" and "past", a New trip button, Import trip, and a link to
// the archive.

import { useState } from 'preact/hooks';
import { html } from './html.js';
import { useStore } from '../store.js';
import { t } from '../i18n.js';
import { paths } from '../router.js';
import { groupTrips, todayIso } from '../modules/trips.js';
import { EmptyState } from './empty-state.js';
import { ImportDialog } from './import-dialog.js';
import { Suitcase, PlusIcon, ImportIcon } from './illustrations.js';
import { TripCard } from './trip-card.js';

const IMPORT_INPUT_ID = 'trip-import-input';

// Android does not know the .lagio extension and may grey such files out
// with a strict filter, so zip types are offered too; the content decides.
const IMPORT_TYPES = '.lagio,.zip,application/zip,application/octet-stream';

function TripSection({ title, trips, today }) {
  if (trips.length === 0) return null;
  return html`
    <section class="trip-section">
      <h2 class="section-title">${title}</h2>
      <ul class="card-list">
        ${trips.map((trip) => html`
          <li key=${trip.id}><${TripCard} trip=${trip} today=${today} /></li>`)}
      </ul>
    </section>`;
}

export function Home() {
  const trips = useStore((s) => s.trips);
  const [importing, setImporting] = useState(null); // the chosen file
  const today = todayIso();
  const visible = trips.filter((trip) => !trip.archived);
  const archivedCount = trips.length - visible.length;
  const groups = groupTrips(visible, today);

  function onPickImport(event) {
    const file = event.currentTarget.files[0];
    event.currentTarget.value = ''; // so choosing the same file again works
    if (file) setImporting(file);
  }

  // "Import trip" is a <label> for a hidden file input (works on every phone)
  const importButton = (extraClass) => html`
    <label class=${'button ' + extraClass} for=${IMPORT_INPUT_ID}>
      <${ImportIcon} /><span>${t('home.importTrip')}</span>
    </label>`;

  const footer = html`
    <div class="home-footer">
      ${visible.length > 0 && importButton('button-small')}
      ${archivedCount > 0 && html`
        <a class="archive-link" href=${paths.archive()}>${t('home.archiveLink', { count: archivedCount })}</a>`}
    </div>
    <input
      id=${IMPORT_INPUT_ID}
      class="visually-hidden"
      type="file"
      accept=${IMPORT_TYPES}
      onChange=${onPickImport}
    />
    ${importing && html`<${ImportDialog} file=${importing} onClose=${() => setImporting(null)} />`}`;

  if (visible.length === 0) {
    return html`
      <section class="screen">
        <h1 class="screen-title screen-head">${t('home.title')}</h1>
        <${EmptyState}
          illustration=${html`<${Suitcase} />`}
          title=${t('home.emptyTitle')}
          text=${t('home.emptyText')}
        >
          <a class="button button-primary" href=${paths.tripNew()}>
            <${PlusIcon} /><span>${t('home.createFirst')}</span>
          </a>
          ${importButton('')}
        <//>
        ${footer}
      </section>`;
  }

  return html`
    <section class="screen">
      <div class="screen-head">
        <h1 class="screen-title">${t('home.title')}</h1>
        <a class="button button-primary button-small" href=${paths.tripNew()}>
          <${PlusIcon} /><span>${t('home.newTrip')}</span>
        </a>
      </div>
      <${TripSection} title=${t('home.section.current')} trips=${groups.current} today=${today} />
      <${TripSection} title=${t('home.section.undated')} trips=${groups.undated} today=${today} />
      <${TripSection} title=${t('home.section.past')} trips=${groups.past} today=${today} />
      ${footer}
    </section>`;
}
