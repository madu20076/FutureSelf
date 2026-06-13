import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size } = await params
  const dim = Math.min(Math.max(parseInt(size, 10) || 192, 16), 1024)
  const radius = Math.round(dim * 0.22)
  const fontSize = Math.round(dim * 0.44)

  return new ImageResponse(
    (
      <div
        style={{
          width: dim,
          height: dim,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #7c3aed 0%, #c026d3 100%)',
          borderRadius: radius,
        }}
      >
        <span
          style={{
            color: 'white',
            fontSize,
            fontWeight: 700,
            fontFamily: 'sans-serif',
            lineHeight: 1,
          }}
        >
          F
        </span>
      </div>
    ),
    { width: dim, height: dim }
  )
}
