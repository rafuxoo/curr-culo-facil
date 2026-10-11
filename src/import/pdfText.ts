export type PositionedText = { str: string; transform: number[] }

export function normalizePdfYears(text: string): string {
  return text.split('\n').map(line => {
    const hasDateContext = /\b(?:jan(?:eiro)?|fev(?:ereiro)?|mar(?:[cç]o)?|abr(?:il)?|mai(?:o)?|jun(?:ho)?|jul(?:ho)?|ago(?:sto)?|set(?:embro)?|out(?:ubro)?|nov(?:embro)?|dez(?:embro)?|atual)\b|\d\s*[-–—]\s*\d|^\s*(?:19|20)\d?\s+\d{1,2}\s*$/i.test(line)
    if (!hasDateContext) return line
    return line.replace(/(?<!\d)(?:19|20)\d\s+\d(?!\d)|(?<!\d)(?:19|20)\s+\d{2}(?!\d)/g, value => value.replace(/\s+/g, ''))
  }).join('\n')
}

// Join only fragments supported by the document itself or by a narrow
// morphological signal. Ambiguous spaces remain available for manual review.
export function normalizePdfText(text: string): string {
  text = normalizePdfYears(text)
  const words = new Set((text.match(/\p{L}{4,}/gu) ?? []).map(word => word.toLocaleLowerCase('pt-BR')))
  return text.replace(/\b(\p{L}{3,}) ([\p{Ll}]{1,6})\b/gu, (match, left: string, right: string) => {
    const joined = (left + right).toLocaleLowerCase('pt-BR')
    const supported = words.has(joined)
    const suffix = /^(?:eiro|eira|eiros|eiras|mente|ções|ção|sões|são|idade|idades)$/.test(right)
      || right === 'ia' && /(?:nhar|log|graf)$/i.test(left)
      || right === 'uguês' && left.length >= 4
    const shortFragment = right === 's' && /(?:ore|ade|ente|mento)$/i.test(left)
      || /^(?:os|es)$/.test(right) && /(?:ss|dor)$/i.test(left)
    return supported || suffix || shortFragment ? left + right : match
  })
}

export function pageTextFromItems(items: PositionedText[]): string {
  const lines = new Map<number, { x: number; value: string }[]>()
  for (const item of items) {
    const y = Math.round(item.transform[5] / 3) * 3
    const line = lines.get(y) ?? []
    line.push({ x: item.transform[4], value: item.str })
    lines.set(y, line)
  }
  const sortedY = [...lines.keys()].sort((a, b) => b - a)
  let previousY: number | undefined
  let text = ''
  for (const y of sortedY) {
    if (previousY !== undefined && previousY - y > 24) text += '\n'
    text += lines.get(y)!.sort((a, b) => a.x - b.x).map(item => item.value).join(' ').replace(/\s+/g, ' ').trim() + '\n'
    previousY = y
  }
  return text
}
