// Rasterises the Eclipse Court icon (a gold corona around a dark disc) to the PNG sizes the manifest needs.
// Run with `npm run icons`; the output is committed.
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const BG = [0x14, 0x10, 0x2b]
const GOLD = [0xe8, 0xb6, 0x4a]
const CREAM = [0xfb, 0xe3, 0x9a]
const VIOLET = [0x7a, 0x5c, 0xc8]

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)
const smooth = (edge0, edge1, x) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/** Colour at (u, v) in [-1, 1]; `scale` shrinks the art to fit a maskable safe zone. */
function shade(u, v, scale) {
  const r = Math.hypot(u, v) / scale
  let c = BG
  const corona = 1 - smooth(0.4, 0.78, r)
  c = mix(c, mix(CREAM, GOLD, smooth(0.25, 0.6, r)), corona)
  const disc = 1 - smooth(0.235, 0.245, r)
  c = mix(c, BG, disc)
  const ring = 1 - smooth(0.012, 0.02, Math.abs(r - 0.24))
  return mix(c, VIOLET, ring)
}

function crc32(buf) {
  let c
  let crc = ~0
  for (const byte of buf) {
    c = (crc ^ byte) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return ~crc >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size, scale) {
  const raw = Buffer.alloc((size * 3 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b] = shade(((x + 0.5) / size) * 2 - 1, ((y + 0.5) / size) * 2 - 1, scale)
      const o = y * (size * 3 + 1) + 1 + x * 3
      raw[o] = r
      raw[o + 1] = g
      raw[o + 2] = b
    }
  }
  const head = Buffer.alloc(13)
  head.writeUInt32BE(size, 0)
  head.writeUInt32BE(size, 4)
  head.set([8, 2, 0, 0, 0], 8)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', head),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public', { recursive: true })
writeFileSync('public/icon-192.png', png(192, 1))
writeFileSync('public/icon-512.png', png(512, 1))
// Maskable icons keep their art inside the central 80% circle.
writeFileSync('public/icon-maskable-512.png', png(512, 0.8))
writeFileSync('public/apple-touch-icon.png', png(180, 0.9))
