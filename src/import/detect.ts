/**
 * File type detection from the bytes, not the name: designs arrive from email, AirDrop and the
 * iPad Files app with wrong or missing extensions.
 */
export type DesignFormat = 'png' | 'jpeg' | 'webp' | 'gif' | 'svg' | 'pdf' | 'ai-pdf' | 'ai-legacy' | 'unknown';

export class ImportError extends Error {
  /** Message written for the artist, shown as-is in the UI. */
  constructor(public userMessage: string, detail?: string) {
    super(detail ?? userMessage);
  }
}

export const MAX_FILE_BYTES = 80 * 1024 * 1024;

export const AI_LEGACY_MESSAGE =
  'This Illustrator file was saved without PDF compatibility, so it can’t be opened here. Re-save it from Illustrator with “Create PDF Compatible File” checked, or export it as PNG or SVG.';

const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.subarray(from, Math.min(to, b.length)));

export function detectFormat(head: Uint8Array, fileName = ''): DesignFormat {
  const isAi = /\.ai$/i.test(fileName);
  if (head[0] === 0x89 && ascii(head, 1, 4) === 'PNG') return 'png';
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'jpeg';
  if (ascii(head, 0, 4) === 'RIFF' && ascii(head, 8, 12) === 'WEBP') return 'webp';
  if (ascii(head, 0, 4) === 'GIF8') return 'gif';
  // PDF: the header may follow a little junk (allowed by the spec within the first 1024 bytes).
  const start = ascii(head, 0, 1024);
  if (start.includes('%PDF-')) return isAi ? 'ai-pdf' : 'pdf';
  // Illustrator 8 and older, or saved without PDF compatibility: PostScript only.
  if (start.startsWith('%!PS-Adobe')) return isAi || /Illustrator/i.test(start) ? 'ai-legacy' : 'unknown';
  const text = start.replace(/^(\xEF\xBB\xBF|﻿)/, '').trimStart(); // drop a UTF-8 byte-order mark
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(text) || (/<svg[\s>]/i.test(text) && /\.svg$/i.test(fileName))) return 'svg';
  return 'unknown';
}

/** Throws an ImportError with a friendly message for anything we cannot import. */
export function assertImportable(format: DesignFormat, size: number, fileName: string): void {
  if (size === 0) throw new ImportError(`“${fileName}” is empty.`);
  if (size > MAX_FILE_BYTES) throw new ImportError(`“${fileName}” is ${(size / 1048576).toFixed(0)} MB. The limit is ${MAX_FILE_BYTES / 1048576} MB; export a smaller PNG or PDF.`);
  if (format === 'ai-legacy') throw new ImportError(AI_LEGACY_MESSAGE);
  if (format === 'gif') throw new ImportError('GIF isn’t supported. Export the design as PNG instead.');
  if (format === 'unknown') throw new ImportError(`“${fileName}” isn’t a file type we can read. Use PNG, JPG, WEBP, SVG, PDF or Illustrator (.ai).`);
}
