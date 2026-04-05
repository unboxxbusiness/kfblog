import React from 'react'

export default function ComparisonTable({ table }: { table?: { headers?: string[]; rows?: Array<Record<string, string | number | null>> } }) {
  if (!table || (!table.headers && !table.rows)) return null
  const headers = table.headers || Object.keys(table.rows?.[0] || {})
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto text-left">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="border-b px-4 py-2 text-sm font-medium text-[#333333]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows?.map((row, r) => (
            <tr key={r} className={r % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}>
              {headers.map((h, i) => (
                <td key={i} className="border-b px-4 py-3 text-sm text-[#333333]">{String(row[h] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
