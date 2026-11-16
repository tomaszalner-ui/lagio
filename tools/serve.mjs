// tools/serve.mjs — a tiny local web server for trying Lagio on this computer.
// Usage (from the lagio folder):  node tools/serve.mjs        -> http://localhost:8080
//                                 node tools/serve.mjs 3000   -> another port
// Service workers only run on localhost or https, so open the localhost address.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.argv[2]) || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

createServer(async (request, response) => {
  try {
    let path = decodeURIComponent(new URL(request.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(ROOT, path));
    // Never serve files outside the project folder
    if (file !== ROOT && !file.startsWith(ROOT + sep)) throw new Error('outside');
    if (!(await stat(file)).isFile()) throw new Error('not a file');
    response.writeHead(200, {
      'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache' // always fresh while developing
    });
    response.end(await readFile(file));
  } catch (error) {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not found');
  }
}).listen(PORT, 'localhost', () => {
  console.log(`Lagio running at http://localhost:${PORT}  (Ctrl+C to stop)`);
});
