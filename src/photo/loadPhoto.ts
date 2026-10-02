/** Longest side kept from a client photo: plenty for a mockup, safe for iPad GPU memory. */
export const MAX_PHOTO_SIDE = 3072;

/**
 * Decode a photo (camera or library) into a canvas, upright (browsers apply the EXIF orientation
 * when drawing an <img>) and scaled down to MAX_PHOTO_SIDE. Never leaves the device.
 */
export async function loadPhoto(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    try {
      await img.decode();
    } catch {
      throw new Error(`“${file.name}” isn’t a photo this browser can open. Use JPG, PNG or HEIC from the camera.`);
    }
    const k = Math.min(1, MAX_PHOTO_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * k));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * k));
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}
