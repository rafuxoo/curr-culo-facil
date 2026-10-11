import assert from 'node:assert/strict'
import test from 'node:test'
import { addEducation, addExperience, clearResume, initialResume, parseSavedResume, readResume, removeEducation, removeExperience, saveResume, STORAGE_KEY, validateResume } from '../src/resume.ts'

function memoryStorage() {
  const items = new Map()
  return {
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: key => items.delete(key),
  }
}

test('salva, recupera e limpa dados apenas no armazenamento fornecido', () => {
  const storage = memoryStorage()
  const data = { ...initialResume, name: 'Ana Silva', email: 'ana@exemplo.com' }
  saveResume(storage, data)
  assert.equal(readResume(storage).name, 'Ana Silva')
  assert.ok(storage.getItem(STORAGE_KEY))
  clearResume(storage)
  assert.equal(storage.getItem(STORAGE_KEY), null)
  assert.equal(readResume(storage).name, '')
})

test('ignora conteúdo corrompido ou de formato inesperado', () => {
  assert.equal(parseSavedResume('{'), null)
  assert.equal(parseSavedResume('{"experiences":{},"education":[]}'), null)
  assert.equal(parseSavedResume('{"experiences":[null],"education":[]}')?.experiences.length, 0)
})

test('adiciona e remove experiências e formações sem repetir identificadores', () => {
  let data = addExperience(initialResume)
  data = addEducation(data)
  assert.equal(data.experiences.length, 2)
  assert.equal(data.education.length, 2)
  assert.equal(new Set([...data.experiences, ...data.education].map(item => item.id)).size, 4)
  data = removeExperience(data, 1)
  data = removeEducation(data, 2)
  assert.deepEqual(data.experiences.map(item => item.id), [3])
  assert.deepEqual(data.education.map(item => item.id), [4])
  const restored = parseSavedResume(JSON.stringify(data))
  assert.equal(addExperience(restored).experiences.at(-1).id, 5)
})

test('exige nome e e-mail válido antes da exportação', () => {
  assert.deepEqual(validateResume(initialResume), { name: 'Informe seu nome completo.', email: 'Informe seu e-mail.' })
  assert.equal(validateResume({ ...initialResume, name: 'Ana', email: 'ana@' }).email, 'Informe um e-mail válido.')
  assert.deepEqual(validateResume({ ...initialResume, name: 'Ana', email: 'ana@exemplo.com' }), {})
})
