import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const resolved = await params
  const slug = decodeURIComponent(String(resolved?.slug || 'kampus-filter')).replace(/[-_]+/g, ' ')
  const title = `Kampus Filter • ${slug}`.trim()
  const currentYear = new Date().getFullYear()

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#14213d',
          color: '#ffffff',
          padding: '60px',
          fontFamily: 'Arial',
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 1, color: '#fca311', fontWeight: 700 }}>Kampus Filter</div>
        <div style={{ fontSize: 56, lineHeight: 1.18, fontWeight: 700, maxWidth: 1000 }}>{title}</div>
        <div style={{ fontSize: 28, opacity: 0.9 }}>{`Find your dream college in India ${currentYear}`}</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
