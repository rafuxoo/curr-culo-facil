import { useEffect, useRef, useState } from 'react'
import { addEducation, addExperience, clearResume, hasUserData, initialResume, readResume, removeEducation, removeExperience, saveResume, validateResume } from './resume'
import type { Education, Experience, Resume, ResumeErrors } from './resume'
import { extractFileText } from './import/extractFile'
import { ImportError } from './import/fileValidation'
import { parseResumeText } from './import/parseResume'
import type { ImportedResume } from './import/parseResume'
import ImportReview from './import/ImportReview'
import Icon from './Icon'
import { ResumePage } from './ResumePage'

function Field({ label, value, onChange, placeholder, type = 'text', error, id, required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; error?: string; id?: string; required?: boolean }) {
  return <label className="field"><span className="field-label">{label}{required && <span className="required"> *</span>}</span><input id={id} type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} autoComplete={type === 'email' ? 'email' : type === 'tel' ? 'tel' : 'off'} aria-invalid={Boolean(error)} aria-describedby={error && id ? `${id}-error` : undefined} required={required} />{error && <small className="field-error" id={`${id}-error`}>{error}</small>}</label>
}

function TextField({ label, value, onChange, placeholder, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number }) {
  return <label className="field"><span className="field-label">{label}</span><textarea value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} rows={rows} /></label>
}

function App() {
  const [data, setData] = useState<Resume>(() => {
    try { return readResume(window.localStorage) }
    catch { return initialResume }
  })
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
  const [message, setMessage] = useState('')
  const [storageError, setStorageError] = useState(false)
  const [errors, setErrors] = useState<ResumeErrors>({})
  const [importResult, setImportResult] = useState<ImportedResume | null>(null)
  const [importFileName, setImportFileName] = useState('')
  const [importError, setImportError] = useState('')
  const [importBusy, setImportBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(''), 6000)
    return () => window.clearTimeout(timer)
  }, [message])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        saveResume(window.localStorage, data)
        setStorageError(false)
      } catch { setStorageError(true) }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [data])

  const update = (field: keyof Resume, value: string) => {
    setData(current => ({ ...current, [field]: value }))
    if (field === 'name' || field === 'email') setErrors(current => ({ ...current, [field]: undefined }))
  }
  const updateExperience = (id: number, field: keyof Experience, value: string) => setData(current => ({ ...current, experiences: current.experiences.map(item => item.id === id ? { ...item, [field]: value } : item) }))
  const updateEducation = (id: number, field: keyof Education, value: string) => setData(current => ({ ...current, education: current.education.map(item => item.id === id ? { ...item, [field]: value } : item) }))
  const clearData = () => {
    if (!window.confirm('Apagar todos os dados deste currículo armazenados neste dispositivo?')) return
    try { clearResume(window.localStorage); setStorageError(false) }
    catch { setStorageError(true) }
    setData(initialResume)
    setErrors({})
    setActiveTab('edit')
    setMessage('Dados do currículo apagados deste dispositivo.')
  }
  const importFile = async (file?: File) => {
    if (!file) return
    setImportError('')
    setImportBusy(true)
    try {
      const extracted = await extractFileText(file)
      const result = parseResumeText(extracted)
      setImportResult(result)
      setImportFileName(file.name)
      setMessage('Revise os dados identificados antes de preencher o formulário.')
    } catch (error) {
      setImportError(error instanceof ImportError ? error.message : 'Não foi possível interpretar o arquivo. Tente outro PDF ou DOCX.')
    } finally {
      setImportBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }
  const applyImport = () => {
    if (!importResult) return
    if (hasUserData(data) && !window.confirm('Este currículo já tem dados salvos neste dispositivo. Substituir todos eles pelos dados revisados do arquivo?')) return
    setData(importResult.data)
    setErrors({})
    setImportResult(null)
    setImportFileName('')
    setActiveTab('edit')
    setMessage('Dados importados. Confira o formulário antes de exportar.')
  }
  const exportPdf = () => {
    const found = validateResume(data)
    setErrors(found)
    if (found.name || found.email) {
      setMessage('Revise os campos obrigatórios antes de exportar.')
      setActiveTab('edit')
      window.setTimeout(() => document.getElementById(found.name ? 'full-name' : 'email')?.focus(), 0)
      return
    }
    setMessage('Na janela de impressão, escolha “Salvar como PDF” e papel A4. Confira a prévia antes de salvar.')
    window.print()
  }

  return <div className="app-shell">
    <header className="site-header"><div className="brand"><span className="brand-symbol"><Icon name="file" size={19}/></span><span>currículo<span className="brand-accent">fácil</span><span className="brand-dot">.</span></span></div><div className="header-note"><Icon name="shield" size={16}/> Seus dados ficam neste dispositivo</div></header>
    <main>
      <div className="intro"><div><div className="eyebrow"><span className="eyebrow-dot"/> SIMPLES. GRATUITO. SEU.</div><h1>Seu próximo passo<br/><em>começa aqui.</em></h1><p>Crie um currículo profissional em poucos minutos. Preencha, visualize e salve em PDF — sem cadastro e sem complicação.</p></div><div className="intro-art" aria-hidden="true"><div className="art-card back"/><div className="art-card front"><div className="art-avatar"/><i/><i/><i/><div className="art-divider"/><i/><i/></div><span className="art-spark"><Icon name="spark" size={29}/></span></div></div>
      {!importResult && <div className="workspace-head"><div><span className="step-pill">01 / 02</span><h2>Monte seu currículo</h2><p>As alterações aparecem na prévia automaticamente.</p></div><div className="workspace-actions"><input ref={fileInputRef} type="file" tabIndex={-1} accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="visually-hidden" aria-label="Arquivo de currículo em PDF ou DOCX" onChange={event => void importFile(event.target.files?.[0])}/><button className="button button-secondary" type="button" disabled={importBusy} onClick={() => fileInputRef.current?.click()}><Icon name="file" size={17}/>{importBusy ? 'Lendo arquivo...' : 'Importar currículo'}</button><button className="button button-primary top-export" onClick={exportPdf}><Icon name="download" size={18}/> Exportar PDF</button></div></div>}
      {importBusy && <p className="import-progress" role="status">Lendo e identificando o currículo neste navegador…</p>}
      {importError && <p className="import-error" role="alert">{importError}</p>}
      {importResult ? <ImportReview result={importResult} fileName={importFileName} onChange={value => setImportResult(current => current ? { ...current, data: value } : current)} onCancel={() => { setImportResult(null); setImportFileName(''); setMessage('') }} onApply={applyImport}/> : <>
      <div className="mobile-tabs" role="tablist" aria-label="Visualização do currículo"><button role="tab" aria-selected={activeTab === 'edit'} className={activeTab === 'edit' ? 'selected' : ''} onClick={() => setActiveTab('edit')}>Preencher dados</button><button role="tab" aria-selected={activeTab === 'preview'} className={activeTab === 'preview' ? 'selected' : ''} onClick={() => setActiveTab('preview')}>Ver prévia</button></div>
      <div className="workspace"><div className={`editor ${activeTab !== 'edit' ? 'mobile-hidden' : ''}`}>
        <section className="form-section"><div className="section-heading"><span className="section-icon"><Icon name="user" size={20}/></span><div><h3>Dados pessoais</h3><p>Como podemos apresentar você?</p></div></div><div className="form-grid"><div className="full"><Field id="full-name" label="Nome completo" required value={data.name} error={errors.name} onChange={value => update('name', value)} placeholder="Ex.: Ana Carolina Silva"/></div><Field label="Título profissional" value={data.role} onChange={value => update('role', value)} placeholder="Ex.: Analista de Marketing"/><Field label="Cidade e estado" value={data.city} onChange={value => update('city', value)} placeholder="Ex.: São Paulo, SP"/><Field id="email" label="E-mail" type="email" required error={errors.email} value={data.email} onChange={value => update('email', value)} placeholder="seuemail@exemplo.com"/><Field label="Telefone" type="tel" value={data.phone} onChange={value => update('phone', value)} placeholder="(11) 99999-9999"/><div className="full"><Field label="LinkedIn ou portfólio" value={data.linkedin} onChange={value => update('linkedin', value)} placeholder="linkedin.com/in/seuperfil"/></div></div></section>
        <section className="form-section"><div className="section-heading"><span className="section-icon"><Icon name="target" size={20}/></span><div><h3>Objetivo profissional</h3><p>Conte em poucas palavras o que você busca.</p></div></div><TextField label="Seu resumo ou objetivo" value={data.objective} onChange={value => update('objective', value)} placeholder="Ex.: Profissional de atendimento com experiência em relacionamento com clientes, buscando contribuir com..."/></section>
        <section className="form-section"><div className="section-heading"><span className="section-icon"><Icon name="briefcase" size={20}/></span><div><h3>Experiência profissional</h3><p>Comece pela experiência mais recente.</p></div></div>{data.experiences.map((item, index) => <div className="repeat-card" key={item.id}><div className="repeat-title"><strong>Experiência {index + 1}</strong><button className="icon-button" aria-label={`Remover experiência ${index + 1}`} onClick={() => setData(current => removeExperience(current, item.id))}><Icon name="trash" size={17}/></button></div><div className="form-grid"><Field label="Cargo" value={item.role} onChange={value => updateExperience(item.id, 'role', value)} placeholder="Ex.: Assistente administrativo"/><Field label="Empresa" value={item.company} onChange={value => updateExperience(item.id, 'company', value)} placeholder="Ex.: Empresa ABC"/><Field label="Período" value={item.period} onChange={value => updateExperience(item.id, 'period', value)} placeholder="Ex.: Mar 2025 – Atual"/><Field label="Localização" value={item.location} onChange={value => updateExperience(item.id, 'location', value)} placeholder="Ex.: São Paulo, SP"/><div className="full"><TextField label="Principais atividades e resultados" value={item.description} onChange={value => updateExperience(item.id, 'description', value)} placeholder="Descreva suas responsabilidades e conquistas." rows={3}/></div></div></div>)}<button className="button button-add" onClick={() => setData(addExperience)}><Icon name="plus" size={18}/> Adicionar experiência</button></section>
        <section className="form-section"><div className="section-heading"><span className="section-icon"><Icon name="book" size={20}/></span><div><h3>Formação acadêmica</h3><p>Inclua seus estudos e qualificações.</p></div></div>{data.education.map((item, index) => <div className="repeat-card" key={item.id}><div className="repeat-title"><strong>Formação {index + 1}</strong><button className="icon-button" aria-label={`Remover formação ${index + 1}`} onClick={() => setData(current => removeEducation(current, item.id))}><Icon name="trash" size={17}/></button></div><div className="form-grid"><Field label="Curso ou formação" value={item.course} onChange={value => updateEducation(item.id, 'course', value)} placeholder="Ex.: Administração"/><Field label="Instituição" value={item.institution} onChange={value => updateEducation(item.id, 'institution', value)} placeholder="Ex.: Universidade XYZ"/><Field label="Período" value={item.period} onChange={value => updateEducation(item.id, 'period', value)} placeholder="Ex.: 2018 – 2022"/><Field label="Localização" value={item.location} onChange={value => updateEducation(item.id, 'location', value)} placeholder="Ex.: Campinas, SP"/><div className="full"><TextField label="Detalhes" value={item.description} onChange={value => updateEducation(item.id, 'description', value)} placeholder="Ex.: ênfase, projeto ou conclusão" rows={3}/></div></div></div>)}<button className="button button-add" onClick={() => setData(addEducation)}><Icon name="plus" size={18}/> Adicionar formação</button></section>
        <section className="form-section"><div className="section-heading"><span className="section-icon"><Icon name="check" size={20}/></span><div><h3>Certificações</h3><p>Cursos e certificados relevantes.</p></div></div><TextField label="Certificações e cursos" value={data.certifications} onChange={value => update('certifications', value)} placeholder="Ex.: Gestão de Projetos — Instituição, 2024" rows={3}/></section>
        <section className="form-section"><div className="section-heading"><span className="section-icon"><Icon name="book" size={20}/></span><div><h3>Idiomas</h3><p>Informe idiomas e níveis como constam no seu currículo.</p></div></div><TextField label="Idiomas" value={data.languages} onChange={value => update('languages', value)} placeholder="Ex.: Inglês — avançado" rows={3}/></section>
        <section className="form-section last-section"><div className="section-heading"><span className="section-icon"><Icon name="spark" size={20}/></span><div><h3>Habilidades</h3><p>Destaque o que você faz bem.</p></div></div><TextField label="Suas habilidades" value={data.skills} onChange={value => update('skills', value)} placeholder="Ex.: Excel, atendimento ao cliente, comunicação, gestão de projetos" rows={3}/><p className="field-help">Separe cada habilidade por vírgula ou linha.</p></section>
      </div><aside className={`preview-panel ${activeTab !== 'preview' ? 'mobile-hidden' : ''}`}><div className="preview-toolbar"><div><span className="live-dot"/> PRÉ-VISUALIZAÇÃO AO VIVO</div><span>Formato A4</span></div><div className="paper-frame"><ResumePage data={data}/></div><div className="preview-footer"><Icon name="check" size={16}/> Modelo profissional gratuito</div></aside></div>
      <div className="bottom-action"><div><strong>Pronto para dar o próximo passo?</strong><p>Revise os dados e salve seu currículo em PDF.</p></div><button className="button button-primary" onClick={exportPdf}><Icon name="download" size={18}/> Exportar meu currículo</button></div>
      <div className="privacy-controls"><p className="privacy-note"><Icon name="shield" size={16}/> Seus dados são salvos automaticamente neste dispositivo. Não são enviados a servidores. Em dispositivo compartilhado, apague-os após o uso.</p><button type="button" className="clear-button" onClick={clearData}><Icon name="trash" size={16}/> Limpar meus dados</button></div>{storageError && <p className="storage-error" role="alert">Não foi possível salvar neste dispositivo. Verifique o armazenamento do navegador.</p>}
      </>}
      {message && <p className="status-message" role="status">{message}</p>}
    </main>
    <footer className="site-footer"><span>currículo<span className="brand-accent">fácil</span>.</span><span>Feito para ajudar você a ir mais longe.</span></footer>
  </div>
}

export default App
