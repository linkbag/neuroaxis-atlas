/**
 * scripts/lib/png.mjs — minimal PNG encoder (Node, zero dependencies).
 *
 * Supports 8-bit grayscale (colorType 0) and 8-bit RGB (colorType 2),
 * filter type 0 (None) per scanline, zlib-deflated IDAT.  Used by
 * scripts/build-mri-grid.mjs to write QA preview PNGs of the registered
 * MRI grid + anatomy silhouette overlays (assets-src/imaging/preview/*.png).
 *
 * Deterministic: fixed compression level, no timestamps (tEXt chunks are
 * only written when explicitly requested), no RNG.
 */

import { deflateSync } from 'node:zlib';

/** CRC-32 (IEEE 802.3, table-driven) — the PNG chunk CRC algorithm. */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length, false);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crc = crc32(out.subarray(4, 8 + data.length));
  dv.setUint32(8 + data.length, crc, false);
  return out;
}

/**
 * Encode an image to PNG bytes.
 * @param {object} img { width, height, channels: 1|3, pixels: Uint8Array
 *                       (row-major, length = w*h*channels) }
 * @returns {Uint8Array}
 */
export function encodePng(img) {
  const { width: w, height: h, channels } = img;
  if (!(channels === 1 || channels === 3)) throw new Error('png: channels must be 1 or 3');
  if (!img.pixels || img.pixels.length !== w * h * channels) {
    throw new Error('png: pixel buffer size mismatch');
  }

  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w, false);
  dv.setUint32(4, h, false);
  ihdr[8] = 8; // bit depth
  ihdr[9] = channels === 1 ? 0 : 2; // colorType 0 = grayscale, 2 = RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw scanlines each prefixed by filter byte 0 (None).
  const stride = w * channels;
  const raw = new Uint8Array(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    raw.set(img.pixels.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }

  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 6 })),
    chunk('IEND', new Uint8Array(0)),
  ];
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/**
 * Value → grayscale luminance for encoded images (colorized in RGB via
 * per-channel multiply/offset when channels=3).
 */
export function toLumaBytes(values, lo, hi) {
  const out = new Uint8Array(values.length);
  const span = hi - lo || 1;
  for (let i = 0; i < values.length; i++) {
    const t = (values[i] - lo) / span;
    out[i] = Math.max(0, Math.min(255, Math.round(t * 255)));
  }
  return out;
}
