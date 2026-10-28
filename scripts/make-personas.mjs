// Converts the persona portraits in images/ to the WebP files the app loads from public/personas/<id>.webp.
// Run with `npm run personas`; the output is committed. Add a persona by adding its source file to FILES.
import { mkdirSync } from 'node:fs'
import sharp from 'sharp'

const FILES = {
  cassia: 'cassia-lark.png',
  pym: 'thessaly-pym.png',
  bea: 'beatrix-holloway.png',
  mudge: 'mudge.png',
  lowen: 'lowen-harrow.png',
  digby: 'digby-gray.png',
  quill: 'quill-ferrant.png',
  regent: 'echo-pale-regent.png',
}

mkdirSync('public/personas', { recursive: true })
for (const [id, file] of Object.entries(FILES)) {
  const info = await sharp(`images/${file}`).webp({ quality: 82 }).toFile(`public/personas/${id}.webp`)
  console.log(`${id}: ${info.width}x${info.height}, ${(info.size / 1024).toFixed(0)} KB`)
}
