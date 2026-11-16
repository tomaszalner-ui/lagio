// not-found.js — shown when an address points to something that does not
// exist (or was deleted). By default it talks about a trip and links Home.

import { html } from './html.js';
import { t } from '../i18n.js';
import { paths } from '../router.js';
import { EmptyState } from './empty-state.js';
import { ChevronLeft } from './illustrations.js';

export function NotFound({ title, text, backHref, backLabel }) {
  return html`
    <section class="screen">
      <a class="back-link" href=${backHref || paths.home()}>
        <${ChevronLeft} /><span>${backLabel || t('home.title')}</span>
      </a>
      <${EmptyState}
        title=${title || t('trips.notFoundTitle')}
        text=${text || t('trips.notFoundText')}
      />
    </section>`;
}
