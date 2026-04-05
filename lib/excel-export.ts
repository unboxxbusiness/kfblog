export type ExportPrimitive = string | number | boolean | null | undefined
export type ExportRow = Record<string, ExportPrimitive>

function escapeCsv(value: ExportPrimitive): string {
  const text = String(value ?? '')
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export default function exportRowsToCsv(rows: ExportRow[], filename = 'kampus-filter-export.csv') {
  if (typeof window === 'undefined') return
  if (!Array.isArray(rows) || rows.length === 0) return

  const headers = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((key) => set.add(key))
      return set
    }, new Set<string>())
  )

  const csv = [
    headers.map((header) => escapeCsv(header)).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(',')),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
