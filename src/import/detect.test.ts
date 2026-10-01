import { describe, expect, it } from 'vitest';
import { AI_LEGACY_MESSAGE, assertImportable, detectFormat, ImportError } from './detect';
import { svgSize } from './rasterize';
import { LEGACY_AI, makePdf } from '../test/fixtures';

const bytes = (s: string) => new TextEncoder().encode(s);

describe('format detection', () => {
  it('sniffs rasters from their magic bytes, whatever the name says', () => {
    expect(detectFormat(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]), 'design.jpg')).toBe('png');
    expect(detectFormat(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), 'x')).toBe('jpeg');
    expect(detectFormat(bytes('RIFF\0\0\0\0WEBPVP8 '), 'x')).toBe('webp');
    expect(detectFormat(bytes('GIF89a'), 'x.gif')).toBe('gif');
  });

  it('recognises SVG with an XML prolog, comments or doctype', () => {
    expect(detectFormat(bytes('<?xml version="1.0"?>\n<!-- Generator: Adobe Illustrator -->\n<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBe('svg');
    expect(detectFormat(bytes('﻿<svg width="10" height="10"></svg>'))).toBe('svg');
    expect(detectFormat(bytes('<html><svg></svg></html>'), 'page.html')).toBe('unknown');
  });

  it('treats PDF-compatible .ai as PDF, and old .ai as a friendly error', () => {
    expect(detectFormat(makePdf(1), 'a.pdf')).toBe('pdf');
    expect(detectFormat(makePdf(2, { junkPrefix: '%AI preamble\n' }), 'flash.ai')).toBe('ai-pdf');
    expect(detectFormat(LEGACY_AI, 'old.ai')).toBe('ai-legacy');
    try {
      assertImportable('ai-legacy', 100, 'old.ai');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ImportError);
      expect((e as ImportError).userMessage).toBe(AI_LEGACY_MESSAGE);
      expect(AI_LEGACY_MESSAGE).toContain('Create PDF Compatible File');
    }
  });

  it('rejects empty, huge and unknown files with readable messages', () => {
    expect(() => assertImportable('png', 0, 'a.png')).toThrow(ImportError);
    expect(() => assertImportable('png', 500 * 1024 * 1024, 'a.png')).toThrow(/limit/);
    expect(() => assertImportable('unknown', 10, 'notes.docx')).toThrow(ImportError);
    expect(() => assertImportable('png', 10, 'a.png')).not.toThrow();
  });
});

describe('SVG size', () => {
  it('reads width/height with units, or the viewBox', () => {
    expect(svgSize('<svg width="2in" height="1in">')).toEqual({ w: 192, h: 96 });
    expect(svgSize('<svg viewBox="0 0 300 150">')).toEqual({ w: 300, h: 150 });
    expect(svgSize('<svg width="600" viewBox="0 0 300 150">')).toEqual({ w: 600, h: 300 });
    expect(svgSize('<svg>')).toEqual({ w: 1024, h: 1024 });
  });
});

describe('PDF fixtures', () => {
  it('pdf.js opens a multi-page PDF and a PDF-compatible .ai', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    for (const [data, pages] of [[makePdf(3), 3], [makePdf(2, { junkPrefix: '%AI preamble\n' }), 2]] as const) {
      const doc = await pdfjs.getDocument({ data: data.slice() }).promise;
      expect(doc.numPages).toBe(pages);
      const page = await doc.getPage(1);
      expect(page.getViewport({ scale: 1 }).width).toBe(200);
      await doc.loadingTask.destroy();
    }
  });
});
