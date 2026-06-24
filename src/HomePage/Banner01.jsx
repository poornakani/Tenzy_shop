'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const ELECTRIC_CONFIG = {
  timeClampSec: 0.05,
  svg: {
    strokes: {
      outer: { width: 3, color: 'rgba(232, 82, 42, 0.75)' },
      mid: { width: 2.2, color: 'rgba(232, 82, 42, 0.55)' },
      core: { width: 1.2, opacity: 0.95, color: '#ffffff' },
    },
    glowBlur: 0.9,
  },
  speeds: [-1.32, 0.42, 0.95],
  shimmer: {
    speed: 4.2,
    freq: 8.5,
    amp: 0.25,
  },
  segments: 48,
  freqs: [0.7, 2.7, 3.9],
  easeStiffness: 6,
  clipOffset: 25,
  amps: [0.4, -0.8, 0.6],
}

const Banner01 = () => {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const [position, setPosition] = useState(60)
  const [displayPos, setDisplayPos] = useState(60)
  const [time, setTime] = useState(0)

  const leftImage = 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1400&q=80'
  const rightImage = 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1400&q=80'

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(ELECTRIC_CONFIG.timeClampSec, (now - last) / 1000)
      last = now

      setTime(t => t + dt)
      setDisplayPos(p => {
        const target = position
        const stiffness = ELECTRIC_CONFIG.easeStiffness
        return p + (target - p) * (1 - Math.exp(-stiffness * dt))
      })

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [position])

  const handleMouseMove = (e) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100

    setPosition(x < 50 ? 110 : 20)
  }

  const handleMouseLeave = () => {
    setPosition(60)
  }

  const clamp01_100 = (v) => Math.max(0, Math.min(100, v))

  const { polyPointsStr, clipPolygonStr } = useMemo(() => {
    const SEGMENTS = ELECTRIC_CONFIG.segments
    const AMPS = ELECTRIC_CONFIG.amps
    const FREQS = ELECTRIC_CONFIG.freqs
    const SPEEDS = ELECTRIC_CONFIG.speeds

    const topX = clamp01_100(displayPos)
    const bottomX = clamp01_100(displayPos - ELECTRIC_CONFIG.clipOffset)

    const pts = []
    for (let i = 0; i <= SEGMENTS; i++) {
      const tNorm = i / SEGMENTS
      const y = tNorm * 100
      const base = topX * (1 - tNorm) + bottomX * tNorm
      let off = 0
      for (let k = 0; k < AMPS.length; k++) {
        off += AMPS[k] * Math.sin(2 * Math.PI * (FREQS[k] * tNorm + SPEEDS[k] * time) + k * 1.3)
      }
      off +=
        ELECTRIC_CONFIG.shimmer.amp *
        Math.sin(2 * Math.PI * (ELECTRIC_CONFIG.shimmer.freq * tNorm + ELECTRIC_CONFIG.shimmer.speed * time))

      const x = clamp01_100(base + off)
      pts.push({ y, x })
    }

    const polyPointsStr = pts.map(p => `${p.x},${p.y}`).join(' ')
    const edgePoints = pts.map(p => `${p.x}% ${p.y}%`).join(', ')
    const clipPolygonStr = `polygon(0% 0%, ${edgePoints}, 0% 100%)`

    return { polyPointsStr, clipPolygonStr }
  }, [displayPos, time])

  const leftClipStyle = {
    WebkitClipPath: clipPolygonStr,
    clipPath: clipPolygonStr,
  }

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden select-none bg-black"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ pointerEvents: 'auto' }}
    >
      {/* Right Image - Base Layer */}
      <div className="absolute inset-0">
        <img
          src={rightImage}
          alt="Right"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Left Image - Wavy Clipped Layer */}
      <div className="absolute inset-0 overflow-hidden" style={leftClipStyle}>
        <img
          src={leftImage}
          alt="Left"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Electric Arc Divider */}
      <svg
        className="pointer-events-none absolute inset-0 z-30 select-none"
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ userSelect: 'none' }}
      >
        <defs>
          <filter id="electric-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={ELECTRIC_CONFIG.svg.glowBlur} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <polyline
          points={polyPointsStr}
          fill="none"
          stroke={ELECTRIC_CONFIG.svg.strokes.mid.color}
          strokeWidth={ELECTRIC_CONFIG.svg.strokes.mid.width}
          vectorEffect="non-scaling-stroke"
          filter="url(#electric-glow)"
        />
        <polyline
          points={polyPointsStr}
          fill="none"
          stroke={ELECTRIC_CONFIG.svg.strokes.core.color}
          strokeOpacity={ELECTRIC_CONFIG.svg.strokes.core.opacity}
          strokeWidth={ELECTRIC_CONFIG.svg.strokes.core.width}
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={polyPointsStr}
          fill="none"
          stroke={ELECTRIC_CONFIG.svg.strokes.outer.color}
          strokeWidth={ELECTRIC_CONFIG.svg.strokes.outer.width}
          vectorEffect="non-scaling-stroke"
          filter="url(#electric-glow)"
        />
      </svg>

      {/* Left Side Content Overlay */}
      <div className="absolute left-0 top-0 h-full w-1/2 flex items-center justify-center p-8 z-20">
        <div className="max-w-md">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Premium Beauty
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-400">
              Collection
            </span>
          </h2>
          <p className="text-gray-200 text-lg mb-8">
            Discover curated beauty products from global brands. Hover to explore.
          </p>
          <button
            onClick={() => navigate('/products')}
            className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-full transition-all duration-300 hover:scale-105"
            style={{ boxShadow: '0 8px 24px rgba(232, 82, 42, 0.4)' }}
          >
            Shop Collection →
          </button>
        </div>
      </div>

      {/* Right Side Content Overlay */}
      <div className="absolute right-0 top-0 h-full w-1/2 flex items-center justify-center p-8 z-20">
        <div className="max-w-md text-right">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Skincare
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">
              Essentials
            </span>
          </h2>
          <p className="text-gray-200 text-lg mb-8">
            Professional-grade serums and treatments. Expert-curated for your skin.
          </p>
          <button
            onClick={() => navigate('/products')}
            className="px-8 py-4 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-full transition-all duration-300 hover:scale-105"
            style={{ boxShadow: '0 8px 24px rgba(43, 185, 180, 0.4)' }}
          >
            Explore Now →
          </button>
        </div>
      </div>

      {/* Hover Hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 text-white text-sm opacity-60 animate-pulse">
        ← Hover to discover →
      </div>
    </div>
  )
}

export default Banner01
