import type { Education, Experience, Resume } from '../resume'

type Section = 'header' | 'contact' | 'objective' | 'experiences' | 'education' | 'certifications' | 'languages' | 'skills' | 'other'
export type ImportedResume = { data: Resume; missing: string[]; warnings: string[]; lowConfidence: Record<string, string>; sourceText: string }

const sections: Record<string, Section> = {
  contato: 'contact', 'dados pessoais': 'contact',
  objetivo: 'objective', 'objetivo profissional': 'objective', resumo: 'objective', 'resumo profissional': 'objective', perfil: 'objective', 'perfil profissional': 'objective', 'sobre mim': 'objective',
  experiencia: 'experiences', experiencias: 'experiences', 'experiencia profissional': 'experiences', 'experiencias profissionais': 'experiences', 'historico profissional': 'experiences', 'trajetoria profissional': 'experiences', 'experiencia de trabalho': 'experiences',
  formacao: 'education', 'formacao academica': 'education', educacao: 'education', escolaridade: 'education', estudos: 'education', 'historico academico': 'education',
  certificacao: 'certifications', certificacoes: 'certifications', certificados: 'certifications', 'cursos e certificacoes': 'certifications', 'certificacoes e cursos': 'certifications', 'cursos complementares': 'certifications',
  idioma: 'languages', idiomas: 'languages', linguas: 'languages', 'idiomas e linguas': 'languages',
  habilidades: 'skills', competencias: 'skills', conhecimentos: 'skills', 'habilidades e competencias': 'skills',
  'habilidades tecnicas': 'skills', 'competencias tecnicas': 'skills', 'conhecimentos tecnicos': 'skills',
  projetos: 'other', voluntariado: 'other', referencias: 'other', publicacoes: 'other', premios: 'other',
}

const clean = (value: string) => value.normalize('NFKC').replace(/\u00a0/g, ' ').replace(/[\t ]+/g, ' ').trim()
const headingKey = (line: string) => clean(line).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/^\d+[.)]\s*/, '').replace(/^[•*-]\s*/, '').replace(/[:.\-–—\s]+$/g, '').trim()
const heading = (line: string): Section | undefined => sections[headingKey(line)]
const inlineHeading = (line: string): { section: Section; text: string; label: string } | undefined => {
  const match = line.match(/^([^:]{3,48}):\s*(.+)$/)
  const section = match && heading(match[1])
  return section ? { section, text: match![2], label: clean(match![1]) } : undefined
}
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const phonePattern = /(?:\+?55[\s().-]*)?(?:\(?\d{2}\)?[\s.-]*)?\d{4,5}[\s.-]*\d{4}\b/
const cityPattern = /\b([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' .-]{2,48})\s*[,/–-]\s*([A-Z]{2})\b/
const portfolioPattern = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[^\s|•·,;]+|https?:\/\/[^\s|•·,;]*portfolio[^\s|•·,;]*/i
const month = '(?:jan(?:eiro)?|fev(?:ereiro)?|mar(?:[cç]o)?|abr(?:il)?|mai(?:o)?|jun(?:ho)?|jul(?:ho)?|ago(?:sto)?|set(?:embro)?|out(?:ubro)?|nov(?:embro)?|dez(?:embro)?)\\.?'
const date = `(?:${month}(?:\\s+de)?\\s+|\\d{1,2}[/.])?(?:19|20)\\d{2}`
const range = new RegExp(`(?:${date})\\s*(?:[-–—]|\\ba\\b|\\baté\\b)\\s*(?:(?:${date})|atual|presente|hoje|em andamento)`, 'i')
const singleDate = new RegExp(`^(?:(?:per[ií]odo|in[ií]cio)\\s*:\\s*|desde\\s+)?(?:${date})$`, 'i')
const labels = ['Nome', 'Título profissional', 'Telefone', 'E-mail', 'Cidade', 'LinkedIn ou portfólio', 'Objetivo profissional', 'Experiências', 'Formação', 'Certificações', 'Idiomas', 'Habilidades']
const institutionPattern = /^(?:institui[cç][aã]o|universidade|faculdade|instituto|escola|centro universit[aá]rio)\b/i
const bareDate = new RegExp(`^${date}$`, 'i')
const namedMonthDate = new RegExp(`^${month}(?:\\s+de)?\\s+(?:19|20)\\d{2}$`, 'i')

function cleanEntrySeparators(value: string) {
  return clean(value.replace(/\s*,\s*(?:·|\|)\s*/g, ' · ').replace(/\s*(?:·|\|)\s*,\s*/g, ' · ').replace(/(?:\s*[·|]\s*){2,}/g, ' · ').replace(/(?:\s*,\s*){2,}/g, ', '))
}

function joinSplitPeriods(lines: string[]) {
  const result: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const first = lines[i]
    const next = lines[i + 1] ?? ''
    const third = lines[i + 2] ?? ''
    if (bareDate.test(first)) {
      const unfinishedMonth = new RegExp(`^${month}(?:\\s+de)?$`, 'i').test(next)
      if (unfinishedMonth && /^(?:19|20)\d{2}$/.test(third)) {
        result.push(`${first} – ${next} ${third}`)
        i += 2
        continue
      }
      if (namedMonthDate.test(first) && namedMonthDate.test(next) && Number(first.match(/(?:19|20)\d{2}$/)?.[0]) <= Number(next.match(/(?:19|20)\d{2}$/)?.[0])) {
        result.push(`${first} – ${next}`)
        i++
        continue
      }
      if (/^[-–—]$/.test(next) && bareDate.test(third)) {
        result.push(`${first} ${next} ${third}`)
        i += 2
        continue
      }
      if (/^[-–—]\s*/.test(next) && periodFrom(`${first} ${next}`)) {
        result.push(`${first} ${next}`)
        i++
        continue
      }
    }
    if (new RegExp(`^${date}\\s*[-–—]$`, 'i').test(first) && bareDate.test(next)) {
      result.push(`${first} ${next}`)
      i++
      continue
    }
    result.push(first)
  }
  return result
}

export function getMissingFields(data: Resume): string[] {
  const hasExperience = data.experiences.some(item => [item.role, item.company, item.period, item.location, item.description].some(value => value.trim()))
  const hasEducation = data.education.some(item => [item.course, item.institution, item.period, item.location, item.description].some(value => value.trim()))
  const present = [data.name, data.role, data.phone, data.email, data.city, data.linkedin, data.objective, hasExperience, hasEducation, data.certifications, data.languages, data.skills]
  return labels.filter((_, index) => !present[index])
}

export function periodFrom(line: string): string {
  return clean(line.match(range)?.[0] ?? line.match(singleDate)?.[0]?.replace(/^(?:per[ií]odo|in[ií]cio)\s*:\s*|^desde\s+/i, '') ?? '')
}

function withoutPeriod(line: string, period: string) {
  return clean(line.replace(period, '').replace(/(?:per[ií]odo|in[ií]cio)\s*:\s*/i, '').replace(/\s*[|•·-–—]\s*$/g, ''))
}

function isPeriodOnly(line: string, period: string) {
  return !withoutPeriod(line, period).replace(/[|•·:()\s-–—]/g, '')
}

function headerish(line: string) {
  return Boolean(line && line.length <= 110 && !/^[-•*]/.test(line) && !/[.!?]$/.test(line) && !/^(?:respons[aá]vel|atuei|atuação|desenvolvi|planejei|liderei|criei|implementei|resultados?|atividades?|principais atividades|organizei|documentei|acompanhei|realizei|participei|coordenei|gerenciei|elaborei)\b/i.test(line))
}

function isEntryDate(line: string) {
  const period = periodFrom(line)
  if (!period) return false
  return isPeriodOnly(line, period) || headerish(line) && (line.length < 90 || /[|•·—–]|\s-\s|^(?:cargo|empresa|curso|institui[cç][aã]o)\s*:/i.test(line))
}

function entryStarts(lines: string[], kind: 'experiences' | 'education'): number[] {
  const starts: number[] = []
  for (let i = 0; i < lines.length; i++) {
    const explicitPair = headerish(lines[i]) && /\s(?:[–—]|-|\|)\s/.test(lines[i]) && !/^(?:local|per[ií]odo)\s*:/i.test(lines[i])
    const labeledStart = /^(?:cargo|fun[cç][aã]o|empresa|curso|institui[cç][aã]o)\s*:/i.test(lines[i])
    const undatedEducation = kind === 'education' && headerish(lines[i]) && /^(?:universidade|faculdade|instituto|escola|centro universit[aá]rio)\b/i.test(lines[i + 1] ?? '') && /^(?:conclu[ií]do|em andamento|cursando|conclus[aã]o)\b/i.test(lines[i + 2] ?? '')
    if (explicitPair && !periodFrom(lines[i]) && i > 0 && headerish(lines[i - 1]) && i + 1 < lines.length && periodFrom(lines[i + 1]) && isPeriodOnly(lines[i + 1], periodFrom(lines[i + 1]))) continue
    if (!isEntryDate(lines[i]) && !explicitPair && !labeledStart && !undatedEducation) continue
    const period = periodFrom(lines[i])
    if (period && starts.length && starts[starts.length - 1] === i - 1 && !periodFrom(lines[i - 1])) continue
    let start = i
    if (period && isPeriodOnly(lines[i], period)) {
      let used = 0
      for (let j = i - 1; j >= 0 && used < 2; j--) {
        if (!headerish(lines[j]) || periodFrom(lines[j]) || !lines[j]) break
        if (starts.length && j <= starts[starts.length - 1]) break
        start = j
        used++
      }
    }
    if (starts.length && start <= starts[starts.length - 1]) continue
    if (starts.length && start === starts[starts.length - 1] + 1 && !period && !explicitPair && !undatedEducation) continue
    starts.push(start)
  }
  return starts
}

function educationStarts(lines: string[]): number[] {
  const starts: number[] = []
  const candidate = (line: string) => headerish(line) && !institutionPattern.test(line) && !/^(?:conclu[ií]do|cursando|em andamento)\b/i.test(line) && (!periodFrom(line) || !isPeriodOnly(line, periodFrom(line)))
  for (let i = 0; i < lines.length; i++) {
    if (!institutionPattern.test(lines[i])) continue
    const nextIsCourse = candidate(lines[i + 1] ?? '')
    const previousIsCourse = candidate(lines[i - 1] ?? '')
    let start = i
    if (!periodFrom(lines[i]) && !nextIsCourse && previousIsCourse) start = i - 1
    if (periodFrom(lines[i - 1] ?? '') && previousIsCourse && !nextIsCourse) start = i - 1
    if (!starts.length || start > starts[starts.length - 1]) starts.push(start)
  }
  return starts
}

function groupEntries(lines: string[], kind: 'experiences' | 'education'): { groups: string[][]; uncertain: boolean } {
  const educationAnchors = kind === 'education' ? educationStarts(lines) : []
  const inlineEducation = kind === 'education' && educationAnchors.length ? lines.flatMap((line, index) => periodFrom(line) && /\b(?:institui[cç][aã]o|universidade|faculdade|instituto|escola|centro universit[aá]rio)\b/i.test(line) && /\s[|–—-]\s/.test(line) ? [index] : []) : []
  const starts = educationAnchors.length ? [...new Set([...educationAnchors, ...inlineEducation])].sort((a, b) => a - b) : entryStarts(lines, kind)
  if (starts.length) {
    if (starts[0] > 0 && lines.slice(0, starts[0]).some(Boolean)) starts.unshift(0)
    const groups = starts.map((start, index) => lines.slice(start, starts[index + 1] ?? lines.length).filter(Boolean)).filter(group => group.length)
    return { groups, uncertain: false }
  }
  const groups: string[][] = []
  let current: string[] = []
  for (const line of lines) {
    if (!line) { if (current.length) { groups.push(current); current = [] } }
    else current.push(line)
  }
  if (current.length) groups.push(current)
  return { groups, uncertain: groups.length > 0 }
}

function labeled(lines: string[], labels: string) {
  const expression = new RegExp(`^(?:${labels})\\s*:\\s*(.+)$`, 'i')
  return lines.map(line => line.match(expression)?.[1] ?? '').find(Boolean) ?? ''
}

function parseEntry(group: string[], kind: 'experiences' | 'education', id: number) {
  const ambiguousEducationPeriod = kind === 'education' && group.filter(line => periodFrom(line)).length > 1
  const dateIndex = ambiguousEducationPeriod ? -1 : group.findIndex(line => periodFrom(line))
  const period = dateIndex < 0 ? '' : periodFrom(group[dateIndex])
  let headerEnd = Math.max(1, dateIndex + 1)
  if (dateIndex < 0 && group.length > 1 && headerish(group[1])) headerEnd = 2
  const headerLines = group.slice(0, headerEnd)
  let location = labeled(headerLines, 'local|localiza[cç][aã]o|cidade')
  if (!location) location = headerLines.map(line => line.match(cityPattern)?.[0] ?? '').find(Boolean) ?? ''
  if (!location && dateIndex >= 0) {
    const after = clean(group[dateIndex].slice(group[dateIndex].indexOf(period) + period.length).replace(/[()]/g, '').replace(/^[\s|•·,–—-]+|[\s|•·,–—-]+$/g, ''))
    if (after && !/^(?:cargo|empresa|curso|institui[cç][aã]o)\b/i.test(after)) location = after
  }
  const firstLabel = kind === 'experiences' ? 'cargo|fun[cç][aã]o|posi[cç][aã]o' : 'curso|forma[cç][aã]o|gradua[cç][aã]o'
  const secondLabel = kind === 'experiences' ? 'empresa|organiza[cç][aã]o' : 'institui[cç][aã]o|universidade|escola'
  let first = labeled(headerLines, firstLabel)
  let second = labeled(headerLines, secondLabel)
  const unlabeled = headerLines.filter(line => !new RegExp(`^(?:${firstLabel}|${secondLabel}|local|localiza[cç][aã]o|cidade|per[ií]odo|in[ií]cio)\\s*:`, 'i').test(line)).map(line => {
    let value = period ? withoutPeriod(line, period) : line
    if (location) value = clean(value.replace(location, '').replace(/\s*[|•·-–—]\s*$/g, ''))
    value = cleanEntrySeparators(value.replace(/[()]/g, '').replace(/^[|•·,–—-]+|[|•·,–—-]+$/g, ''))
    return value
  }).filter(Boolean).flatMap(line => line.split(/\s+(?:\||•|·|—|–|@)\s+|\s+-\s+/).map(clean).filter(Boolean))
  if (!first) first = cleanEntrySeparators(unlabeled.shift() ?? '')
  if (!second) second = cleanEntrySeparators(unlabeled.shift() ?? '')
  if (!second && headerEnd < group.length && headerish(group[headerEnd]) && !periodFrom(group[headerEnd])) {
    second = group[headerEnd]
    headerEnd++
  }
  const description = [...unlabeled, ...group.slice(headerEnd)].join('\n')
  const lowConfidence: Record<string, string> = {}
  const looksLikeCompany = (value: string) => /^(?:empresa|grupo|companhia|instituto|universidade|hospital|prefeitura)\b|\b(?:ltda\.?|s\.?a\.?|inc\.?|llc)\b/i.test(value)
  const looksLikeInstitution = (value: string) => institutionPattern.test(value)
  if (first && second && (kind === 'experiences' ? looksLikeCompany(first) && !looksLikeCompany(second) : looksLikeInstitution(first) && !looksLikeInstitution(second)) && !labeled(headerLines, firstLabel)) {
    ;[first, second] = [second, first]
    lowConfidence.first = 'A empresa parece vir antes do cargo no arquivo; confira a associação.'
    lowConfidence.second = lowConfidence.first
  }
  if (first && second && !labeled(headerLines, firstLabel) && !labeled(headerLines, secondLabel) && !/[|•·—–]|\s-\s/.test(headerLines.join(' '))) {
    lowConfidence.first = 'A ordem entre cargo/curso e empresa/instituição foi inferida pelas linhas; confira.'
    lowConfidence.second = lowConfidence.first
  }
  if (!period) lowConfidence.period = ambiguousEducationPeriod ? 'Há mais de um período possível nesta formação; confira o documento.' : 'Nenhum período foi reconhecido nesta entrada.'
  if (!first) lowConfidence.first = 'O título desta entrada não foi reconhecido.'
  if (!second) lowConfidence.second = 'A organização desta entrada não foi reconhecida.'
  if (kind === 'experiences') return { item: { id, role: first, company: second, period, location, description } satisfies Experience, lowConfidence }
  return { item: { id, course: first, institution: second, period, location, description } satisfies Education, lowConfidence }
}

function parseEntries(lines: string[], kind: 'experiences' | 'education') {
  const { groups, uncertain } = groupEntries(kind === 'experiences' ? joinSplitPeriods(lines) : lines, kind)
  const lowConfidence: Record<string, string> = {}
  const items = groups.slice(0, 50).map((group, index) => {
    const id = (kind === 'experiences' ? 1 : 1001) + index
    const parsed = parseEntry(group, kind, id)
    for (const [field, reason] of Object.entries(parsed.lowConfidence)) {
      const fieldName = field === 'first' ? kind === 'experiences' ? 'role' : 'course' : field === 'second' ? kind === 'experiences' ? 'company' : 'institution' : field
      lowConfidence[`${kind}.${id}.${fieldName}`] = reason
    }
    if (uncertain) lowConfidence[`${kind}.${id}.period`] = 'Sem datas que delimitem as entradas; confira a separação.'
    return parsed.item
  }).filter(item => kind === 'experiences' ? Boolean((item as Experience).role || (item as Experience).company) : Boolean((item as Education).course || (item as Education).institution))
  return { items, lowConfidence, truncated: groups.length > 50, uncertain }
}

export function parseResumeText(raw: string): ImportedResume {
  const lines = raw.replace(/\r\n?/g, '\n').replace(/\f/g, '\n\n').split('\n').map(clean)
  const parts: Record<Section, string[]> = { header: [], contact: [], objective: [], experiences: [], education: [], certifications: [], languages: [], skills: [], other: [] }
  let current: Section = 'header'
  let skillsHeading = ''
  for (const line of lines) {
    const next = heading(line)
    if (next) {
      current = next
      if (next === 'skills' && /(?:tecnicas|tecnicos)$/.test(headingKey(line))) skillsHeading = line.replace(/[:.\-–—\s]+$/g, '')
      continue
    }
    const inline = inlineHeading(line)
    if (inline) {
      current = inline.section
      if (current === 'skills' && /(?:tecnicas|tecnicos)$/.test(headingKey(inline.label))) skillsHeading = inline.label
      parts[current].push(inline.text)
      continue
    }
    parts[current].push(line)
  }
  const allLines = lines.filter(Boolean)
  const header = parts.header.filter(Boolean)
  const name = labeled(allLines, 'nome(?: completo)?') || header.find(line => !emailPattern.test(line) && !phonePattern.test(line) && !periodFrom(line) && !/^(?:curr[ií]culo|curriculum|resume)\b/i.test(line) && /^[A-Za-zÀ-ÿ' -]+$/.test(line) && line.split(/\s+/).length >= 2 && line.split(/\s+/).length <= 6) || ''
  const role = labeled(header, 't[ií]tulo profissional|cargo desejado') || header.find(line => line !== name && !emailPattern.test(line) && !phonePattern.test(line) && !cityPattern.test(line) && !portfolioPattern.test(line) && !/^(?:cidade|localiza[cç][aã]o|linkedin|portf[oó]lio)\s*:/i.test(line) && !heading(line) && line.length < 85) || ''
  const email = allLines.join(' ').match(emailPattern)?.[0] ?? ''
  const phone = (labeled(allLines, 'telefone|celular|fone|whatsapp') || allLines.find(line => phonePattern.test(line) && !periodFrom(line)) || '').match(phonePattern)?.[0] ?? ''
  const labeledCity = labeled(allLines, 'cidade|localiza[cç][aã]o')
  const city = labeledCity ? labeledCity.match(cityPattern)?.[0] || labeledCity.split(/\s*[|•·;]\s*/)[0] : [...header, ...parts.contact].map(line => line.match(cityPattern)?.[0] ?? '').find(Boolean) || ''
  const linkedin = allLines.map(line => line.match(portfolioPattern)?.[0] ?? '').find(Boolean) ?? ''
  const parsedExperiences = parseEntries(parts.experiences, 'experiences')
  const parsedEducation = parseEntries(parts.education, 'education')
  const data: Resume = {
    name, role, email, phone, city, linkedin,
    objective: parts.objective.filter(Boolean).join('\n'),
    experiences: parsedExperiences.items as Experience[],
    education: parsedEducation.items as Education[],
    certifications: parts.certifications.filter(Boolean).join('\n'),
    languages: parts.languages.filter(Boolean).join('\n'),
    skills: parts.skills.filter(Boolean).map(line => line.replace(/^[-•*]\s*/, '')).join(', ').replace(/\s*[,;]\s*/g, ', '),
    skillsHeading,
  }
  const missing = getMissingFields(data)
  const warnings: string[] = []
  if (allLines.length && missing.length >= 6) warnings.push('Poucos campos foram reconhecidos. Confira o arquivo e complete os dados manualmente.')
  if (parsedExperiences.truncated || parsedEducation.truncated) warnings.push('Há mais de 50 entradas em uma seção. Apenas as primeiras 50 foram incluídas; confira o arquivo original.')
  if (parsedExperiences.uncertain || parsedEducation.uncertain) warnings.push('Algumas entradas não têm datas claras; confira os limites entre elas.')
  if (parts.other.some(Boolean)) warnings.push('Há outras seções no arquivo que não foram aplicadas. Confira o documento original.')
  return { data, missing, warnings, lowConfidence: { ...parsedExperiences.lowConfidence, ...parsedEducation.lowConfidence }, sourceText: raw }
}
