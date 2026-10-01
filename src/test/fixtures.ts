/**
 * Tiny, valid PDFs built in code so tests need no binary fixtures. Each page has a filled square.
 * `junkPrefix` simulates an Illustrator .ai file, whose PDF part may follow a short preamble.
 */
export function makePdf(pages: number, opts: { junkPrefix?: string } = {}): Uint8Array {
  const objs: string[] = [];
  const kids: number[] = [];
  // 1: catalog, 2: pages, then per page: page obj + content obj
  for (let i = 0; i < pages; i++) {
    const pageId = 3 + 2 * i, contentId = 4 + 2 * i;
    kids.push(pageId);
    const stream = `0 0 0 rg ${20 + 10 * i} 20 100 100 re f`;
    objs[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 150] /Contents ${contentId} 0 R >>`;
    objs[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  }
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objs[2] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${pages} >>`;
  const prefix = opts.junkPrefix ?? '';
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let id = 1; id < objs.length; id++) {
    offsets[id] = prefix.length + out.length;
    out += `${id} 0 obj\n${objs[id]}\nendobj\n`;
  }
  const xref = prefix.length + out.length;
  out += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objs.length; id++) out += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(prefix + out);
}

export const LEGACY_AI = new TextEncoder().encode('%!PS-Adobe-3.0\n%%Creator: Adobe Illustrator(R) 8.0\n%%BoundingBox: 0 0 100 100\n');
