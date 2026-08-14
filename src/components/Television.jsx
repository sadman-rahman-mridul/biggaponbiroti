import { useEffect, useRef, useState, useMemo } from 'react'
import { TV_RECT, TV_TILT, BG_SIZE, AUDIO_ONLY } from '../config'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

/* The player isn't a widget floating over a photo — it *is* the
   television in the photo. This works out where the CRT screen lands
   on any viewport and pins everything to it. */
export default function Television({ mountId, lit, onToggle }) {
  const tvRef = useRef(null)
  const [pos, setPos] = useState('50% 50%')

  /* Dust in the light. Fixed on first render so the specks don't
     teleport every time React re-renders. */
  const motes = useMemo(
    () =>
      Array.from({ length: 18 }, () => ({
        left: 18 + Math.random() * 64,     // %
        size: 1 + Math.random() * 2.2,     // px
        delay: -Math.random() * 26,        // s
        dur: 20 + Math.random() * 22,      // s
        drift: -30 + Math.random() * 60,   // px
        peak: 0.15 + Math.random() * 0.35,
      })),
    []
  )

  useEffect(() => {
    let frame = 0

    const layout = () => {
      const tv = tvRef.current
      if (!tv) return

      const { w: iw, h: ih } = BG_SIZE
      const cw = window.innerWidth
      const ch = window.innerHeight
      const scale = Math.max(cw / iw, ch / ih)
      const dw = iw * scale
      const dh = ih * scale

      /* Wide screens get the photo's own composition. Narrow ones slide
         it so the television stays in frame. */
      let px = 0.5
      let py = 0.5
      if (cw / ch < 1.25) {
        const cx = ((TV_RECT.l + TV_RECT.r) / 2) * iw * scale
        const cy = ((TV_RECT.t + TV_RECT.b) / 2) * ih * scale
        if (cw - dw !== 0) px = clamp((0.5 * cw - cx) / (cw - dw), 0, 1)
        if (ch - dh !== 0) py = clamp((0.42 * ch - cy) / (ch - dh), 0, 1)
      }
      setPos(`${px * 100}% ${py * 100}%`)

      const ox = (cw - dw) * px
      const oy = (ch - dh) * py
      const W = (TV_RECT.r - TV_RECT.l) * iw * scale
      const H = (TV_RECT.b - TV_RECT.t) * ih * scale

      tv.style.left = `${ox + TV_RECT.l * iw * scale}px`
      tv.style.top = `${oy + TV_RECT.t * ih * scale}px`
      tv.style.width = `${W}px`
      tv.style.height = `${H}px`

      const f = tv.querySelector('iframe')
      if (f) {
        f.style.width = `${Math.max(W, (H * 16) / 9)}px`
        f.style.height = `${Math.max(H, (W * 9) / 16)}px`
      }
    }

    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(layout)
    }

    layout()
    window.addEventListener('resize', schedule)
    window.addEventListener('orientationchange', schedule)

    const obs = new MutationObserver(schedule)
    if (tvRef.current) obs.observe(tvRef.current, { childList: true, subtree: true })

    const id = setInterval(schedule, 1000)
    setTimeout(() => clearInterval(id), 6000)

    return () => {
      cancelAnimationFrame(frame)
      clearInterval(id)
      obs.disconnect()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('orientationchange', schedule)
    }
  }, [])

  return (
    <div className="room">
      <img
        className="room-img"
        style={{ objectPosition: pos }}
        alt=""
        src="./bg.jpg"
        srcSet="./bg-1672.webp 1672w, ./bg-2508.webp 2508w, ./bg-3344.webp 3344w"
        sizes="100vw"
        fetchpriority="high"
      />

      {/* The smoke in the photograph is frozen. These two slow layers
          drift across it so the floor keeps moving. */}
      <div className="fog fog--a" aria-hidden="true" />
      <div className="fog fog--b" aria-hidden="true" />

      <div className="motes" aria-hidden="true">
        {motes.map((m, i) => (
          <i
            key={i}
            style={{
              left: `${m.left}%`,
              width: `${m.size}px`,
              height: `${m.size}px`,
              animationDelay: `${m.delay}s`,
              animationDuration: `${m.dur}s`,
              '--drift': `${m.drift}px`,
              '--peak': m.peak,
            }}
          />
        ))}
      </div>

      <div className="room-tint" />

      <div
        className={`tv ${lit ? 'on-air' : ''}`}
        ref={tvRef}
        style={{ transform: TV_TILT ? `rotate(${TV_TILT}deg)` : undefined }}
      >
        {/* In audio-only mode the picture never comes up, so the title
            burnt into the screen stays readable. The player is still
            mounted here — it's the sound source. */}
        <div className={`tv-signal ${lit && !AUDIO_ONLY ? 'lit' : ''}`}>
          <div id={mountId} />
        </div>

        {/* Vertical hold, never quite steady. */}
        <div className="tv-roll" />
        <div className="tv-glass" />

        <button className="tv-hit" onClick={onToggle} aria-label={lit ? 'থামাও' : 'বাজাও'} />
      </div>
    </div>
  )
}
