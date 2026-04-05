import * as React from "react"
import clsx from "clsx"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { label: string; value: string }[]
  placeholder?: string
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, ...props }, ref) => {
    return (
      <select
        className={clsx(
          "flex h-10 w-full items-center justify-between rounded-md border border-[#e5e5e5] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#29447e]/25 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt, i) => (
          <option key={i} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    )
  }
)
Select.displayName = "Select"

export { Select }
