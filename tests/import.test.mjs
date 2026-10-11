import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import mammoth from 'mammoth'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { ensureUsableText, normalizeDocxText, validateDocxArchive, validateFile } from '../src/import/fileValidation.ts'
import { pageTextFromItems } from '../src/import/pdfText.ts'
import { parseResumeText } from '../src/import/parseResume.ts'

const fixture = name => readFileSync(new URL(`./fixtures/${name}`, import.meta.url))
const arrayBuffer = bytes => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)

function assertRecognized(result) {
  assert.equal(result.data.name, 'Ana Carolina Silva')
  assert.equal(result.data.role, 'Analista de Marketing')
  assert.equal(result.data.email, 'ana.silva@exemplo.com')
  assert.equal(result.data.phone, '(11) 99999-8888')
  assert.equal(result.data.city, 'Sao Paulo, SP')
  assert.equal(result.data.experiences.length, 2)
  assert.equal(result.data.experiences[1].company, 'Empresa Beta')
  assert.equal(result.data.education.length, 2)
  assert.equal(result.data.education[1].institution, 'Escola Modelo')
  assert.match(result.data.objective, /marketing digital/)
  assert.match(result.data.skills, /Excel/)
}

test('extrai e identifica múltiplas entradas em PDF fictício', async () => {
  const bytes = fixture('curriculo-ficticio.pdf')
  assert.equal(validateFile({ name: 'curriculo.pdf', size: bytes.length }, bytes), 'pdf')
  const loading = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true })
  try {
    const pdf = await loading.promise
    const page = await pdf.getPage(1)
    const content = await page.getTextContent()
    const text = ensureUsableText(pageTextFromItems(content.items.filter(item => 'str' in item)), 'pdf')
    assertRecognized(parseResumeText(text))
  } finally { await loading.destroy() }
})

test('extrai e identifica múltiplas entradas em DOCX fictício', async () => {
  const bytes = fixture('curriculo-ficticio.docx')
  assert.equal(validateFile({ name: 'curriculo.docx', size: bytes.length }, bytes), 'docx')
  validateDocxArchive(arrayBuffer(bytes))
  const document = await mammoth.extractRawText({ buffer: bytes })
  assertRecognized(parseResumeText(ensureUsableText(normalizeDocxText(document.value), 'docx')))
})

test('rejeita extensão incompatível, arquivo grande e DOCX compactado suspeito', () => {
  const pdf = fixture('curriculo-ficticio.pdf')
  const docx = fixture('curriculo-ficticio.docx')
  assert.throws(() => validateFile({ name: 'curriculo.docx', size: pdf.length }, pdf), /extensão/)
  assert.throws(() => validateFile({ name: 'curriculo.pdf', size: 5 * 1024 * 1024 + 1 }, pdf), /5 MB/)
  const tampered = Buffer.from(docx)
  const central = tampered.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]))
  tampered.writeUInt32LE(30 * 1024 * 1024, central + 24)
  assert.throws(() => validateDocxArchive(arrayBuffer(tampered)), /grande demais/)
})

test('informa PDF digitalizado e mantém vazios os campos ausentes', () => {
  assert.throws(() => ensureUsableText('', 'pdf'), /digitalizado/)
  const result = parseResumeText('Currículo Vitae\nContato\nana@exemplo.com\nObjetivo profissional\nAtuar em uma nova posição.')
  assert.equal(result.data.name, '')
  assert.equal(result.data.email, 'ana@exemplo.com')
  assert.equal(result.data.experiences.length, 0)
  assert.ok(result.missing.includes('Nome'))
  assert.ok(result.missing.includes('Experiências'))
})
