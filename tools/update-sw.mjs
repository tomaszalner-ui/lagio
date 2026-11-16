// tools/update-sw.mjs — rewrites the FILES list in sw.js from the folders,
// and optionally sets a new version.
//   node tools/update-sw.mjs          -> just refresh the file list
//   node tools/update-sw.mjs 0.3.2    -> also set VERSION to 0.3.2

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, appFiles } from './app-files.mjs';

const file = join(ROOT, 'sw.js');
let source = readFileSync(file, 'utf8');

const list = appFiles().map((path) => `  '${path}'`).join(',\n');
source = source.replace(/const FILES = \[[\s\S]*?\n\];/, `const FILES = [\n${list}\n];`);

const version = process.argv[2];
if (version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    console.error('Version must look like 0.3.2');
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
console.log(`sw.js: ${appFiles().length} files${version ? ', version ' + version + ' (also js/version.js)' : ''}`);
