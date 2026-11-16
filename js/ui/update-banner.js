// update-banner.js — "A new version is available · Update"
// Appears when pwa.js reports that a new app version is waiting.

import { html } from './html.js';
import { useStore } from '../store.js';
import { t } from '../i18n.js';
import { applyUpdate } from '../pwa.js';

export function UpdateBanner() {
  const updateReady = useStore((s) => s.updateReady);
  if (!updateReady) return null;

  return html`
    <div class="update-banner" role="status">
      <span>${t('update.text')}</span>
      <button type="button" class="button button-primary" onClick=${applyUpdate}>
        ${t('update.button')}
      </button>
    </div>`;
}
