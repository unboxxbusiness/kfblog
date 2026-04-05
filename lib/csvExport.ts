type CsvRow = Record<string, unknown>

type DownloadCsvOptions = {
  rows: CsvRow[]
  headers: string[]
  filename: string
}

function sanitizeCsvValue(value: unknown): string {
  const text = String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  const startsWithFormulaChar = /^[=+\-@\t]/.test(text)
  const protectedText = startsWithFormulaChar ? `'${text}` : text

  return `"${protectedText.replace(/"/g, '""')}"`
}

export function toCsvString(rows: CsvRow[], headers: string[]): string {
  const lines = [headers.map((header) => sanitizeCsvValue(header)).join(',')]

  for (const row of rows) {
    const values = headers.map((header) => sanitizeCsvValue(row[header]))
    lines.push(values.join(','))
  }

  return lines.join('\r\n')
}

export function downloadCsv({ rows, headers, filename }: DownloadCsvOptions) {
  if (typeof window === 'undefined') return

  const csv = toCsvString(rows, headers)
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  URL.revokeObjectURL(url)
}
