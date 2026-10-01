import { assertImportable, detectFormat, ImportError, type DesignFormat } from './detect';

/** Long side, in pixels, that vector designs (SVG, PDF, .ai) are rasterised to. */
export const VECTOR_LONG_SIDE = 4096;
/** Rasters larger than this are scaled down (iPad Safari caps canvases at ~16.7 megapixels). */
export const RASTER_MAX_SIDE = 4096;

export interface ImportedDesign {
  name: string;
  format: DesignFormat;
  canvas: HTMLCanvasElement;
  /** Index of the page / artboard used, for multi-page files. */
  page?: number;
}

export interface PdfSource {
  name: string;
  format: 'pdf' | 'ai-pdf';
  pageCount: number;
  thumbnail: (page: number, longSide?: number) => Promise<HTMLCanvasElement>;
  render: (page: number) => Promise<ImportedDesign>;
  close: () => void;
}

export type OpenedFile = { kind: 'single'; design: ImportedDesign } | { kind: 'pages'; source: PdfSource };

function canvasOf(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export async function openDesignFile(file: File): Promise<OpenedFile> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = detectFormat(bytes.subarray(0, 2048), file.name);
  assertImportable(format, bytes.length, file.name);
  try {
    if (format === 'pdf' || format === 'ai-pdf') {
      const source = await openPdf(bytes, file.name, format);
      if (source.pageCount === 1) {
        const design = await source.render(0);
        source.close();
        return { kind: 'single', design };
      }
      return { kind: 'pages', source };
    }
    if (format === 'svg') return { kind: 'single', design: await rasterizeSvg(new TextDecoder().decode(bytes), file.name) };
    return { kind: 'single', design: await rasterizeBitmap(bytes, file.name, format) };
  } catch (e) {
    if (e instanceof ImportError) throw e;
    throw new ImportError(`“${file.name}” looks like a ${format.toUpperCase()} file but couldn’t be read. It may be damaged; try exporting it again.`, String(e));
  }
}

async function rasterizeBitmap(bytes: Uint8Array, name: string, format: DesignFormat): Promise<ImportedDesign> {
  const mime = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }[format as 'png'] ?? 'application/octet-stream';
  const bmp = await createImageBitmap(new Blob([bytes as BlobPart], { type: mime }));
  const k = Math.min(1, RASTER_MAX_SIDE / Math.max(bmp.width, bmp.height));
  const c = canvasOf(bmp.width * k, bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return { name, format, canvas: c };
}

/** Intrinsic size of an SVG from width/height or the viewBox; falls back to a square. */
export function svgSize(svg: string): { w: number; h: number } {
  const tag = /<svg\b[^>]*>/i.exec(svg)?.[0] ?? '';
  const num = (attr: string) => {
    const m = new RegExp(`\\s${attr}\\s*=\\s*["']\\s*([\\d.]+)\\s*(px|pt|mm|cm|in)?\\s*["']`, 'i').exec(tag);
    if (!m) return NaN;
    const unit = { pt: 4 / 3, mm: 96 / 25.4, cm: 96 / 2.54, in: 96, px: 1 }[(m[2] ?? 'px').toLowerCase() as 'px'] ?? 1;
    return parseFloat(m[1]) * unit;
  };
  const vb = /\sviewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(tag);
  let w = num('width'), h = num('height');
  if (vb) {
    const vw = parseFloat(vb[1]), vh = parseFloat(vb[2]);
    if (!(w > 0) && !(h > 0)) [w, h] = [vw, vh];
    else if (!(w > 0)) w = (h * vw) / vh;
    else if (!(h > 0)) h = (w * vh) / vw;
  }
  if (!(w > 0) || !(h > 0)) return { w: 1024, h: 1024 };
  return { w, h };
}

async function rasterizeSvg(svg: string, name: string): Promise<ImportedDesign> {
  const { w, h } = svgSize(svg);
  const k = VECTOR_LONG_SIDE / Math.max(w, h);
  // Pin an explicit pixel size so the browser rasterises at full resolution, not at 300 x 150.
  const sized = svg.replace(/<svg\b([^>]*)>/i, (_m, attrs: string) => {
    let a = attrs.replace(/\s(width|height)\s*=\s*(["'])[^"']*\2/gi, '');
    if (!/\sviewBox\s*=/i.test(a)) a += ` viewBox="0 0 ${w} ${h}"`;
    return `<svg${a} width="${Math.round(w * k)}" height="${Math.round(h * k)}">`;
  });
  const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = canvasOf(w * k, h * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return { name, format: 'svg', canvas: c };
  } catch (e) {
    throw new ImportError(`“${name}” is an SVG the browser couldn’t draw. Re-export it as plain SVG (no embedded fonts or scripts) or as PNG.`, String(e));
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function loadPdfJs() {
  // The "legacy" build: pdf.js 6 otherwise relies on very new JavaScript (Map.getOrInsertComputed)
  // that iPad Safari and current Chrome do not have yet.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerUrl = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjs;
}

async function openPdf(bytes: Uint8Array, name: string, format: 'pdf' | 'ai-pdf'): Promise<PdfSource> {
  const pdfjs = await loadPdfJs();
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: bytes }).promise;
  } catch (e) {
    const msg = String(e);
    if (/password/i.test(msg)) throw new ImportError(`“${name}” is password-protected. Save an unprotected copy and try again.`, msg);
    throw e;
  }
  const renderPage = async (index: number, longSide: number) => {
    const page = await doc.getPage(index + 1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: longSide / Math.max(base.width, base.height) });
    const c = canvasOf(viewport.width, viewport.height);
    // Transparent background, so the artwork lands on skin without a white box.
    await page.render({ canvas: c, canvasContext: c.getContext('2d')!, viewport, background: 'rgba(0,0,0,0)' }).promise;
    page.cleanup();
    return c;
  };
  return {
    name,
    format,
    pageCount: doc.numPages,
    thumbnail: (i, longSide = 200) => renderPage(i, longSide),
    render: async (i) => ({ name: doc.numPages > 1 ? `${name} (page ${i + 1})` : name, format, canvas: await renderPage(i, VECTOR_LONG_SIDE), page: i }),
    close: () => void doc.loadingTask.destroy(),
  };
}
