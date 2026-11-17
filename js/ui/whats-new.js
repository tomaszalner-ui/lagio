// whats-new.js — "Kas naujo" (#/news): what each version brought, newest
// first. Opening it marks the current version as seen (no more strip on Home).

import { useEffect } from 'preact/hooks';
import { html } from './html.js';
import { t, formatDate } from '../i18n.js';
import { paths } from '../router.js';
import { NEWS, newsKey, markNewsSeen } from '../modules/news.js';
import { APP_VERSION } from '../version.js';
import { ChevronLeft } from './illustrations.js';

export function WhatsNew() {
  useEffect(() => {
    markNewsSeen().catch((error) => console.error(error));
  }, []);

  return html`
    <section class="screen">
      <a class="back-link" href=${paths.home()}><${ChevronLeft} /><span>${t('home.title')}</span></a>
      <h1 class="screen-title screen-head">${t('news.title')}</h1>
      <ol class="news-list">
        ${NEWS.map((entry) => html`
          <li class=${'news-item' + (entry.version === APP_VERSION ? ' is-current' : '')} key=${entry.version}>
            <p class="news-head">
              <span class="news-version">${t('news.versionLabel', { version: entry.version })}</span>
              <span class="news-date">${formatDate(entry.date, 'medium')}</span>
            </p>
            <p class="news-text">${t(newsKey(entry.version))}</p>
          </li>`)}
      </ol>
    </section>`;
}
