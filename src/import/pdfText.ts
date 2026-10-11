export type PositionedText = { str: string; transform: number[] }

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
