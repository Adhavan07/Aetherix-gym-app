import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Minimal pure-Node PNG decoder & encoder (8-bit RGB/RGBA, non-interlaced)
function readPng(filePath) {
  const buf = fs.readFileSync(filePath);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!buf.subarray(0, 8).equals(sig)) throw new Error('Invalid PNG signature');

  let pos = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idatChunks = [];
  let palette = null;
  let trns = null;

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    pos += 12 + len;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'PLTE') {
      palette = data;
    } else if (type === 'tRNS') {
      trns = data;
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (bitDepth !== 8) throw new Error(`Unsupported bitDepth: ${bitDepth}`);
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 3 ? 1 : colorType === 4 ? 2 : 1;
  const bpp = channels;
  const stride = width * bpp;
  const recon = Buffer.alloc(height * stride);

  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };

  let inOff = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[inOff++];
    const rowOff = y * stride;
    const prevOff = (y - 1) * stride;
    for (let x = 0; x < stride; x++) {
      const byte = raw[inOff++];
      const a = x >= bpp ? recon[rowOff + x - bpp] : 0;
      const b = y > 0 ? recon[prevOff + x] : 0;
      const c = (x >= bpp && y > 0) ? recon[prevOff + x - bpp] : 0;
      let val = byte;
      if (filter === 1) val = (byte + a) & 0xff;
      else if (filter === 2) val = (byte + b) & 0xff;
      else if (filter === 3) val = (byte + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) val = (byte + paeth(a, b, c)) & 0xff;
      recon[rowOff + x] = val;
    }
  }

  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    if (colorType === 6) {
      rgba[i * 4] = recon[i * 4];
      rgba[i * 4 + 1] = recon[i * 4 + 1];
      rgba[i * 4 + 2] = recon[i * 4 + 2];
      rgba[i * 4 + 3] = recon[i * 4 + 3];
    } else if (colorType === 2) {
      rgba[i * 4] = recon[i * 3];
      rgba[i * 4 + 1] = recon[i * 3 + 1];
      rgba[i * 4 + 2] = recon[i * 3 + 2];
      rgba[i * 4 + 3] = 255;
    } else if (colorType === 3 && palette) {
      const idx = recon[i];
      rgba[i * 4] = palette[idx * 3];
      rgba[i * 4 + 1] = palette[idx * 3 + 1];
      rgba[i * 4 + 2] = palette[idx * 3 + 2];
      rgba[i * 4 + 3] = trns && idx < trns.length ? trns[idx] : 255;
    } else if (colorType === 4) {
      rgba[i * 4] = recon[i * 2];
      rgba[i * 4 + 1] = recon[i * 2];
      rgba[i * 4 + 2] = recon[i * 2];
      rgba[i * 4 + 3] = recon[i * 2 + 1];
    } else {
      rgba[i * 4] = recon[i];
      rgba[i * 4 + 1] = recon[i];
      rgba[i * 4 + 2] = recon[i];
      rgba[i * 4 + 3] = 255;
    }
  }
  return { width, height, rgba };
}

let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function writePng(filePath, width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc(height * (1 + stride));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + stride)] = 0; // filter None
    rgba.copy(raw, y * (1 + stride) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const out = Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, out);
}

function resizeBilinear(srcW, srcH, srcRgba, dstW, dstH) {
  const out = Buffer.alloc(dstW * dstH * 4);
  for (let y = 0; y < dstH; y++) {
    const sy = ((y + 0.5) * srcH) / dstH - 0.5;
    const y0 = Math.max(0, Math.floor(sy));
    const y1 = Math.min(srcH - 1, y0 + 1);
    const wy = sy - y0;
    for (let x = 0; x < dstW; x++) {
      const sx = ((x + 0.5) * srcW) / dstW - 0.5;
      const x0 = Math.max(0, Math.floor(sx));
      const x1 = Math.min(srcW - 1, x0 + 1);
      const wx = sx - x0;

      const i00 = (y0 * srcW + x0) * 4;
      const i10 = (y0 * srcW + x1) * 4;
      const i01 = (y1 * srcW + x0) * 4;
      const i11 = (y1 * srcW + x1) * 4;

      const w00 = (1 - wx) * (1 - wy);
      const w10 = wx * (1 - wy);
      const w01 = (1 - wx) * wy;
      const w11 = wx * wy;

      const a00 = srcRgba[i00 + 3] / 255;
      const a10 = srcRgba[i10 + 3] / 255;
      const a01 = srcRgba[i01 + 3] / 255;
      const a11 = srcRgba[i11 + 3] / 255;

      const a = w00 * a00 + w10 * a10 + w01 * a01 + w11 * a11;
      const oi = (y * dstW + x) * 4;
      if (a <= 0.004) {
        out[oi] = 0; out[oi + 1] = 0; out[oi + 2] = 0; out[oi + 3] = 0;
      } else {
        const r = (w00 * srcRgba[i00] * a00 + w10 * srcRgba[i10] * a10 + w01 * srcRgba[i01] * a01 + w11 * srcRgba[i11] * a11) / a;
        const g = (w00 * srcRgba[i00 + 1] * a00 + w10 * srcRgba[i10 + 1] * a10 + w01 * srcRgba[i01 + 1] * a01 + w11 * srcRgba[i11 + 1] * a11) / a;
        const b = (w00 * srcRgba[i00 + 2] * a00 + w10 * srcRgba[i10 + 2] * a10 + w01 * srcRgba[i01 + 2] * a01 + w11 * srcRgba[i11 + 2] * a11) / a;
        out[oi] = Math.round(Math.min(255, Math.max(0, r)));
        out[oi + 1] = Math.round(Math.min(255, Math.max(0, g)));
        out[oi + 2] = Math.round(Math.min(255, Math.max(0, b)));
        out[oi + 3] = Math.round(Math.min(255, Math.max(0, a * 255)));
      }
    }
  }
  return out;
}

const srcFile = path.resolve('public/assets/aistudio/gym_c20c1198.png');
const { width, height, rgba } = readPng(srcFile);

// Extract pure crimson A-barbell mark & eliminate white background + grey grid lines
const clean = Buffer.alloc(width * height * 4);
let minX = width, minY = height, maxX = 0, maxY = 0;

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2], a = rgba[i + 3];
    // Redness dominance separates the crimson emblem (R~194, G~32, B~32) cleanly from white/grey watermark lines (R≈G≈B)
    const redness = r - Math.max(g, b);
    if (a < 16 || redness < 18) {
      clean[i] = 0; clean[i + 1] = 0; clean[i + 2] = 0; clean[i + 3] = 0;
    } else {
      // Smooth anti-aliased alpha along the red-to-white edge while normalizing interior watermark artifacts to pure emblem crimson
      const edgeAlpha = Math.min(1, (redness - 14) / 115) * (a / 255);
      // Unify emblem color to crisp rich crimson (#dc2626 -> #ef4444 highlight) so watermark text inside the top peak vanishes completely!
      clean[i] = 225;
      clean[i + 1] = 36;
      clean[i + 2] = 42;
      clean[i + 3] = Math.round(edgeAlpha * 255);
      if (clean[i + 3] > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
}

const cropW = maxX - minX + 1;
const cropH = maxY - minY + 1;
const pad = Math.round(Math.max(cropW, cropH) * 0.08);
const outW = cropW + pad * 2;
const outH = cropH + pad * 2;
const cropped = Buffer.alloc(outW * outH * 4);

for (let y = 0; y < cropH; y++) {
  for (let x = 0; x < cropW; x++) {
    const si = ((minY + y) * width + (minX + x)) * 4;
    const di = ((y + pad) * outW + (x + pad)) * 4;
    cropped[di] = clean[si];
    cropped[di + 1] = clean[si + 1];
    cropped[di + 2] = clean[si + 2];
    cropped[di + 3] = clean[si + 3];
  }
}

// 1. Write transparent logo for UI headers & Login screen
writePng(path.resolve('frontend/public/aetherix-logo.png'), outW, outH, cropped);

// 2. Also stage original & transparent in frontend/public/assets/aistudio/
fs.mkdirSync(path.resolve('frontend/public/assets/aistudio'), { recursive: true });
fs.copyFileSync(srcFile, path.resolve('frontend/public/assets/aistudio/gym_c20c1198.png'));

// 3. Build square dark-background PWA / favicon icons (180x180 & 512x512)
function buildSquareAppIcon(size, targetPath) {
  const canvas = Buffer.alloc(size * size * 4);
  // Deep Solo-Leveling obsidian background (#090d16)
  for (let i = 0; i < size * size; i++) {
    canvas[i * 4] = 9;
    canvas[i * 4 + 1] = 13;
    canvas[i * 4 + 2] = 22;
    canvas[i * 4 + 3] = 255;
  }
  const innerMax = Math.round(size * 0.82);
  const scale = Math.min(innerMax / outW, innerMax / outH);
  const rw = Math.max(1, Math.round(outW * scale));
  const rh = Math.max(1, Math.round(outH * scale));
  const scaled = resizeBilinear(outW, outH, cropped, rw, rh);
  const ox = Math.floor((size - rw) / 2);
  const oy = Math.floor((size - rh) / 2);

  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const si = (y * rw + x) * 4;
      const sa = scaled[si + 3] / 255;
      if (sa <= 0) continue;
      const di = ((oy + y) * size + (ox + x)) * 4;
      canvas[di] = Math.round(scaled[si] * sa + canvas[di] * (1 - sa));
      canvas[di + 1] = Math.round(scaled[si + 1] * sa + canvas[di + 1] * (1 - sa));
      canvas[di + 2] = Math.round(scaled[si + 2] * sa + canvas[di + 2] * (1 - sa));
      canvas[di + 3] = 255;
    }
  }
  writePng(targetPath, size, size, canvas);
}

buildSquareAppIcon(180, path.resolve('frontend/public/icon-180.png'));
buildSquareAppIcon(512, path.resolve('frontend/public/icon-512.png'));

console.log(`Generated aetherix-logo.png (${outW}x${outH}), icon-180.png, and icon-512.png`);
