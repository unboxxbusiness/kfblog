import * as React from "react"
import clsx from "clsx"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={clsx(
          "flex h-10 w-full rounded-md border border-[#e5e5e5] bg-transparent px-3 py-2 text-sm placeholder:text-[#666666] focus:outline-none focus:ring-2 focus:ring-[#29447e]/25 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
