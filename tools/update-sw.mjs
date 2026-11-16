// tools/update-sw.mjs — rewrites the file lists in sw.js from the folders,
// reads the PDF.js version from vendor/pdfjs, and optionally sets a new
// app version (in sw.js and js/version.js).
//   node tools/update-sw.mjs          -> just refresh the lists
//   node tools/update-sw.mjs 0.4.1    -> also set VERSION to 0.4.1

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, appFiles, isPdfjsFile, pdfjsVersion } from './app-files.mjs';

const file = join(ROOT, 'sw.js');
let source = readFileSync(file, 'utf8');

const all = appFiles();
const format = (list) => list.map((path) => `  '${path}'`).join(',\n');
const appList = all.filter((path) => !isPdfjsFile(path));
const pdfjsList = all.filter(isPdfjsFile);

source = source.replace(/const FILES = \[[\s\S]*?\n\];/, `const FILES = [\n${format(appList)}\n];`);
source = source.replace(/const PDFJS_FILES = \[[\s\S]*?\n\];/, `const PDFJS_FILES = [\n${format(pdfjsList)}\n];`);
source = source.replace(/const PDFJS_VERSION = '[^']*';/, `const PDFJS_VERSION = '${pdfjsVersion()}';`);

const version = process.argv[2];
if (version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    console.error('Version must look like 0.4.1');
    process.exit(1);
  }
  source = source.replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`);
}

writeFileSync(file, source);

// The app shows / exports its version from js/version.js
if (version) {
  const versionFile = join(ROOT, 'js', 'version.js');
  const text = readFileSync(versionFile, 'utf8').replace(/APP_VERSION = '[^']*'/, `APP_VERSION = '${version}'`);
  writeFileSync(versionFile, text);
}
console.log(`sw.js: ${appList.length} app files + ${pdfjsList.length} PDF.js ${pdfjsVersion()} files` +
  (version ? `, version ${version} (also js/version.js)` : ''));
