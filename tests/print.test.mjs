import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')

test('impressão A4 conserva espaçamento e entradas sem regras conflitantes', () => {
  const printBlocks = css.match(/@media print\s*\{/g) ?? []
  assert.equal(printBlocks.length, 1)
  assert.match(css, /\.resume-section\+\.resume-section\s*\{\s*padding-top:21px/)
  assert.match(css, /\.resume-section\+\.resume-section\s*\{\s*padding-top:15pt/)
  assert.match(css, /@page\s*\{\s*size:A4;\s*margin:18mm 17mm/)
  assert.match(css, /\.resume-entry\s*\{\s*break-inside:avoid;page-break-inside:avoid/)
  assert.doesNotMatch(css, /\.resume-entry\s*\{[^}]*break-inside:auto/)
  assert.match(css, /\.resume-section h2\s*\{\s*break-after:avoid/)
})
