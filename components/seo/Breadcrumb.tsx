import Link from 'next/link'

type BreadcrumbItem = {
  label: string
  href?: string
}

type BreadcrumbProps = {
  items: BreadcrumbItem[]
  className?: string
}

function normalizeLabel(value: string): string {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

export default function Breadcrumb({ items, className }: BreadcrumbProps) {
  const cleanItems = items.map((item) => ({
    label: normalizeLabel(item.label),
    href: item.href,
  }))

  if (cleanItems.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#666666]"
        itemScope
        itemType="https://schema.org/BreadcrumbList"
      >
        {cleanItems.map((item, index) => {
          const isLast = index === cleanItems.length - 1
          const showEllipsis = cleanItems.length > 3 && index === 1
          const isMobileHiddenMiddle = cleanItems.length > 3 && index > 0 && index < cleanItems.length - 1

          return (
            <li
              key={`${item.label}-${index}`}
              className={`flex items-center ${isMobileHiddenMiddle ? 'hidden sm:flex' : ''}`}
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              {isLast || !item.href ? (
                <span itemProp="name" aria-current={isLast ? 'page' : undefined} className="font-medium text-[#111827]">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} itemProp="item" className="hover:text-[#14213d]">
                  <span itemProp="name">{item.label}</span>
                </Link>
              )}
              <meta itemProp="position" content={String(index + 1)} />

              {!isLast ? <span className="mx-2 text-[#a3a3a3]">&gt;</span> : null}

              {showEllipsis ? (
                <span className="sm:hidden text-[#a3a3a3]" aria-hidden="true">
                  ...
                </span>
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
