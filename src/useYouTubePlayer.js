import { useEffect, useRef, useState, useCallback } from 'react'
import { PLAYLIST_ID, SITE_NAME } from './config'

/* Load the IFrame API exactly once. */
let apiPromise = null
function loadApi() {
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve, reject) => {
    if (window.YT && window.YT.Player) return resolve(window.YT)
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev()
      resolve(window.YT)
    }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    s.onerror = () => reject(new Error('iframe_api blocked'))
    document.head.appendChild(s)
    setTimeout(() => reject(new Error('iframe_api timeout')), 12000)
  })
  return apiPromise
}

const STALL_LIMIT = 14000  // ms of no progress before we give up on a track
const BOOT_LIMIT = 12000   // ms to wait for onReady before we admit defeat

export function useYouTubePlayer(mountId) {
  const player = useRef(null)
  const rafId = useRef(0)
  const stallRef = useRef({ at: 0, time: -1 })
  const skipping = useRef(false)

  /* Two independent states. Playback must never wait on the track
     list — that was the bug that locked the whole transport. */
  const [engine, setEngine] = useState('booting') // booting | ready | blocked
  const [listState, setListState] = useState('loading') // loading | ready | partial

  const [tracks, setTracks] = useState([])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [title, setTitle] = useState('')
  const [notice, setNotice] = useState('')
  const [volume, setVol] = useState(() => {
    try { return Number(localStorage.getItem('antenna:vol') ?? 85) } catch { return 85 }
  })
  const [muted, setMuted] = useState(false)

  /* ── Step past anything that refuses to play ─────────────── */
  const skipBroken = useCallback((reason) => {
    if (skipping.current || !player.current) return
    skipping.current = true
    setTracks((t) => t.map((x, i) => (i === index ? { ...x, dead: true } : x)))
    setNotice(reason)
    setTimeout(() => {
      skipping.current = false
      setNotice('')
      try { player.current.nextVideo() } catch {}
    }, 1400)
  }, [index])

  /* ── Boot ────────────────────────────────────────────────── */
  useEffect(() => {
    let dead = false
    const bootTimer = setTimeout(() => {
      if (!dead) setEngine((s) => (s === 'booting' ? 'blocked' : s))
    }, BOOT_LIMIT)

    loadApi()
      .then((YT) => {
        if (dead) return
        player.current = new YT.Player(mountId, {
          /* No `origin` and no `youtube-nocookie` host. Both break the
             postMessage handshake when the page is framed or served
             from a null origin, and neither buys us anything. */
          playerVars: {
            listType: 'playlist',
            list: PLAYLIST_ID,
            enablejsapi: 1,
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            iv_load_policy: 3,
          },
          events: {
            onReady: (e) => {
              if (dead) return
              clearTimeout(bootTimer)
              setEngine('ready')            // transport unlocks here, not later
              try { e.target.setVolume(volume) } catch {}
              pollPlaylist(e.target)
            },
            onStateChange: (e) => {
              const S = window.YT.PlayerState
              setPlaying(e.data === S.PLAYING)
              setBuffering(e.data === S.BUFFERING)

              if (e.data === S.PLAYING || e.data === S.BUFFERING) {
                stallRef.current = { at: Date.now(), time: -1 }
              }

              const i = e.target.getPlaylistIndex()
              if (i >= 0) setIndex(i)
              setDuration(e.target.getDuration() || 0)

              const d = e.target.getVideoData?.()
              if (d?.title) {
                setTitle(d.title)
                setTracks((t) => t.map((x) => (x.id === d.video_id ? { ...x, title: d.title } : x)))
              }

              if (e.data === S.ENDED) {
                const list = e.target.getPlaylist() || []
                if (e.target.getPlaylistIndex() >= list.length - 1) {
                  setTimeout(() => { try { e.target.playVideoAt(0) } catch {} }, 400)
                }
              }
            },
            onError: (e) => {
              const why = e.data === 100 || e.data === 2
                ? 'ভিডিওটি আর নেই — পরেরটায় যাচ্ছি'
                : 'এই ট্র্যাকটি এখানে বাজানো যাচ্ছে না — পরেরটায় যাচ্ছি'
              skipBroken(why)
            },
          },
        })
      })
      .catch(() => { if (!dead) setEngine('blocked') })

    return () => {
      dead = true
      clearTimeout(bootTimer)
      cancelAnimationFrame(rafId.current)
      try { player.current?.destroy() } catch {}
      player.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountId])

  /* ── The list arrives after onReady, so poll for it separately ── */
  function pollPlaylist(p, tries = 0) {
    const list = p.getPlaylist?.()
    if (list && list.length) {
      setTracks(list.map((id, i) => ({
        id, title: `ট্র্যাক ${String(i + 1).padStart(2, '0')}`, dead: false,
      })))
      setListState('ready')
      fetchTitles(list)
      return
    }
    if (tries > 48) { setListState('partial'); return }
    setTimeout(() => pollPlaylist(p, tries + 1), 250)
  }

  /* ── Real titles, four at a time ─────────────────────────── */
  async function fetchTitles(list) {
    for (let i = 0; i < list.length; i += 4) {
      const batch = await Promise.all(
        list.slice(i, i + 4).map(async (id) => {
          try {
            const r = await fetch(
              `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`
            )
            if (!r.ok) return null
            const j = await r.json()
            return { id, title: j.title }
          } catch { return null }
        })
      )
      setTracks((t) => t.map((x) => {
        const hit = batch.find((b) => b && b.id === x.id)
        return hit ? { ...x, title: hit.title } : x
      }))
    }
  }

  /* ── Progress loop, only while something is moving ───────── */
  useEffect(() => {
    if (!playing) { cancelAnimationFrame(rafId.current); return }
    const tick = () => {
      const p = player.current
      if (p?.getDuration) {
        const d = p.getDuration() || 0
        const t = p.getCurrentTime() || 0
        setDuration(d); setTime(t)

        const s = stallRef.current
        if (Math.abs(t - s.time) > 0.25) stallRef.current = { at: Date.now(), time: t }
        else if (s.at && Date.now() - s.at > STALL_LIMIT) {
          stallRef.current = { at: 0, time: -1 }
          skipBroken('ট্র্যাকটি আটকে গেছে — পরেরটায় যাচ্ছি')
        }
      }
      rafId.current = requestAnimationFrame(tick)
    }
    rafId.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId.current)
  }, [playing, skipBroken])

  /* ── Lock screen / headphone controls ────────────────────── */
  useEffect(() => {
    if (!('mediaSession' in navigator) || !tracks[index]) return
    const t = tracks[index]
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: t.title, artist: SITE_NAME,
        artwork: [
          { src: `https://i.ytimg.com/vi/${t.id}/mqdefault.jpg`, sizes: '320x180', type: 'image/jpeg' },
          { src: `https://i.ytimg.com/vi/${t.id}/hqdefault.jpg`, sizes: '480x360', type: 'image/jpeg' },
        ],
      })
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
      navigator.mediaSession.setActionHandler('play', () => player.current?.playVideo())
      navigator.mediaSession.setActionHandler('pause', () => player.current?.pauseVideo())
      navigator.mediaSession.setActionHandler('nexttrack', () => player.current?.nextVideo())
      navigator.mediaSession.setActionHandler('previoustrack', () => player.current?.previousVideo())
    } catch {}
  }, [tracks, index, playing])

  /* ── Actions ─────────────────────────────────────────────── */
  const toggle = useCallback(() => {
    const p = player.current; if (!p) return
    try { playing ? p.pauseVideo() : p.playVideo() } catch {}
  }, [playing])

  const next = useCallback(() => { try { player.current?.nextVideo() } catch {} }, [])
  const prev = useCallback(() => {
    const p = player.current; if (!p) return
    try { p.getCurrentTime() > 3 ? p.seekTo(0, true) : p.previousVideo() } catch {}
  }, [])
  const playAt = useCallback((i) => { try { player.current?.playVideoAt(i) } catch {} }, [])
  const seek = useCallback((frac) => {
    const p = player.current; if (!p) return
    const d = p.getDuration(); if (d > 0) p.seekTo(Math.max(0, Math.min(1, frac)) * d, true)
  }, [])
  const nudge = useCallback((secs) => {
    const p = player.current; if (!p) return
    p.seekTo(Math.max(0, p.getCurrentTime() + secs), true)
  }, [])
  const setVolume = useCallback((v) => {
    setVol(v); setMuted(v === 0)
    try { player.current?.setVolume(v); player.current?.unMute() } catch {}
    try { localStorage.setItem('antenna:vol', String(v)) } catch {}
  }, [])
  const toggleMute = useCallback(() => {
    const p = player.current; if (!p) return
    if (muted || p.isMuted()) { p.unMute(); p.setVolume(volume || 60); setMuted(false) }
    else { p.mute(); setMuted(true) }
  }, [muted, volume])

  return {
    engine, listState, tracks, index, playing, buffering,
    time, duration, title, notice, volume, muted,
    actions: { toggle, next, prev, playAt, seek, nudge, setVolume, toggleMute },
  }
}
