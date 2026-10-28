// Flattens a stylesheet into an ordered ledger of atomic declarations so two versions of
// index.css can be diffed: one line per (at-rule context, selector, declaration), with
// selector lists split. Usage: node scripts/css-ledger.mjs [file]   (reads stdin without a file)
import { readFileSync } from 'node:fs'
import postcss from 'postcss'

const css = readFileSync(process.argv[2] ?? 0, 'utf8')
const norm = (s) => s.replace(/\s+/g, ' ').trim()
const out = []

postcss.parse(css).walk((node) => {
  if (node.type === 'rule') {
    const parent = node.parent
    const ctx = []
    for (let p = parent; p && p.type === 'atrule'; p = p.parent) ctx.unshift(`@${p.name} ${norm(p.params)}`)
    const context = ctx.join(' > ')
    for (const sel of node.selectors) {
      for (const d of node.nodes) {
        if (d.type !== 'decl') continue
        out.push(`${context} | ${norm(sel)} | ${d.prop}: ${norm(d.value)}${d.important ? ' !important' : ''}`)
      }
    }
  }
})

console.log(out.join('\n'))
