export const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_TEXT_LENGTH = 200_000

export class ImportError extends Error {
  constructor(message: string) { super(message); this.name = 'ImportError' }
}

export function validateDocxArchive(buffer: ArrayBuffer) {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  let end = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { end = i; break }
  }
  if (end < 0) throw new ImportError('Este DOCX está inválido ou incompleto.')
  const count = view.getUint16(end + 10, true)
  const offset = view.getUint32(end + 16, true)
  if (count > 500 || count === 0xffff || offset === 0xffffffff) throw new ImportError('Este DOCX é grande ou complexo demais para importar com segurança.')
  let position = offset
  let expanded = 0
  let hasDocument = false
  let hasContentTypes = false
  const decoder = new TextDecoder()
  for (let i = 0; i < count; i++) {
    if (position + 46 > bytes.length || view.getUint32(position, true) !== 0x02014b50) throw new ImportError('Este DOCX está inválido ou incompleto.')
    const flags = view.getUint16(position + 8, true)
    const uncompressed = view.getUint32(position + 24, true)
    const nameLength = view.getUint16(position + 28, true)
    const extraLength = view.getUint16(position + 30, true)
    const commentLength = view.getUint16(position + 32, true)
    const endOfEntry = position + 46 + nameLength + extraLength + commentLength
    if (endOfEntry > bytes.length || flags & 1 || uncompressed === 0xffffffff) throw new ImportError('Este DOCX não pode ser interpretado com segurança.')
    expanded += uncompressed
    if (expanded > 25 * 1024 * 1024 || uncompressed > 15 * 1024 * 1024) throw new ImportError('Este DOCX expande para um tamanho grande demais.')
    const name = decoder.decode(bytes.subarray(position + 46, position + 46 + nameLength))
    if (name === 'word/document.xml') hasDocument = true
    if (name === '[Content_Types].xml') hasContentTypes = true
    position = endOfEntry
  }
  if (!hasDocument || !hasContentTypes) throw new ImportError('O arquivo não é um DOCX válido.')
}

export function validateFile(file: Pick<File, 'name' | 'size'>, firstBytes: Uint8Array): 'pdf' | 'docx' {
  if (file.size === 0) throw new ImportError('O arquivo está vazio.')
  if (file.size > MAX_FILE_SIZE) throw new ImportError('O arquivo deve ter no máximo 5 MB.')
  const extension = file.name.toLowerCase().match(/\.(pdf|docx)$/)?.[1] as 'pdf' | 'docx' | undefined
  if (!extension) throw new ImportError('Selecione um arquivo PDF ou DOCX.')
  const pdf = new TextDecoder().decode(firstBytes.subarray(0, 5)) === '%PDF-'
  const zip = firstBytes[0] === 0x50 && firstBytes[1] === 0x4b && [0x03, 0x05, 0x07].includes(firstBytes[2])
  if (extension === 'pdf' && !pdf || extension === 'docx' && !zip) throw new ImportError('A extensão do arquivo não corresponde ao seu conteúdo.')
  return extension
}

export function normalizeDocxText(text: string) {
  return text.replace(/\n{4,}/g, '\u0000').replace(/\n{2}/g, '\n').replace(/\u0000/g, '\n\n')
}

export function ensureUsableText(text: string, kind: 'pdf' | 'docx'): string {
  if (text.length > MAX_TEXT_LENGTH) throw new ImportError('O texto do documento é longo demais para importar com segurança.')
  if (text.replace(/\s/g, '').length < 20) throw new ImportError(kind === 'pdf' ? 'Este PDF não contém texto selecionável suficiente. Se for digitalizado, será necessário OCR, que ainda não está disponível.' : 'Este DOCX não contém texto suficiente para identificar um currículo.')
  return text
}

