'use client'

import * as React from 'react'
import exportRowsToCsv, { type ExportRow } from '../lib/excel-export'

type ExcelExporterProps = {
  rows: ExportRow[]
  filename?: string
  label?: string
  className?: string
}

export default function ExcelExporter({ rows, filename, label = 'Export CSV', className }: ExcelExporterProps) {
  return (
    <button
      type="button"
      onClick={() => exportRowsToCsv(rows, filename)}
      className={className || 'rounded-md bg-[#14213d] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0f1a30]'}
    >
      {label}
    </button>
  )
}
