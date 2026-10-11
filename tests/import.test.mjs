import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import mammoth from 'mammoth'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { ensureUsableText, normalizeDocxText, validateDocxArchive, validateFile } from '../src/import/fileValidation.ts'
import { normalizePdfText, normalizePdfYears, pageTextFromItems } from '../src/import/pdfText.ts'
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

function assertComplex(result) {
  const { data } = result
  assert.equal(data.experiences.length, 5)
  assert.deepEqual(data.experiences.map(item => item.company), ['Empresa Aurora', 'Empresa Horizonte', 'Empresa Cedro', 'Empresa Lago', 'Empresa Vento'])
  assert.equal(data.experiences[0].role, 'Analista Sênior')
  assert.equal(data.experiences[0].period, 'março de 2025 – atual')
  assert.equal(data.experiences[0].location, 'Sorocaba/SP')
  assert.equal(data.experiences[1].location, 'Campinas, SP')
  assert.ok(data.experiences.every(item => !/Empresa (?:Aurora|Horizonte|Cedro|Lago|Vento)/.test(item.description)))
  assert.equal(data.education.length, 2)
  assert.deepEqual(data.education.map(item => item.institution), ['Universidade Modelo', 'Instituto Exemplo'])
  assert.match(data.certifications, /Certificação em Análise/)
  assert.match(data.languages, /Inglês — avançado/)
}

test('mantém cinco experiências, formações e acentos no PDF', async () => {
  const bytes = fixture('curriculo-complexo.pdf')
  const loading = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true })
  try {
    const pdf = await loading.promise
    const page = await pdf.getPage(1)
    const content = await page.getTextContent()
    assertComplex(parseResumeText(pageTextFromItems(content.items.filter(item => 'str' in item))))
  } finally { await loading.destroy() }
})

test('mantém cinco experiências, formações e acentos no DOCX', async () => {
  const bytes = fixture('curriculo-complexo.docx')
  validateDocxArchive(arrayBuffer(bytes))
  const document = await mammoth.extractRawText({ buffer: bytes })
  assertComplex(parseResumeText(normalizeDocxText(document.value)))
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

const varied = `Pessoa Fictícia
Profissional de Testes
EXPERIÊNCIAS PROFISSIONAIS
Empresa Prisma – Analista (março de 2025 – atual, Curitiba/PR)
Projetos técnicos.
Coordenador                         outubro de 2023 – março de 2025
Empresa Nuvem
Coordenou equipe.
Empresa Coral
Técnico de Campo
janeiro de 2017 – dezembro de 2018
Atendimento externo.
Consultor – Empresa Ponte
2020 – 2022 | Recife, PE
Consultoria.
Técnico de Laboratório – Empresa Brisa
Assistente – Empresa Rio
2015 – 2016
FORMAÇÃO ACADÊMICA
Universidade Fictícia – Bacharelado em Física (2022 – 2024)
Curso de Tecnologia
Instituto Modelo
Concluído
CERTIFICAÇÕES
Especialização em Segurança – Escola Livre
\fIDIOMAS
Português — fluente
HABILIDADES
Análise, processos, engenharia`

test('preserva seis experiências e seções da segunda página em layouts variados', () => {
  const { data } = parseResumeText(varied)
  assert.equal(data.experiences.length, 6)
  assert.deepEqual(data.experiences.map(item => item.company), ['Empresa Prisma', 'Empresa Nuvem', 'Empresa Coral', 'Empresa Ponte', 'Empresa Brisa', 'Empresa Rio'])
  assert.equal(data.experiences[0].period, 'março de 2025 – atual')
  assert.equal(data.experiences[1].period, 'outubro de 2023 – março de 2025')
  assert.equal(data.experiences[2].period, 'janeiro de 2017 – dezembro de 2018')
  assert.equal(data.experiences[3].location, 'Recife, PE')
  assert.equal(data.experiences[4].period, '')
  assert.equal(data.experiences[4].description, '')
  assert.equal(data.education.length, 2)
  assert.equal(data.education[0].institution, 'Universidade Fictícia')
  assert.equal(data.education[1].description, 'Concluído')
  assert.match(data.certifications, /Especialização/)
  assert.match(data.languages, /Português/)
  assert.match(data.skills, /processos/)
})

test('normaliza fragmentos de PDF sem alterar texto DOCX ou juntar palavras comuns', () => {
  const pdf = normalizePdfText('Analisador es de process os em Jan eiro. Engenhar ia e Port uguês. cargo de equipe.')
  assert.match(pdf, /Analisadores de processos em Janeiro/)
  assert.match(pdf, /Engenharia e Português/)
  assert.match(pdf, /cargo de equipe/)
  assert.equal(parseResumeText('IDIOMAS\nPortuguês').data.languages, 'Português')
})

test('lê todas as páginas de PDF e preserva seções posteriores', async () => {
  const bytes = fixture('curriculo-ficticio-multipagina.pdf')
  const loading = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true })
  try {
    const pdf = await loading.promise
    assert.ok(pdf.numPages >= 2)
    let text = ''
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      text += normalizePdfText(pageTextFromItems(content.items.filter(item => 'str' in item))) + '\n'
    }
    const { data } = parseResumeText(text)
    assert.equal(data.experiences.length, 3)
    assert.equal(data.education.length, 2)
    assert.match(data.certifications, /Arquitetura de Software/)
    assert.match(data.languages, /Ingles/)
    assert.match(data.skills, /TypeScript/)
  } finally { await loading.destroy() }
})

test('junta somente anos fragmentados com contexto de data no PDF', () => {
  assert.equal(normalizePdfYears('202 5\n20 24\nmarço de 202 5 – atual\nPedido 20 24 unidades'), '2025\n2024\nmarço de 2025 – atual\nPedido 20 24 unidades')
})

test('reconstrói períodos de experiência divididos em duas ou três linhas', () => {
  const source = `EXPERIÊNCIAS PROFISSIONAIS
Analista – Empresa Fictícia
janeiro de 2017
dezembro de
2018
Técnico – Empresa Inventada
março de 202 5
– atual
Pesquisador – Empresa Modelo
2020 –
2022
Professor – Escola Imaginária
janeiro de 2012
dezembro de 2014`
  const data = parseResumeText(normalizePdfText(source)).data
  assert.deepEqual(data.experiences.map(item => item.period), ['janeiro de 2017 – dezembro de 2018', 'março de 2025 – atual', '2020 – 2022', 'janeiro de 2012 – dezembro de 2014'])
  assert.equal(data.experiences.length, 4)
})

test('mantém formações independentes com instituição e curso em ordens diferentes', () => {
  const source = `FORMAÇÃO ACADÊMICA
Universidade Inventada
Bacharelado em Matemática
2022 – 2024
Tecnologia em Redes
Instituto Fictício
2019 – 2021
Faculdade Modelo                    2016 – 2018
Licenciatura em Física
Especialização em Dados            2014 – 2015
Escola Hipotética
Instituto de Estudos
Curso Livre`
  const data = parseResumeText(source).data.education
  assert.equal(data.length, 5)
  assert.deepEqual(data.map(item => item.period), ['2022 – 2024', '2019 – 2021', '2016 – 2018', '2014 – 2015', ''])
  assert.deepEqual(data.map(item => item.institution), ['Universidade Inventada', 'Instituto Fictício', 'Faculdade Modelo', 'Escola Hipotética', 'Instituto de Estudos'])
  assert.deepEqual(data.map(item => item.course), ['Bacharelado em Matemática', 'Tecnologia em Redes', 'Licenciatura em Física', 'Especialização em Dados', 'Curso Livre'])
})

test('não transfere período ambíguo entre duas formações consecutivas', () => {
  const data = parseResumeText(`FORMAÇÃO ACADÊMICA
Universidade Fictícia
Curso Alfa
2018 – 2020
2021 – 2022
Instituto Exemplo
Curso Beta`).data.education
  assert.equal(data.length, 2)
  assert.equal(data[0].period, '')
  assert.equal(data[1].period, '')
})

test('remove apenas separadores redundantes de campos importados', () => {
  const data = parseResumeText(`EXPERIÊNCIAS PROFISSIONAIS
Técnico de Campo II , · Sorocaba/SP – Empresa Hipotética | 2020 – 2022
Atuação em campo, análise e suporte.`).data
  assert.equal(data.experiences[0].role, 'Técnico de Campo II')
  assert.equal(data.experiences[0].location, 'Sorocaba/SP')
  assert.match(data.experiences[0].description, /campo, análise e suporte/)
})
