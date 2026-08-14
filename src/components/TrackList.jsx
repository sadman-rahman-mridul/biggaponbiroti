import { useState, useMemo, useEffect, useRef } from 'react'

export default function TrackList({ open, tracks, index, listState, onPick, onClose }) {
  const [q, setQ] = useState('')
  const listRef = useRef(null)

  const shown = useMemo(() => {
    const rows = tracks.map((t, i) => ({ ...t, i }))
    if (!q.trim()) return rows
    const needle = q.trim().toLowerCase()
    return rows.filter((r) => r.title.toLowerCase().includes(needle))
  }, [tracks, q])

  // Keep the playing track in view when the panel opens.
  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.querySelector('[aria-current="true"]')
    el?.scrollIntoView({ block: 'center' })
  }, [open, index])

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  return (
    <>
      <div className={`scrim ${open ? 'on' : ''}`} onClick={onClose} />
      <aside className={`sheet ${open ? 'open' : ''}`} aria-label="ট্র্যাক তালিকা" aria-hidden={!open}>
        <div className="sheet-head">
          <h2>ট্র্যাক তালিকা</h2>
          <span className="sheet-count">{String(tracks.length).padStart(2, '0')} ট্র্যাক</span>
          <button className="close" onClick={onClose} aria-label="বন্ধ">&times;</button>
        </div>

        <div className="sheet-search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="খুঁজুন…"
            aria-label="ট্র্যাক খুঁজুন"
          />
        </div>

        <div className="list" ref={listRef}>
          {listState === 'partial' && (
            <p className="msg">
              তালিকাটি পড়া যায়নি, তবে প্লেয়ার চলবে — নিচের প্লে বোতাম ব্যবহার করুন।
            </p>
          )}
          {listState === 'loading' && <p className="msg">লোড হচ্ছে…</p>}
          {listState === 'ready' && shown.length === 0 && <p className="msg">কিছু পাওয়া যায়নি।</p>}

          {shown.map((t) => (
            <button
              key={t.id + t.i}
              className={`trow ${t.dead ? 'dead' : ''}`}
              aria-current={t.i === index}
              onClick={() => { onPick(t.i); onClose() }}
            >
              <span className="trow-n">{String(t.i + 1).padStart(2, '0')}</span>
              <span className="trow-t">{t.title}</span>
              {t.dead && <span className="trow-x">অনুপলব্ধ</span>}
              <span className="bars"><i /><i /><i /></span>
            </button>
          ))}
        </div>
      </aside>
    </>
  )
}
