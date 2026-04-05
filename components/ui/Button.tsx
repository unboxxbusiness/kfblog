import React from 'react'
import clsx from 'clsx'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'secondary'
}

export default function Button({ variant = 'primary', className = '', ...props }: Props) {
  return (
    <button
      {...props}
      className={clsx(
        'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium shadow-sm focus:outline-none',
        variant === 'primary' && 'bg-[#fca311] text-white hover:bg-[#d68502]',
        variant === 'secondary' && 'border border-[#14213d] bg-white text-[#14213d] hover:bg-[#f5f7fb]',
        variant === 'ghost' && 'bg-transparent text-[#14213d] hover:text-[#29447e]',
        className
      )}
    />
  )
}
