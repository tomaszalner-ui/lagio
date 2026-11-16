// tools/app-files.mjs — the list of files the app needs to work offline.
// Shared by update-sw.mjs (writes the list into sw.js) and check.mjs
// (checks that sw.js lists exactly these files).

import { readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

function filesIn(dir) {
  const out = [];
  for (const name of readdirSync(join(ROOT, dir)).sort()) {
    const full = join(ROOT, dir, name);
    const path = relative(ROOT, full).split('\\').join('/');
    if (statSync(full).isDirectory()) out.push(...filesIn(path));
    else out.push(path);
  }
  return out;
}

// Licences and notes in vendor/ are for people, not for the app
const NOT_FOR_THE_APP = /(^|\/)(README\.md|LICENSE[^/]*)$/;

export function appFiles() {
  return [
    './',
    'index.html',
    'manifest.json',
    ...filesIn('css'),
    ...filesIn('js').filter((f) => f.endsWith('.js')),
    ...filesIn('lang'),
    ...filesIn('icons'),
    ...filesIn('vendor').filter((f) => !NOT_FOR_THE_APP.test(f))
  ];
}
