// tools/check.mjs — automatic checks to run before every commit:
//   node tools/check.mjs
// 1. lt.json and en.json have the same keys and the right plural forms
// 2. every t('key') in the code exists in both language files
// 3. no visible text written directly in screen code
// 4. sw.js lists every app file (so the app works offline)
// 5. only db.js uses IndexedDB, and no network addresses in the code
// Prints problems and exits with code 1 if there are any.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, appFiles as listAppFiles, isPdfjsFile, pdfjsVersion } from './app-files.mjs';

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
const appFiles = listAppFiles();
for (const file of appFiles) {
  if (!listed.has(file)) problems.push(`sw.js FILES is missing "${file}" (run: node tools/update-sw.mjs)`);
}
for (const file of listed) {
  if (!appFiles.includes(file)) problems.push(`sw.js FILES lists "${file}", which does not exist (run: node tools/update-sw.mjs)`);
}

// PDF.js files belong in PDFJS_FILES only (their own cache), app files in FILES
const swList = (name) => {
  const block = (sw.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\n\\];`)) || [])[1] || '';
  return [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);
};
if (swList('FILES').some(isPdfjsFile)) problems.push('sw.js FILES contains PDF.js files (they belong in PDFJS_FILES)');
if (swList('PDFJS_FILES').some((f) => !isPdfjsFile(f))) problems.push('sw.js PDFJS_FILES contains non-PDF.js files');
const swPdfjsVersion = (sw.match(/const PDFJS_VERSION = '([^']*)'/) || [])[1];
if (swPdfjsVersion !== pdfjsVersion()) {
  problems.push(`sw.js PDFJS_VERSION is "${swPdfjsVersion}" but vendor/pdfjs is ${pdfjsVersion()} (run: node tools/update-sw.mjs)`);
}

// ---------- 4b. same version in sw.js and js/version.js ----------
const swVersion = (sw.match(/const VERSION = '([^']*)'/) || [])[1];
const appVersion = (read('js/version.js').match(/APP_VERSION = '([^']*)'/) || [])[1];
if (swVersion !== appVersion) {
  problems.push(`Version differs: sw.js ${swVersion}, js/version.js ${appVersion} (run: node tools/update-sw.mjs <version>)`);
}

// ---------- 4c. every data store goes into the trip file (rule 4) ----------
const storeList = (source, name) => {
  const block = (source.match(new RegExp(`${name} = \\[([\\s\\S]*?)\\]`)) || [])[1] || '';
  return [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);
};
const exported = storeList(read('js/transfer.js'), 'EXPORTED_STORES');
for (const store of storeList(read('js/db.js'), 'STORES')) {
  if (!['files', 'settings'].includes(store) && !exported.includes(store)) {
    problems.push(`Store "${store}" is not in EXPORTED_STORES in js/transfer.js (rule 4: everything goes into the trip file)`);
  }
}

// ---------- 5. storage and network rules ----------
for (const file of jsFiles) {
  const source = read(file);
  if (file !== 'js/db.js' && /\bindexedDB\b|IDB[A-Z]\w+/.test(source)) {
    problems.push(`${file}: uses IndexedDB directly (only js/db.js may)`);
  }
  // Lines marked "external link" are links the user taps, not calls by the app.
  // The exchange-rate address in js/rates.js is the one allowed network call.
  const allowed = (l) => l.includes('external link') || (file === 'js/rates.js' && l.includes('allowed network call'));
  for (const line of source.split('\n').filter((l) => !allowed(l))) {
    for (const match of line.matchAll(/https?:\/\/[^\s'"`)]+/g)) {
      warnings.push(`${file}: network address "${match[0]}". Only the exchange-rate fetch is allowed.`);
    }
  }
}

// ---------- report ----------
for (const w of warnings) console.log('warning  ' + w);
for (const p of problems) console.log('PROBLEM  ' + p);
console.log(problems.length
  ? `\n${problems.length} problem(s) found.`
  : `\nAll checks passed (${allKeys.size} text keys, ${appFiles.length} offline files).`);
process.exit(problems.length ? 1 : 0);
