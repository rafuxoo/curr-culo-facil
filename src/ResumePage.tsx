import Icon from './Icon'
import { resumeContacts, type Resume } from './resume'

export function ResumePage({ data }: { data: Resume }) {
  const contact = resumeContacts(data)
  const experiences = data.experiences.filter(item => Object.values(item).some(value => typeof value === 'string' && value.trim()))
  const education = data.education.filter(item => Object.values(item).some(value => typeof value === 'string' && value.trim()))
  const skills = data.skills.split(/[,\n]/).map(item => item.trim()).filter(Boolean)
  const hasContent = Boolean(data.name || data.role || contact.length || data.objective || experiences.length || education.length || skills.length || data.certifications || data.languages)

  if (!hasContent) return <div className="paper paper-empty"><div className="empty-mark"><Icon name="file" size={31}/></div><h3>Seu currículo começa aqui</h3><p>Preencha os campos ao lado para ver seu currículo ganhar forma em tempo real.</p><div className="empty-lines"><i/><i/><i/></div></div>

  return <article className="paper resume" aria-label="Pré-visualização do currículo">
    <header className="resume-header">
      <h1>{data.name || 'Seu nome completo'}</h1>
      {data.role && <p className="resume-role">{data.role}</p>}
      {contact.length > 0 && <p className="resume-contact">{contact.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</p>}
    </header>
    {data.objective.trim() && <section className="resume-section"><h2>Objetivo profissional</h2><p className="resume-text">{data.objective}</p></section>}
    {experiences.length > 0 && <section className="resume-section"><h2>Experiência profissional</h2>{experiences.map(item => <div className="resume-entry" key={item.id}><div className="entry-heading"><strong>{item.role || 'Cargo'}</strong>{item.period && <span>{item.period}</span>}</div>{(item.company || item.location) && <p className="entry-subtitle">{[item.company, item.location].filter(Boolean).join(' · ')}</p>}{item.description && <p className="resume-text">{item.description}</p>}</div>)}</section>}
    {education.length > 0 && <section className="resume-section"><h2>Formação acadêmica</h2>{education.map(item => <div className="resume-entry" key={item.id}><div className="entry-heading"><strong>{item.course || 'Curso'}</strong>{item.period && <span>{item.period}</span>}</div>{(item.institution || item.location) && <p className="entry-subtitle">{[item.institution, item.location].filter(Boolean).join(' · ')}</p>}{item.description && <p className="resume-text">{item.description}</p>}</div>)}</section>}
    {data.certifications.trim() && <section className="resume-section"><h2>Certificações</h2><p className="resume-text">{data.certifications}</p></section>}
    {data.languages.trim() && <section className="resume-section"><h2>Idiomas</h2><p className="resume-text">{data.languages}</p></section>}
    {skills.length > 0 && <section className="resume-section"><h2>{data.skillsHeading || 'Habilidades'}</h2><p className="resume-text">{skills.join('  ·  ')}</p></section>}
  </article>
}

