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

SHA-256:

```
c30e721ebfdc6e2ad4c18c14d2dfb82667829c8aec27de1207774e3fc16858a8  preact.module.js
a6ee626f2d01570592dd569a792e3f050154aa02890eead8c223fa3ed5aa3d5a  hooks.module.js
ab33dd3f38059b9be4d5f5350128eefb2356639c4e0bbe9d9e8b3ba75847e9e4  htm.module.js
7f839b2d4688b845c105ebf5d2f9803075f91ea0fe72bdaac176c3a04dd3d2c1  jszip.min.js
```

## Upgrading a library

1. Download the same file paths with the new version number, e.g.
   `https://cdn.jsdelivr.net/npm/preact@<version>/dist/preact.module.js`.
   Preact and its hooks file must always be the same version.
2. Update the table and checksums above.
3. Raise `VERSION` in `sw.js`, test the whole app, commit.

Preact 11 exists (11.2.0, Nov 2026). We stay on 10.x until 11 has settled.
