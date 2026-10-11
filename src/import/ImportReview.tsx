import { useEffect, useRef, useState } from 'react'
import { addEducation, addExperience, moveEducation, moveExperience, removeEducation, removeExperience } from '../resume'
import type { Education, Experience, Resume } from '../resume'
import { getMissingFields } from './parseResume'
import type { ImportedResume } from './parseResume'

type Props = { result: ImportedResume; fileName: string; onChange: (data: Resume) => void; onCancel: () => void; onApply: () => void }

function ReviewField({ label, value, onChange, multiline = false, warning }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; warning?: string }) {
  const [edited, setEdited] = useState(false)
  const empty = !value.trim()
  const change = (next: string) => { setEdited(true); onChange(next) }
  return <label className={`field review-field ${empty ? 'review-missing' : ''}`}>
    <span className="field-label">{label}{empty && <span className="missing-tag">Não reconhecido</span>}{!empty && warning && !edited && <span className="confidence-tag" title={warning}>Conferir</span>}</span>
    {multiline ? <textarea value={value} onChange={event => change(event.target.value)} rows={3} placeholder="Não identificado no arquivo"/> : <input value={value} onChange={event => change(event.target.value)} placeholder="Não identificado no arquivo"/>}
  </label>
}

function EntryActions({ kind, index, count, onUp, onDown, onRemove }: { kind: string; index: number; count: number; onUp: () => void; onDown: () => void; onRemove: () => void }) {
  return <div className="entry-actions"><button type="button" className="icon-button" disabled={index === 0} aria-label={`Mover ${kind} ${index + 1} para cima`} onClick={onUp}>↑</button><button type="button" className="icon-button" disabled={index === count - 1} aria-label={`Mover ${kind} ${index + 1} para baixo`} onClick={onDown}>↓</button><button type="button" className="icon-button" aria-label={`Remover ${kind} ${index + 1}`} onClick={onRemove}>Remover</button></div>
}

export default function ImportReview({ result, fileName, onChange, onCancel, onApply }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => { headingRef.current?.focus() }, [])
  const data = result.data
  const missingCount = getMissingFields(data).length
  const change = (field: keyof Resume, value: string) => onChange({ ...data, [field]: value })
  const updateExperience = (id: number, field: keyof Experience, value: string) => onChange({ ...data, experiences: data.experiences.map(item => item.id === id ? { ...item, [field]: value } : item) })
  const updateEducation = (id: number, field: keyof Education, value: string) => onChange({ ...data, education: data.education.map(item => item.id === id ? { ...item, [field]: value } : item) })
  const warn = (section: string, id: number, field: string) => result.lowConfidence[`${section}.${id}.${field}`]

  return <section className="import-review" aria-labelledby="import-review-heading">
    <div className="review-head"><span className="step-pill">REVISÃO ANTES DE IMPORTAR</span><h2 id="import-review-heading" tabIndex={-1} ref={headingRef}>Confira os dados encontrados</h2><p>Arquivo: <strong>{fileName}</strong>. Corrija e reorganize os dados. Nada será aplicado ao formulário até você confirmar.</p></div>
    <div className="review-alert" role="status"><strong>{missingCount} campo{missingCount === 1 ? '' : 's'} não reconhecido{missingCount === 1 ? '' : 's'}.</strong> Campos vazios aparecem em destaque. A marca “Conferir” indica uma associação incerta entre linhas do documento.</div>
    {result.warnings.map(warning => <p className="review-warning" key={warning}>{warning}</p>)}
    <details className="review-source"><summary>Comparar com o texto extraído do arquivo</summary><p>A ordem pode mudar em documentos com colunas. Confira cada experiência, formação, certificação e idioma antes de aplicar.</p><pre>{result.sourceText}</pre></details>
    <div className="review-grid">
      <div className="review-card"><h3>Dados pessoais</h3><div className="form-grid"><ReviewField label="Nome" value={data.name} onChange={value => change('name', value)}/><ReviewField label="Título profissional" value={data.role} onChange={value => change('role', value)}/><ReviewField label="E-mail" value={data.email} onChange={value => change('email', value)}/><ReviewField label="Telefone" value={data.phone} onChange={value => change('phone', value)}/><ReviewField label="Cidade" value={data.city} onChange={value => change('city', value)}/><ReviewField label="LinkedIn ou portfólio" value={data.linkedin} onChange={value => change('linkedin', value)}/></div></div>
      <div className="review-card"><h3>Objetivo e habilidades</h3><ReviewField label="Resumo ou objetivo" value={data.objective} onChange={value => change('objective', value)} multiline/><h3 className="review-subheading">Habilidades</h3><ReviewField label="Habilidades separadas por vírgula" value={data.skills} onChange={value => change('skills', value)} multiline/></div>
      <div className="review-card"><h3>Experiências profissionais {data.experiences.length === 0 && <span className="missing-tag">Não reconhecidas</span>}</h3>{data.experiences.map((item, index) => <div className="review-entry" key={item.id}><div className="repeat-title"><strong>Experiência {index + 1}</strong>{(!item.role || !item.company || !item.period || !item.description) && <span className="missing-tag">Entrada incompleta</span>}<EntryActions kind="experiência" index={index} count={data.experiences.length} onUp={() => onChange(moveExperience(data, item.id, -1))} onDown={() => onChange(moveExperience(data, item.id, 1))} onRemove={() => onChange(removeExperience(data, item.id))}/></div><div className="form-grid"><ReviewField label="Cargo" value={item.role} warning={warn('experiences', item.id, 'role')} onChange={value => updateExperience(item.id, 'role', value)}/><ReviewField label="Empresa" value={item.company} warning={warn('experiences', item.id, 'company')} onChange={value => updateExperience(item.id, 'company', value)}/><ReviewField label="Período" value={item.period} warning={warn('experiences', item.id, 'period')} onChange={value => updateExperience(item.id, 'period', value)}/><ReviewField label="Localização" value={item.location} warning={warn('experiences', item.id, 'location')} onChange={value => updateExperience(item.id, 'location', value)}/><div className="full"><ReviewField label="Atividades e resultados" value={item.description} onChange={value => updateExperience(item.id, 'description', value)} multiline/></div></div></div>)}<button type="button" className="button button-add" onClick={() => onChange(addExperience(data))}>+ Adicionar experiência</button></div>
      <div className="review-card"><h3>Formação acadêmica {data.education.length === 0 && <span className="missing-tag">Não reconhecida</span>}</h3>{data.education.map((item, index) => <div className="review-entry" key={item.id}><div className="repeat-title"><strong>Formação {index + 1}</strong>{(!item.course || !item.institution || !item.period) && <span className="missing-tag">Entrada incompleta</span>}<EntryActions kind="formação" index={index} count={data.education.length} onUp={() => onChange(moveEducation(data, item.id, -1))} onDown={() => onChange(moveEducation(data, item.id, 1))} onRemove={() => onChange(removeEducation(data, item.id))}/></div><div className="form-grid"><ReviewField label="Curso" value={item.course} warning={warn('education', item.id, 'course')} onChange={value => updateEducation(item.id, 'course', value)}/><ReviewField label="Instituição" value={item.institution} warning={warn('education', item.id, 'institution')} onChange={value => updateEducation(item.id, 'institution', value)}/><ReviewField label="Período" value={item.period} warning={warn('education', item.id, 'period')} onChange={value => updateEducation(item.id, 'period', value)}/><ReviewField label="Localização" value={item.location} onChange={value => updateEducation(item.id, 'location', value)}/><div className="full"><ReviewField label="Detalhes" value={item.description} onChange={value => updateEducation(item.id, 'description', value)} multiline/></div></div></div>)}<button type="button" className="button button-add" onClick={() => onChange(addEducation(data))}>+ Adicionar formação</button></div>
      <div className="review-card"><h3>Certificações</h3><ReviewField label="Cursos e certificados" value={data.certifications} onChange={value => change('certifications', value)} multiline/></div>
      <div className="review-card"><h3>Idiomas</h3><ReviewField label="Idiomas e níveis" value={data.languages} onChange={value => change('languages', value)} multiline/></div>
    </div>
    <div className="review-actions"><button type="button" className="button button-secondary" onClick={onCancel}>Voltar sem importar</button><button type="button" className="button button-primary" onClick={onApply}>Usar estes dados</button></div>
  </section>
}
