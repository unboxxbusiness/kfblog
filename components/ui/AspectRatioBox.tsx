import clsx from 'clsx'

type RatioValue = '16/9' | '4/3' | '1/1' | number

type AspectRatioBoxProps = {
  ratio?: RatioValue
  minHeight?: number
  className?: string
  children?: React.ReactNode
}

function toAspectRatio(value: RatioValue): string {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return String(value)
  }

  if (value === '4/3') return '4 / 3'
  if (value === '1/1') return '1 / 1'
  return '16 / 9'
}

export default function AspectRatioBox({
  ratio = '16/9',
  minHeight,
  className,
  children,
}: AspectRatioBoxProps) {
  return (
    <div
      className={clsx('relative w-full overflow-hidden', className)}
      style={{
        aspectRatio: toAspectRatio(ratio),
        minHeight: typeof minHeight === 'number' ? `${minHeight}px` : undefined,
      }}
    >
      {children}
    </div>
  )
}
