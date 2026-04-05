import Image from 'next/image'
import clsx from 'clsx'
import AspectRatioBox from './AspectRatioBox'

type RatioValue = '16/9' | '4/3' | '1/1' | number

type CollegeImageProps = {
  name: string
  src?: string | null
  alt?: string
  ratio?: RatioValue
  sizes?: string
  className?: string
  imageClassName?: string
  priority?: boolean
  fetchPriority?: 'high' | 'low' | 'auto'
}

function normalizeText(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

function buildBlurDataUrl(seed: string): string {
  const hash = hashString(seed)
  const hueA = hash % 360
  const hueB = (hash * 7) % 360
  const hueC = (hash * 13) % 360

  const svg = `<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\"><defs><linearGradient id=\"g\" x1=\"0\" x2=\"1\" y1=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"hsl(${hueA},70%,62%)\"/><stop offset=\"55%\" stop-color=\"hsl(${hueB},72%,55%)\"/><stop offset=\"100%\" stop-color=\"hsl(${hueC},70%,48%)\"/></linearGradient></defs><rect width=\"64\" height=\"64\" fill=\"url(#g)\"/></svg>`

  const base64 =
    typeof window === 'undefined'
      ? Buffer.from(svg).toString('base64')
      : window.btoa(svg)

  return `data:image/svg+xml;base64,${base64}`
}

function getInitials(value: string): string {
  const words = normalizeText(value).split(' ').filter(Boolean)
  if (words.length === 0) return 'KF'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

function ratioDimensions(ratio: RatioValue): { width: number; height: number } {
  if (ratio === '4/3') return { width: 1200, height: 900 }
  if (ratio === '1/1') return { width: 1200, height: 1200 }
  if (typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0) {
    return { width: 1200, height: Math.max(300, Math.round(1200 / ratio)) }
  }
  return { width: 1200, height: 675 }
}

export default function CollegeImage({
  name,
  src,
  alt,
  ratio = '16/9',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  className,
  imageClassName,
  priority = false,
  fetchPriority,
}: CollegeImageProps) {
  const safeName = normalizeText(name) || 'Kampus Filter College'
  const safeAlt = normalizeText(alt) || `${safeName} college image`
  const imageSrc = normalizeText(src)
  const blurDataUrl = buildBlurDataUrl(safeName)
  const dimensions = ratioDimensions(ratio)

  return (
    <AspectRatioBox ratio={ratio} className={clsx('rounded-xl border border-[#e5e5e5] bg-[#f5f7fb]', className)}>
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={safeAlt}
          width={dimensions.width}
          height={dimensions.height}
          sizes={sizes}
          priority={priority}
          fetchPriority={fetchPriority}
          placeholder="blur"
          blurDataURL={blurDataUrl}
          className={clsx('h-full w-full object-cover', imageClassName)}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#dbeafe] via-[#c7d2fe] to-[#fde68a] text-2xl font-extrabold text-[#14213d]"
          aria-label={safeAlt}
        >
          {getInitials(safeName)}
        </div>
      )}
    </AspectRatioBox>
  )
}
