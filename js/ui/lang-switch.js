// lang-switch.js — the LT | EN buttons in the top bar.

import { html } from './html.js';
import { useStore } from '../store.js';
import { t, setLanguage } from '../i18n.js';

// Short label and full name for each language
const OPTIONS = [
  { code: 'lt', short: 'language.short.lt', name: 'language.name.lt' },
  { code: 'en', short: 'language.short.en', name: 'language.name.en' }
];

export function LangSwitch() {
  const current = useStore((s) => s.lang);

  function choose(code) {
    setLanguage(code).catch((error) => console.error('Language not changed:', error));
  }

  return html`
    <div class="lang-switch" role="group" aria-label=${t('language.label')}>
      ${OPTIONS.map((option) => html`
        <button
          type="button"
          key=${option.code}
          lang=${option.code}
          title=${t(option.name)}
          aria-pressed=${option.code === current}
          onClick=${() => choose(option.code)}
        >${t(option.short)}</button>
      `)}
    </div>`;
}
