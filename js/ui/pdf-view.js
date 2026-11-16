// pdf-view.js — shows every page of a PDF, drawn with PDF.js (vendor/pdfjs).
// Phones cannot show PDFs inside an app reliably (Android shows nothing,
// iPhone only the first page), so PDF.js draws each page onto a <canvas>.
//
// - PDF.js (about 1.8 MB) loads only when a PDF is opened.
// - Pages are drawn when they scroll near the screen and cleared when far
//   away, so long PDFs do not use up the phone's memory.
// - Zoom: pinch with two fingers, or the − / + buttons. While pinching, the
//   pages are stretched; when the fingers lift, they are drawn sharp again.

import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { html } from './html.js';
import { t } from '../i18n.js';
import { PlusIcon, MinusIcon } from './illustrations.js';

const PDFJS_FOLDER = 'vendor/pdfjs/';
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.5;
const PAGE_PADDING = 8;           // px around the pages
const MAX_CANVAS_PIXELS = 16e6;   // phones refuse larger canvases

const clampZoom = (zoom) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
const folderUrl = (path) => new URL(PDFJS_FOLDER + path, document.baseURI).href;

// Loads PDF.js once, the first time a PDF is opened
let libraryPromise = null;
function loadLibrary() {
  if (!libraryPromise) {
    libraryPromise = import('pdfjs').then((lib) => {
      // The "worker" does the heavy reading of the file in the background
      lib.GlobalWorkerOptions.workerSrc = folderUrl('pdf.worker.min.mjs');
      return lib;
    });
    libraryPromise.catch(() => { libraryPromise = null; });
  }
  return libraryPromise;
}

// One page: an empty box of the right size, drawn when it comes near the screen
function PdfPage({ pdf, number, total, size, width, root }) {
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const [near, setNear] = useState(false);
  const height = Math.round((width * size.height) / size.width);

  // Watch whether the page is within one screen of being visible
  useEffect(() => {
    if (!root) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { root, rootMargin: '100% 0px' }
    );
    observer.observe(boxRef.current);
    return () => observer.disconnect();
  }, [root]);

  // Draw (or clear) the page
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!near || !width) {
      canvas.width = 0; // frees the memory of pages far away
      canvas.height = 0;
      return undefined;
    }
    let renderTask = null;
    let stopped = false;
    pdf.getPage(number).then((page) => {
      if (stopped) return null;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 3); // sharp on high-resolution screens
      let scale = (width / size.width) * pixelRatio;
      const pixels = size.width * scale * size.height * scale;
      if (pixels > MAX_CANVAS_PIXELS) scale *= Math.sqrt(MAX_CANVAS_PIXELS / pixels);
      const viewport = page.getViewport({ scale });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      renderTask = page.render({ canvas, viewport });
      return renderTask.promise;
    }).catch((error) => {
      if (!stopped && error && error.name !== 'RenderingCancelledException') console.error(error);
    });
    return () => {
      stopped = true;
      if (renderTask) renderTask.cancel();
    };
  }, [near, width]);

  return html`
    <div class="pdf-page" ref=${boxRef} style=${{ width: width + 'px', height: height + 'px' }}>
      <canvas ref=${canvasRef} role="img" aria-label=${t('viewer.page', { page: String(number), total: String(total) })}></canvas>
    </div>`;
}

export function PdfView({ blob }) {
  const scrollRef = useRef(null);
  const pagesRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | failed | password
  const [pdf, setPdf] = useState(null);
  const [sizes, setSizes] = useState([]);           // each page's size at 100 %
  const [zoom, setZoom] = useState(1);
  const [fitWidth, setFitWidth] = useState(0);      // page width at zoom 1
  const [scrollBox, setScrollBox] = useState(null); // for the page observers
  const pinch = useRef(null);
  const pendingScroll = useRef(null);

  // Read the PDF
  useEffect(() => {
    let task = null;
    let stopped = false;
    (async () => {
      try {
        const lib = await loadLibrary();
        const data = new Uint8Array(await blob.arrayBuffer());
        task = lib.getDocument({
          data,
          cMapUrl: folderUrl('cmaps/'),                 // Asian characters
          cMapPacked: true,
          standardFontDataUrl: folderUrl('standard_fonts/'), // fonts not inside the PDF
          isEvalSupported: false,
          verbosity: 0 // PDF.js reports only real errors in the console
        });
        const doc = await task.promise;
        const pageSizes = [];
        for (let number = 1; number <= doc.numPages; number += 1) {
          const viewport = (await doc.getPage(number)).getViewport({ scale: 1 });
          pageSizes.push({ width: viewport.width, height: viewport.height });
        }
        if (stopped) return;
        setPdf(doc);
        setSizes(pageSizes);
        setStatus('ready');
      } catch (error) {
        if (stopped) return;
        if (error && error.name === 'PasswordException') {
          setStatus('password');
        } else if (error && error.name === 'InvalidPDFException') {
          console.info('Not a readable PDF:', error.message); // the file, not a bug
          setStatus('failed');
        } else {
          console.error(error);
          setStatus('failed');
        }
      }
    })();
    return () => {
      stopped = true;
      if (task) task.destroy();
    };
  }, [blob]);

  // Fit the pages to the screen width, again when the phone is turned
  useLayoutEffect(() => {
    const box = scrollRef.current;
    setScrollBox(box);
    const measure = () => setFitWidth(Math.max(0, box.clientWidth - 2 * PAGE_PADDING));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // After a zoom, scroll so the point under the fingers stays in place
  useLayoutEffect(() => {
    const target = pendingScroll.current;
    if (!target) return;
    pendingScroll.current = null;
    scrollRef.current.scrollLeft = target.left;
    scrollRef.current.scrollTop = target.top;
  }, [zoom]);

  // Zooms to `next`, keeping the point (x, y) of the visible area in place
  function zoomTo(next, x, y) {
    const box = scrollRef.current;
    const target = clampZoom(next);
    const factor = target / zoom;
    pendingScroll.current = {
      left: (box.scrollLeft + x) * factor - x,
      top: (box.scrollTop + y) * factor - y
    };
    setZoom(target);
  }

  function zoomButton(factor) {
    const box = scrollRef.current;
    zoomTo(zoom * factor, box.clientWidth / 2, box.clientHeight / 2);
  }

  // ----- pinch with two fingers -----
  const distance = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

  function onTouchStart(event) {
    if (event.touches.length !== 2 || !pagesRef.current) return;
    const [a, b] = event.touches;
    const rect = scrollRef.current.getBoundingClientRect();
    pinch.current = {
      startDistance: distance(a, b),
      x: (a.clientX + b.clientX) / 2 - rect.left,
      y: (a.clientY + b.clientY) / 2 - rect.top,
      factor: 1
    };
    const box = scrollRef.current;
    pagesRef.current.style.transformOrigin =
      `${box.scrollLeft + pinch.current.x}px ${box.scrollTop + pinch.current.y}px`;
  }

  function onTouchMove(event) {
    const current = pinch.current;
    if (!current || event.touches.length !== 2 || !pagesRef.current) return;
    event.preventDefault(); // we zoom, not the browser
    const [a, b] = event.touches;
    const wanted = clampZoom((zoom * distance(a, b)) / current.startDistance);
    current.factor = wanted / zoom;
    pagesRef.current.style.transform = `scale(${current.factor})`;
  }

  function onTouchEnd(event) {
    const current = pinch.current;
    if (!current || event.touches.length >= 2 || !pagesRef.current) return;
    pinch.current = null;
    pagesRef.current.style.transform = '';
    if (Math.abs(current.factor - 1) > 0.02) zoomTo(zoom * current.factor, current.x, current.y);
  }

  const pageWidth = Math.round(fitWidth * zoom);

  let message = null;
  if (status === 'loading') message = t('viewer.loading');
  if (status === 'failed') message = t('viewer.pdfFailed');
  if (status === 'password') message = t('viewer.pdfPassword');

  return html`
    <div
      class="pdf-scroll"
      ref=${scrollRef}
      onTouchStart=${onTouchStart}
      onTouchMove=${onTouchMove}
      onTouchEnd=${onTouchEnd}
      onTouchCancel=${onTouchEnd}
    >
      ${message
        ? html`<p class="viewer-message">${message}</p>`
        : html`
          <div class="pdf-pages" ref=${pagesRef} style=${{ width: pageWidth + 2 * PAGE_PADDING + 'px' }}>
            ${sizes.map((size, index) => html`
              <${PdfPage}
                key=${index}
                pdf=${pdf}
                number=${index + 1}
                total=${sizes.length}
                size=${size}
                width=${pageWidth}
                root=${scrollBox}
              />`)}
          </div>`}
    </div>
    ${status === 'ready' && html`
      <div class="pdf-zoom">
        <button type="button" class="icon-button" aria-label=${t('viewer.zoomOut')}
          disabled=${zoom <= MIN_ZOOM} onClick=${() => zoomButton(1 / ZOOM_STEP)}>
          <${MinusIcon} />
        </button>
        <button type="button" class="icon-button" aria-label=${t('viewer.zoomIn')}
          disabled=${zoom >= MAX_ZOOM} onClick=${() => zoomButton(ZOOM_STEP)}>
          <${PlusIcon} />
        </button>
      </div>`}`;
}
