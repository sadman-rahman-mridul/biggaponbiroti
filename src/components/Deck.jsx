import { useRef } from 'react'
import { PLAYLIST_ID, CURATOR } from '../config'
import { bn } from '../useListeners'

const mmss = (s) =>
  isFinite(s) && s >= 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00'

/* One reel of tape. The supply reel empties into the take-up reel
   as the track runs, which is the whole point of the thing. */
function Reel({ radius, spinning, fill }) {
  return (
    <div className={`reel ${spinning ? 'spinning' : ''}`}>
      <svg viewBox="0 0 46 46" aria-hidden="true">
        <circle cx="23" cy="23" r="21.5" fill="none" stroke="rgba(237,226,206,.2)" strokeWidth="1" />
        <circle cx="23" cy="23" r={radius} fill={fill} />
        <g className="hub">
          <circle cx="23" cy="23" r="7" fill="none" stroke="#EDE2CE" strokeWidth="1.4" />
          <path d="M23 16v5M23 25v5M16 23h5M25 23h5" stroke="#EDE2CE" strokeWidth="1.4" />
        </g>
      </svg>
    </div>
  )
}

export default function Deck({
  title, time, duration, playing, buffering, volume, muted, notice, engine, listeners,
  onToggle, onNext, onPrev, onSeek, onVolume, onMute, onOpenList,
}) {
  const tapeRef = useRef(null)
  const p = duration > 0 ? Math.min(time / duration, 1) : 0
  const live = engine === 'ready'

  const scrub = (e) => {
    const el = tapeRef.current
    if (!el || !live) return
    const r = el.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left
    onSeek(x / r.width)
  }

  return (
    <section className="deck" aria-label="প্লেয়ার">
      <div className="reels">
        <Reel radius={18 - 9 * p} spinning={playing} fill="rgba(237,226,206,.14)" />

        <div
          className="tape"
          ref={tapeRef}
          role="slider"
          tabIndex={0}
          aria-label="সময়"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(p * 100)}
          onClick={scrub}
          onTouchStart={(e) => { scrub(e); e.preventDefault() }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); onSeek(p + 0.02) }
            if (e.key === 'ArrowLeft') { e.preventDefault(); onSeek(p - 0.02) }
          }}
        >
          <div className="tape-fill" style={{ width: `${p * 100}%` }} />
          <div className="tape-head" style={{ left: `${p * 100}%` }} />
        </div>

        <Reel radius={9 + 9 * p} spinning={playing} fill="rgba(233,168,90,.24)" />
      </div>

      <div className="row-main">
        <div className="meta">
          <div className="now-label">
            {notice ? <span className="warn">{notice}</span>
              : engine === 'blocked' ? <span className="warn">প্লেয়ার ব্লকড</span>
              : engine === 'booting' ? 'চালু হচ্ছে…'
              : buffering ? 'বাফার হচ্ছে…'
              : playing ? 'এখন বাজছে'
              : 'থেমে আছে'}
          </div>
          <div className="title" title={title}>{title}</div>
        </div>

        {listeners.enabled && listeners.count > 0 && (
          <div className="listeners" title="এখন যতজন শুনছে">
            <span className="pip" />
            {listeners.count === 1 ? 'আপনি একাই শুনছেন' : `${bn(listeners.count)} জন শুনছে`}
          </div>
        )}

        <div className="controls">
          <button className="btn" onClick={onPrev} aria-label="আগেরটা" disabled={!live}>
            <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3 6l9-6v12z" /></svg>
          </button>

          <button className="btn btn--play" onClick={onToggle} aria-label={playing ? 'থামাও' : 'বাজাও'} disabled={!live}>
            {buffering && !playing
              ? <span className="spinner" />
              : playing
                ? <svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z" /></svg>
                : <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
          </button>

          <button className="btn" onClick={onNext} aria-label="পরেরটা" disabled={!live}>
            <svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2zM6 6l9 6-9 6z" /></svg>
          </button>

          <button className="btn" onClick={onOpenList} aria-label="ট্র্যাক তালিকা">
            <svg viewBox="0 0 24 24"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h11v2H4z" /></svg>
          </button>
        </div>

        <div className="vol">
          <button className="btn btn--sm" onClick={onMute} aria-label={muted ? 'শব্দ চালু' : 'নিঃশব্দ'}>
            {muted || volume === 0
              ? <svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3l2.5-2.5-1-1L15.5 11 13 8.5l-1 1L14.5 12 12 14.5l1 1 2.5-2.5 2.5 2.5 1-1L16.5 12z" /></svg>
              : <svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4zm11.5 3a4 4 0 0 0-2-3.5v7a4 4 0 0 0 2-3.5zM15.5 4v2a6 6 0 0 1 0 12v2a8 8 0 0 0 0-16z" /></svg>}
          </button>
          <input
            className="vol-slider"
            type="range" min="0" max="100" value={muted ? 0 : volume}
            onChange={(e) => onVolume(Number(e.target.value))}
            aria-label="ভলিউম"
          />
        </div>

        {engine === 'blocked'
          ? <a className="bail" href={`https://www.youtube.com/playlist?list=${PLAYLIST_ID}`}
               target="_blank" rel="noreferrer">ইউটিউবে খুলুন ↗</a>
          : <div className="time">{mmss(time)} / {mmss(duration)}</div>}
      </div>

      <p className="credit">
        Curated by{' '}
        <a href={CURATOR.url} target="_blank" rel="noreferrer noopener">{CURATOR.name}</a>
      </p>
    </section>
  )
}
