import { toSafeJsonLd } from '../../lib/safeJsonLd'

type SchemaInput = Record<string, any> | string | null | undefined

type SchemaMarkupProps = {
  schemas: SchemaInput[]
}

function normalizeSchema(input: SchemaInput): Record<string, any> | null {
  if (!input) return null

  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input)
      if (parsed && typeof parsed === 'object') return parsed
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[SchemaMarkup] Ignored non-object schema string')
      }
      return null
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[SchemaMarkup] Invalid JSON-LD string provided', error)
      }
      return null
    }
  }

  if (input && typeof input === 'object') return input
  return null
}

function dedupeSchemas(schemas: Record<string, any>[]): Record<string, any>[] {
  const seen = new Set<string>()
  const output: Record<string, any>[] = []

  for (const schema of schemas) {
    const typeValue = schema['@type']
    const type = Array.isArray(typeValue) ? String(typeValue[0] || '') : String(typeValue || '')
    const schemaId = typeof schema['@id'] === 'string' ? String(schema['@id']) : ''
    const dedupeKey = schemaId ? `${type}:${schemaId}` : JSON.stringify(schema)

    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    output.push(schema)
  }

  return output
}

export default function SchemaMarkup({ schemas }: SchemaMarkupProps) {
  const normalized = dedupeSchemas(
    schemas
      .map((input) => normalizeSchema(input))
      .filter((schema): schema is Record<string, any> => Boolean(schema))
  )

  if (normalized.length === 0) return null

  return (
    <>
      {normalized.map((schema, index) => {
        const typeValue = schema['@type']
        const type = Array.isArray(typeValue) ? String(typeValue[0] || 'schema') : String(typeValue || 'schema')
        return (
          <script
            key={`${type}-${index}`}
            id={`schema-${type.toLowerCase()}-${index}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: toSafeJsonLd(schema) }}
            suppressHydrationWarning
          />
        )
      })}
    </>
  )
}
