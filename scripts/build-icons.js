/**
 * build-icons.js – Erstellt minimale gültige PNG-Icons ohne externe Libraries.
 * Nutzt reinen Node.js Buffer + manuell zusammengesetztes PNG-Format.
 * Ausführen mit: node build-icons.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── PNG Encoder (minimal, für einfarbige Icons) ───────────────────────────────

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf));
  return Buffer.concat([len, typeBytes, data, crc]);
}

function createPNG(size, pixels) {
  // pixels: Array von [r,g,b,a] pro Pixel, Zeile für Zeile
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);  // width
  ihdr.writeUInt32BE(size, 4);  // height
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // color type: RGB (kein Alpha für Einfachheit, nutze RGBA = 6)
  ihdr[9] = 6;   // RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  // Raw image data (mit Filter-Byte 0 pro Zeile)
  const rawLines = [];
  for (let y = 0; y < size; y++) {
    const line = [0]; // filter byte
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixels[y * size + x];
      line.push(r, g, b, a);
    }
    rawLines.push(Buffer.from(line));
  }
  const rawData = Buffer.concat(rawLines);
  const compressed = zlib.deflateSync(rawData);

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Icon-Design (Schild + Häkchen, Lila-Verlauf) ────────────────────────────────
// Vektoriell in normalisierten 0..1-Koordinaten definiert und per Supersampling
// (4x4) anti-aliased gerastert. Identisches Design wie assets/logo.svg & favicon.svg.

const SS = 4;                       // Supersampling-Faktor pro Achse
const BG1 = [168, 107, 255];        // #A86BFF  (oben links)
const BG2 = [109, 40, 217];         // #6D28D9  (unten rechts)
const WHITE = [255, 255, 255];
const CHK1 = [124, 58, 237];        // #7C3AED
const CHK2 = [91, 33, 182];         // #5B21B6

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];

// abgerundetes Quadrat (Radius r in 0..1)
function inRoundedSquare(u, v, r) {
  const dx = u < r ? r - u : (u > 1 - r ? u - (1 - r) : 0);
  const dy = v < r ? r - v : (v > 1 - r ? v - (1 - r) : 0);
  return Math.sqrt(dx * dx + dy * dy) <= r;
}

// halbe Schildbreite an Höhe v (oben gerundet, unten zur Spitze auslaufend)
function shieldHalf(v) {
  const top = 0.16, bottom = 0.865, shoulder = 0.515, halfTop = 0.305, cr = 0.10;
  if (v < top || v > bottom) return -1;
  if (v <= shoulder) {
    if (v < top + cr) {
      const dy = (top + cr) - v;
      return halfTop - (cr - Math.sqrt(Math.max(0, cr * cr - dy * dy)));
    }
    return halfTop;
  }
  const frac = (v - shoulder) / (bottom - shoulder);
  return halfTop * (1 - Math.pow(frac, 1.7));
}

// Häkchen als zwei dicke Liniensegmente
const CHK = [[0.345, 0.50], [0.45, 0.605], [0.665, 0.40]];
const CHK_HALF = 0.052;
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function inCheck(u, v) {
  return distSeg(u, v, CHK[0][0], CHK[0][1], CHK[1][0], CHK[1][1]) <= CHK_HALF ||
         distSeg(u, v, CHK[1][0], CHK[1][1], CHK[2][0], CHK[2][1]) <= CHK_HALF;
}

// Farbe eines Subsamples (Alpha 0 oder 255)
function sampleColor(u, v) {
  if (!inRoundedSquare(u, v, 0.225)) return [0, 0, 0, 0];
  // Diagonaler Hintergrund-Verlauf
  let col = mix(BG1, BG2, clamp(u * 0.45 + v * 0.55, 0, 1));
  // Sanfter Glanz oben
  col = mix(col, WHITE, clamp((0.42 - v) * 0.42, 0, 0.16));
  // Schild
  const hw = shieldHalf(v);
  if (hw > 0 && Math.abs(u - 0.5) <= hw) {
    col = inCheck(u, v)
      ? mix(CHK1, CHK2, clamp(u * 0.4 + v * 0.6, 0, 1))
      : WHITE.slice();
  }
  return [col[0], col[1], col[2], 255];
}

function drawIcon(size) {
  const pixels = new Array(size * size);
  const n = SS * SS;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          const c = sampleColor(u, v);
          r += c[0] * c[3]; g += c[1] * c[3]; b += c[2] * c[3]; a += c[3];
        }
      }
      pixels[y * size + x] = a === 0
        ? [0, 0, 0, 0]
        : [Math.round(r / a), Math.round(g / a), Math.round(b / a), Math.round(a / n)];
    }
  }
  return pixels;
}

// ── Icons erstellen ───────────────────────────────────────────────────────────
const iconsDir = path.join(__dirname, '..', 'src', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

[16, 48, 128].forEach(size => {
  const png = createPNG(size, drawIcon(size));
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
  console.log(`✓ icons/icon${size}.png erstellt (${png.length} Bytes)`);
});

// Hochauflösendes Logo für die Website (PNG-Fallback / OG-Image)
const webAssets = path.join(__dirname, 'website', 'assets');
if (fs.existsSync(webAssets)) {
  const logoPng = createPNG(256, drawIcon(256));
  fs.writeFileSync(path.join(webAssets, 'logo.png'), logoPng);
  console.log(`✓ website/assets/logo.png erstellt (${logoPng.length} Bytes)`);
}

console.log('\n✅ Alle Icons erfolgreich erstellt!');
