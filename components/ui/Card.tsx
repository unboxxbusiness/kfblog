import clsx from 'clsx'

export default function Card({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <div className={clsx('rounded-lg border border-[#e5e5e5] bg-white p-4 shadow-sm', className)}>{children}</div>
}
