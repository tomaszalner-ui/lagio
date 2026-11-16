# vendor/

Third-party libraries, saved here so the app never loads code from the internet.
They are mapped to short names by the import map in `index.html`.
Downloaded 2026-11-16 from jsDelivr and checked byte for byte against unpkg.

| File | Library | Version | Source | License |
| --- | --- | --- | --- | --- |
| `preact.module.js` | Preact | 10.29.8 | `preact@10.29.8/dist/preact.module.js` | MIT (`LICENSE-preact.txt`) |
| `hooks.module.js` | Preact hooks | 10.29.8 | `preact@10.29.8/hooks/dist/hooks.module.js` | MIT |
| `htm.module.js` | htm | 3.1.1 | `htm@3.1.1/dist/htm.module.js` | Apache-2.0 (`LICENSE-htm.txt`) |
| `jszip.min.js` | JSZip | 3.10.2 | `jszip@3.10.2/dist/jszip.min.js` | MIT or GPLv3 (`LICENSE-jszip.txt`) |
| `jszip.js` | our 2-line wrapper | | written here | |
| `pdfjs/pdf.min.mjs` | PDF.js (legacy build, for older phones) | 6.5.438 | `pdfjs-dist@6.5.438/legacy/build/pdf.min.mjs` | Apache-2.0 (`pdfjs/LICENSE`) |
| `pdfjs/pdf.worker.min.mjs` | PDF.js worker | 6.5.438 | `pdfjs-dist@6.5.438/legacy/build/pdf.worker.min.mjs` | Apache-2.0 |
| `pdfjs/cmaps/` (169 files) | PDF.js character maps (Asian text) | 6.5.438 | `pdfjs-dist@6.5.438/cmaps/` | see `pdfjs/cmaps/LICENSE` |
| `pdfjs/standard_fonts/` (16 files) | PDF.js standard fonts | 6.5.438 | `pdfjs-dist@6.5.438/standard_fonts/` | see the LICENSE files there |

PDF.js was downloaded 2026-11-16 from jsDelivr; every file was checked against
the SHA-256 that jsDelivr publishes for it, and the two main files also against unpkg.
It is loaded only when a PDF is opened (`js/ui/pdf-view.js`).

SHA-256:

```
c30e721ebfdc6e2ad4c18c14d2dfb82667829c8aec27de1207774e3fc16858a8  preact.module.js
a6ee626f2d01570592dd569a792e3f050154aa02890eead8c223fa3ed5aa3d5a  hooks.module.js
ab33dd3f38059b9be4d5f5350128eefb2356639c4e0bbe9d9e8b3ba75847e9e4  htm.module.js
7f839b2d4688b845c105ebf5d2f9803075f91ea0fe72bdaac176c3a04dd3d2c1  jszip.min.js
522ad2c83bc8a0010e7f0cc60d0892b77c8d2bf2c9702dc12288311d94270f42  pdfjs/pdf.min.mjs
b4c8353ded0d88d2e2009574a29eb4e0c3ff7e942ecdf51ef5f71566a9667f31  pdfjs/pdf.worker.min.mjs
```

## Upgrading a library

1. Download the same file paths with the new version number, e.g.
   `https://cdn.jsdelivr.net/npm/preact@<version>/dist/preact.module.js`.
   Preact and its hooks file must always be the same version.
2. Update the table and checksums above.
3. Run `node tools/update-sw.mjs <new version>` (refreshes the offline file list),
   test the whole app, commit.

PDF.js: keep the folder layout (`pdfjs/pdf.min.mjs`, `pdfjs/pdf.worker.min.mjs`,
`pdfjs/cmaps/`, `pdfjs/standard_fonts/`). Use the `legacy/build` files so older
iPhones and Android phones still work.

Preact 11 exists (11.2.0, Nov 2026). We stay on 10.x until 11 has settled.
