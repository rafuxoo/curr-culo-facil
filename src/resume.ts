export type Experience = { id: number; role: string; company: string; period: string; location: string; description: string }
export type Education = { id: number; course: string; institution: string; period: string; location: string; description: string }
export type Resume = {
  name: string; role: string; email: string; phone: string; city: string; linkedin: string
  objective: string; skills: string; certifications: string; languages: string; experiences: Experience[]; education: Education[]
}

export const STORAGE_KEY = 'curriculo-facil:resume:v1'

export const initialResume: Resume = {
  name: '', role: '', email: '', phone: '', city: '', linkedin: '', objective: '', skills: '', certifications: '', languages: '',
  experiences: [{ id: 1, role: '', company: '', period: '', location: '', description: '' }],
  education: [{ id: 2, course: '', institution: '', period: '', location: '', description: '' }],
}

const text = (value: unknown) => typeof value === 'string' ? value : ''
const validId = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0

export function parseSavedResume(raw: string | null): Resume | null {
  if (!raw) return null
  try {
    const saved: unknown = JSON.parse(raw)
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return null
    const source = saved as Record<string, unknown>
    if (!Array.isArray(source.experiences) || !Array.isArray(source.education)) return null
    const experiences = source.experiences.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item) && validId((item as Record<string, unknown>).id)).map(item => ({ id: item.id as number, role: text(item.role), company: text(item.company), period: text(item.period), location: text(item.location), description: text(item.description) }))
    const education = source.education.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item) && validId((item as Record<string, unknown>).id)).map(item => ({ id: item.id as number, course: text(item.course), institution: text(item.institution), period: text(item.period), location: text(item.location), description: text(item.description) }))
    return { name: text(source.name), role: text(source.role), email: text(source.email), phone: text(source.phone), city: text(source.city), linkedin: text(source.linkedin), objective: text(source.objective), skills: text(source.skills), certifications: text(source.certifications), languages: text(source.languages), experiences, education }
  } catch { return null }
}

export function readResume(storage: Pick<Storage, 'getItem'>): Resume {
  return parseSavedResume(storage.getItem(STORAGE_KEY)) ?? initialResume
}

export function saveResume(storage: Pick<Storage, 'setItem' | 'removeItem'>, data: Resume): void {
  if (hasUserData(data)) storage.setItem(STORAGE_KEY, JSON.stringify(data))
  else storage.removeItem(STORAGE_KEY)
}

export function clearResume(storage: Pick<Storage, 'removeItem' | 'getItem'>): void {
  storage.removeItem(STORAGE_KEY)
  if (storage.getItem(STORAGE_KEY) !== null) throw new Error('Os dados continuam no armazenamento do navegador.')
}

export function hasUserData(data: Resume): boolean {
  return Boolean([data.name, data.role, data.email, data.phone, data.city, data.linkedin, data.objective, data.skills, data.certifications, data.languages].some(value => value.trim()) || data.experiences.some(item => [item.role, item.company, item.period, item.location, item.description].some(value => value.trim())) || data.education.some(item => [item.course, item.institution, item.period, item.location, item.description].some(value => value.trim())))
}

export function nextEntryId(data: Resume): number {
  return Math.max(2, ...data.experiences.map(item => item.id), ...data.education.map(item => item.id)) + 1
}

export function addExperience(data: Resume): Resume {
  return { ...data, experiences: [...data.experiences, { id: nextEntryId(data), role: '', company: '', period: '', location: '', description: '' }] }
}

export function addEducation(data: Resume): Resume {
  return { ...data, education: [...data.education, { id: nextEntryId(data), course: '', institution: '', period: '', location: '', description: '' }] }
}

export function removeExperience(data: Resume, id: number): Resume {
  return { ...data, experiences: data.experiences.filter(item => item.id !== id) }
}

export function removeEducation(data: Resume, id: number): Resume {
  return { ...data, education: data.education.filter(item => item.id !== id) }
}

function moveItem<T extends { id: number }>(items: T[], id: number, direction: -1 | 1): T[] {
  const index = items.findIndex(item => item.id === id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= items.length) return items
  const moved = [...items]
  ;[moved[index], moved[target]] = [moved[target], moved[index]]
  return moved
}

export function moveExperience(data: Resume, id: number, direction: -1 | 1): Resume {
  return { ...data, experiences: moveItem(data.experiences, id, direction) }
}

export function moveEducation(data: Resume, id: number, direction: -1 | 1): Resume {
  return { ...data, education: moveItem(data.education, id, direction) }
}

export type ResumeErrors = { name?: string; email?: string }

export function validateResume(data: Resume): ResumeErrors {
  const errors: ResumeErrors = {}
  if (!data.name.trim()) errors.name = 'Informe seu nome completo.'
  const email = data.email.trim()
  if (!email) errors.email = 'Informe seu e-mail.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Informe um e-mail válido.'
  return errors
}
