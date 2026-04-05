'use client'

import * as React from 'react'
import { Radar, Sparkles } from 'lucide-react'
import Badge from './ui/Badge'

type NetworkNode = {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  group: 0 | 1 | 2
}

const NODE_COUNT = 28
const LINK_DISTANCE = 130

function seededRandom(seed: number) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

function createNodes(width: number, height: number): NetworkNode[] {
  const random = seededRandom(new Date().getFullYear() * 10000 + 405)

  return Array.from({ length: NODE_COUNT }, () => {
    const bucket = random()
    const group: 0 | 1 | 2 = bucket < 0.34 ? 0 : bucket < 0.67 ? 1 : 2

    return {
      x: 20 + random() * Math.max(40, width - 40),
      y: 20 + random() * Math.max(40, height - 40),
      vx: (random() - 0.5) * 0.6,
      vy: (random() - 0.5) * 0.6,
      radius: 2 + random() * 2.8,
      group,
    }
  })
}

export default function VisualNetwork() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const nodesRef = React.useRef<NetworkNode[]>([])
  const frameRef = React.useRef<number | null>(null)
  const pointerRef = React.useRef({ x: 0, y: 0, active: false })

  const insightCards = React.useMemo(
    () => [
      {
        title: 'IIT Delhi',
        value: '92% Match',
        tone: 'from-[#dbeafe] to-[#eef2ff] border-[#bfdbfe]',
      },
      {
        title: 'B.Tech Budget',
        value: 'Under 2L',
        tone: 'from-[#dcfce7] to-[#ecfeff] border-[#bbf7d0]',
      },
      {
        title: 'NEET Route',
        value: 'Top 50 Picks',
        tone: 'from-[#ede9fe] to-[#f5f3ff] border-[#ddd6fe]',
      },
    ],
    []
  )

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = Math.max(1, window.devicePixelRatio || 1)
      canvas.width = Math.floor(rect.width * ratio)
      canvas.height = Math.floor(rect.height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)

      nodesRef.current = createNodes(rect.width, rect.height)
    }

    const handleMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointerRef.current.x = event.clientX - rect.left
      pointerRef.current.y = event.clientY - rect.top
      pointerRef.current.active = true
    }

    const handleLeave = () => {
      pointerRef.current.active = false
    }

    const render = () => {
      const rect = canvas.getBoundingClientRect()
      const width = rect.width
      const height = rect.height

      context.clearRect(0, 0, width, height)

      const background = context.createLinearGradient(0, 0, width, height)
      background.addColorStop(0, 'rgba(239, 246, 255, 0.78)')
      background.addColorStop(0.5, 'rgba(248, 250, 252, 0.74)')
      background.addColorStop(1, 'rgba(224, 231, 255, 0.72)')
      context.fillStyle = background
      context.fillRect(0, 0, width, height)

      const nodes = nodesRef.current
      const pointer = pointerRef.current

      for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index]

        if (pointer.active) {
          const dx = node.x - pointer.x
          const dy = node.y - pointer.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          if (distance > 0 && distance < 120) {
            const force = (120 - distance) / 120
            node.vx += (dx / distance) * force * 0.06
            node.vy += (dy / distance) * force * 0.06
          }
        }

        node.x += node.vx
        node.y += node.vy

        if (node.x <= 10 || node.x >= width - 10) node.vx *= -1
        if (node.y <= 10 || node.y >= height - 10) node.vy *= -1

        node.vx *= 0.995
        node.vy *= 0.995

        for (let otherIndex = index + 1; otherIndex < nodes.length; otherIndex += 1) {
          const other = nodes[otherIndex]
          const dx = node.x - other.x
          const dy = node.y - other.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < LINK_DISTANCE) {
            context.strokeStyle = `rgba(59, 130, 246, ${0.2 * (1 - distance / LINK_DISTANCE)})`
            context.lineWidth = 1
            context.beginPath()
            context.moveTo(node.x, node.y)
            context.lineTo(other.x, other.y)
            context.stroke()
          }
        }
      }

      for (const node of nodes) {
        let fill = 'rgba(37, 99, 235, 0.95)'
        if (node.group === 1) fill = 'rgba(79, 70, 229, 0.92)'
        if (node.group === 2) fill = 'rgba(14, 165, 233, 0.92)'

        context.fillStyle = fill
        context.beginPath()
        context.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        context.fill()
      }

      frameRef.current = window.requestAnimationFrame(render)
    }

    handleResize()
    render()

    window.addEventListener('resize', handleResize)
    canvas.addEventListener('pointermove', handleMove)
    canvas.addEventListener('pointerleave', handleLeave)

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current)
      }
      window.removeEventListener('resize', handleResize)
      canvas.removeEventListener('pointermove', handleMove)
      canvas.removeEventListener('pointerleave', handleLeave)
    }
  }, [])

  return (
    <div className="relative mx-auto w-full max-w-[620px]">
      <div className="pointer-events-none absolute -left-16 top-1/3 h-44 w-44 rounded-full bg-[#60a5fa]/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-6 h-40 w-40 rounded-full bg-[#818cf8]/30 blur-3xl" />

      <div className="relative overflow-hidden rounded-[30px] border border-white/70 bg-white/50 shadow-[0_26px_80px_rgba(30,64,175,0.2)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 hero-grid opacity-70" />

        <canvas
          ref={canvasRef}
          className="relative z-10 block h-[420px] w-full md:h-[500px]"
          aria-label="Kampus Filter network visualization"
        />

        <div className="pointer-events-none absolute left-6 top-5 z-20 inline-flex items-center gap-2 rounded-full border border-[#bfdbfe] bg-white/85 px-4 py-1.5 text-xs font-semibold text-[#1d4ed8]">
          <Radar className="h-3.5 w-3.5" />
          Student Journey Intelligence
        </div>

        <div className="pointer-events-none absolute right-6 top-5 z-20 inline-flex items-center gap-1.5 rounded-full border border-[#ddd6fe] bg-white/85 px-3 py-1.5 text-xs font-semibold text-[#5b21b6]">
          <Sparkles className="h-3.5 w-3.5" />
          Live Match Graph
        </div>
      </div>

      <div className="pointer-events-none absolute -left-4 top-8 z-30 space-y-3">
        <div className="animate-float rounded-2xl border border-[#bfdbfe] bg-white/95 px-4 py-2 shadow-[0_12px_30px_rgba(37,99,235,0.18)]">
          <Badge className="bg-[#dbeafe] text-[#1d4ed8]">AI Match Engine</Badge>
          <p className="mt-1 text-xs font-medium text-[#1e293b]">Course + City + Budget Signal</p>
        </div>
      </div>

      <div className="absolute -right-5 bottom-3 z-30 flex w-[230px] flex-col gap-3">
        {insightCards.map((card, index) => (
          <div
            key={card.title}
            className={`rounded-2xl border bg-gradient-to-r px-4 py-3 shadow-[0_14px_35px_rgba(15,23,42,0.16)] backdrop-blur ${card.tone} ${
              index === 1 ? 'animate-float-delay' : index === 2 ? 'animate-float-slow' : 'animate-float'
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#475569]">{card.title}</p>
            <p className="mt-1 text-sm font-extrabold text-[#0f172a]">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
