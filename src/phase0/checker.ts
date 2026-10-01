/**
 * The Phase 0 test design: a checkerboard with exactly 1-inch cells, a red border, a centre cross
 * and an upright "F" + arrow so mirroring and rotation are obvious at a glance.
 */
export const PX_PER_INCH = 96;

export function drawChecker(widthIn: number, heightIn: number, band = false): HTMLCanvasElement {
  // A band must tile around the limb: use a whole, even number of columns (cells ~1 in wide) and no
  // side borders, so any visible line at the seam is a real wrapping error.
  const cols = band ? Math.max(2, 2 * Math.round(widthIn / 2)) : 0;
  const w = band ? cols * PX_PER_INCH : Math.max(8, Math.round(widthIn * PX_PER_INCH));
  const h = Math.max(8, Math.round(heightIn * PX_PER_INCH));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, w, h);
  // Cells are laid out from the centre so the centre cross sits on a cell corner.
  const cx = w / 2, cy = h / 2, s = PX_PER_INCH;
  g.fillStyle = '#16182b';
  for (let i = -Math.ceil(heightIn); i <= Math.ceil(heightIn); i++) {
    for (let j = -Math.ceil(widthIn); j <= Math.ceil(widthIn); j++) {
      if ((i + j) % 2 === 0) g.fillRect(cx + j * s, cy + i * s, s, s);
    }
  }
  g.strokeStyle = '#c0182b';
  g.lineWidth = Math.max(2, s * 0.04);
  if (band) {
    g.fillStyle = '#c0182b';
    g.fillRect(0, 0, w, g.lineWidth);
    g.fillRect(0, h - g.lineWidth, w, g.lineWidth);
    g.fillStyle = '#16182b';
  } else {
    g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth);
  }
  g.beginPath();
  g.moveTo(cx - s * 0.3, cy);
  g.lineTo(cx + s * 0.3, cy);
  g.moveTo(cx, cy - s * 0.3);
  g.lineTo(cx, cy + s * 0.3);
  g.stroke();
  // "F" and an up arrow in the light cell just above-right of the centre.
  const ox = cx, oy = cy - s;
  g.fillStyle = '#c0182b';
  g.font = `bold ${Math.round(s * 0.7)}px system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('F', ox + s * 0.35, oy + s * 0.55);
  g.beginPath();
  g.moveTo(ox + s * 0.78, oy + s * 0.15);
  g.lineTo(ox + s * 0.62, oy + s * 0.4);
  g.lineTo(ox + s * 0.94, oy + s * 0.4);
  g.closePath();
  g.fill();
  g.fillRect(ox + s * 0.74, oy + s * 0.38, s * 0.08, s * 0.45);
  return c;
}
