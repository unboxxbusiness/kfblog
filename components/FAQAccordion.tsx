import React from 'react'

export default function FAQAccordion({ faqs }: { faqs?: Array<{ question: string; answer: string }> }) {
  if (!faqs || faqs.length === 0) return null
  return (
    <div className="space-y-2">
      {faqs.map((f, i) => (
        <details key={i} className="group rounded-md border bg-white p-3">
          <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-[#000000]">
            {f.question}
            <span className="ml-4 text-[#666666] group-open:rotate-180">▾</span>
          </summary>
          <div className="mt-2 text-sm text-[#333333]">{f.answer}</div>
        </details>
      ))}
    </div>
  )
}
