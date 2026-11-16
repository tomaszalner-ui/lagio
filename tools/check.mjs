// tools/check.mjs — automatic checks to run before every commit:
//   node tools/check.mjs
// 1. lt.json and en.json have the same keys and the right plural forms
// 2. every t('key') in the code exists in both language files
// 3. no visible text written directly in screen code
// 4. sw.js lists every app file (so the app works offline)
// 5. only db.js uses IndexedDB, and no network addresses in the code
// Prints problems and exits with code 1 if there are any.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const problems = [];
const warnings = [];

const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const rel = (path) => relative(ROOT, path).split('\\').join('/');

function filesIn(dir) {
  const out = [];
  for (const name of readdirSync(join(ROOT, dir))) {
    const full = join(ROOT, dir, name);
    if (statSync(full).isDirectory()) out.push(...filesIn(rel(full)));
    else out.push(rel(full));
  }
  return out;
}

// ---------- 1. language files ----------
const PLURAL_FORMS = { lt: ['one', 'few', 'many', 'other'], en: ['one', 'other'] };
const langs = {};
for (const code of Object.keys(PLURAL_FORMS)) {
  try {
    langs[code] = JSON.parse(read(`lang/${code}.json`));
  } catch (error) {
    problems.push(`lang/${code}.json is not valid JSON: ${error.message}`);
    langs[code] = {};
  }
}
const allKeys = new Set(Object.values(langs).flatMap((d) => Object.keys(d)));
for (const key of allKeys) {
  for (const [code, dict] of Object.entries(langs)) {
    const value = dict[key];
    if (value === undefined) {
      problems.push(`Key "${key}" is missing in lang/${code}.json`);
    } else if (typeof value === 'object') {
      for (const form of PLURAL_FORMS[code]) {
        if (typeof value[form] !== 'string') problems.push(`Key "${key}" in lang/${code}.json needs the plural form "${form}"`);
      }
    } else if (typeof value !== 'string' || value.trim() === '') {
      problems.push(`Key "${key}" in lang/${code}.json is empty`);
    }
  }
}

// ---------- 2. keys used in code ----------
const jsFiles = filesIn('js').filter((f) => f.endsWith('.js'));
const usedKeys = new Set();
for (const file of jsFiles) {
  const source = read(file);
  // t('key') and also 'key.like.this' strings in lookup tables
  for (const match of source.matchAll(/\bt\(\s*['"`]([\w.]+)['"`]/g)) usedKeys.add(match[1]);
  for (const match of source.matchAll(/['"]((?:[a-z]\w*\.)+[a-z]\w*)['"]/gi)) {
    if (allKeys.has(match[1])) usedKeys.add(match[1]);
  }
  for (const match of source.matchAll(/\bt\(\s*['"`]([\w.]+)['"`]/g)) {
    const key = match[1];
    for (const [code, dict] of Object.entries(langs)) {
      if (dict[key] === undefined) problems.push(`${file}: t('${key}') is missing in lang/${code}.json`);
    }
  }
}
for (const key of allKeys) {
  if (!usedKeys.has(key)) warnings.push(`Key "${key}" is not used in the code (fine if it is planned)`);
}

// ---------- 3. visible text written in code ----------

// The fixed text of every html`…` template, with each ${…} part replaced by
// a space. Counts braces and quotes, so ${…} parts that contain { } or
// other templates are skipped whole.
function htmlTemplates(source) {
  const out = [];
  let at = 0;
  while ((at = source.indexOf('html`', at)) !== -1) {
    let i = at + 5;
    let text = '';
    while (i < source.length && source[i] !== '`') {
      if (source[i] === '\\') { text += source[i + 1]; i += 2; continue; }
      if (source[i] === '$' && source[i + 1] === '{') {
        i = skipExpression(source, i + 2);
        text += ' ';
        continue;
      }
      text += source[i++];
    }
    out.push(text);
    at = i + 1;
  }
  return out;
}

// Returns the position just after the } that closes an expression
function skipExpression(source, i) {
  let depth = 1;
  while (i < source.length && depth > 0) {
    const c = source[i];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '\'' || c === '"') i = skipString(source, i, c);
    else if (c === '`') i = skipTemplate(source, i);
    i++;
  }
  return i;
}

function skipString(source, i, quote) {
  i++;
  while (i < source.length && source[i] !== quote) i += source[i] === '\\' ? 2 : 1;
  return i;
}

// Skips a nested `…` template (its own ${…} parts included); returns its closing `
function skipTemplate(source, i) {
  i++;
  while (i < source.length && source[i] !== '`') {
    if (source[i] === '\\') { i += 2; continue; }
    if (source[i] === '$' && source[i + 1] === '{') { i = skipExpression(source, i + 2); continue; }
    i++;
  }
  return i;
}
for (const file of jsFiles.filter((f) => f.startsWith('js/ui/'))) {
  const source = read(file);
  for (const markup of htmlTemplates(source)) {
    for (const text of markup.matchAll(/>([^<>]+)</g)) {
      if (/[A-Za-zĄČĘĖĮŠŲŪŽąčęėįšųūž]{2,}/.test(text[1])) problems.push(`${file}: text written in code: "${text[1].trim()}"`);
    }
    for (const attr of markup.matchAll(/\b(title|aria-label|placeholder|alt)="([^"]*)"/g)) {
      if (/[A-Za-z]{2,}/.test(attr[2])) problems.push(`${file}: ${attr[1]} written in code: "${attr[2]}"`);
    }
  }
}

// ---------- 4. offline file list ----------
const sw = read('sw.js');
const listed = new Set([...sw.matchAll(/^\s*'([^']+)',?$/gm)].map((m) => m[1]));
const appFiles = [
  'index.html',
  'manifest.json',
  ...filesIn('css'),
  ...jsFiles,
  ...filesIn('lang'),
  ...filesIn('icons'),
  ...filesIn('vendor').filter((f) => f.endsWith('.js'))
];
for (const file of appFiles) {
  if (!listed.has(file)) problems.push(`sw.js FILES is missing "${file}" (it would not work offline)`);
}
for (const file of listed) {
  if (file !== './' && !appFiles.includes(file)) problems.push(`sw.js FILES lists "${file}", which does not exist`);
}

// ---------- 5. storage and network rules ----------
for (const file of jsFiles) {
  const source = read(file);
  if (file !== 'js/db.js' && /\bindexedDB\b|IDB[A-Z]\w+/.test(source)) {
    problems.push(`${file}: uses IndexedDB directly (only js/db.js may)`);
  }
  for (const match of source.matchAll(/https?:\/\/[^\s'"`)]+/g)) {
    warnings.push(`${file}: network address "${match[0]}". Only the exchange-rate fetch is allowed.`);
  }
}

// ---------- report ----------
for (const w of warnings) console.log('warning  ' + w);
for (const p of problems) console.log('PROBLEM  ' + p);
console.log(problems.length
  ? `\n${problems.length} problem(s) found.`
  : `\nAll checks passed (${allKeys.size} text keys, ${appFiles.length} offline files).`);
process.exit(problems.length ? 1 : 0);
