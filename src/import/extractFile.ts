import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { normalizePdfText, pageTextFromItems } from './pdfText'

import { ensureUsableText, ImportError, MAX_FILE_SIZE, normalizeDocxText, validateDocxArchive, validateFile } from './fileValidation'

const MAX_TEXT_LENGTH = 200_000
const MAX_PDF_PAGES = 50

export async function extractFileText(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE) throw new ImportError('O arquivo deve ter no máximo 5 MB.')
  const buffer = await file.arrayBuffer()
  const kind = validateFile(file, new Uint8Array(buffer, 0, Math.min(8, buffer.byteLength)))
  let text = ''
  if (kind === 'docx') {
    validateDocxArchive(buffer)
    try {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ arrayBuffer: buffer })
      text = normalizeDocxText(result.value)
    } catch { throw new ImportError('Não foi possível ler este DOCX. Confira se o arquivo está íntegro e sem senha.') }
  } else {
    try {
      const pdfjs = await import('pdfjs-dist')
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
      const loading = pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: false })
      const pdf = await loading.promise
      try {
        if (pdf.numPages > MAX_PDF_PAGES) throw new ImportError('O PDF tem mais de 50 páginas e não pode ser importado nesta etapa.')
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber)
          const content = await page.getTextContent()
          const items = content.items.filter(item => 'str' in item && 'transform' in item)
          text += normalizePdfText(pageTextFromItems(items))
          if (text.length > MAX_TEXT_LENGTH) throw new ImportError('O texto do PDF é longo demais para importar com segurança.')
          text += '\n'
          page.cleanup()
        }
      } finally { await loading.destroy() }
    } catch (error) {
      if (error instanceof ImportError) throw error
      throw new ImportError('Não foi possível ler este PDF. Confira se o arquivo está íntegro e sem senha.')
    }
  }
  return ensureUsableText(text, kind)
}

