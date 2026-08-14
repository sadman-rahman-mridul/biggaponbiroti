import { useState, useEffect } from 'react'
import { useYouTubePlayer } from './useYouTubePlayer'
import { TAGLINE } from './config'
import { useListeners } from './useListeners'
import Television from './components/Television'
import Deck from './components/Deck'
import TrackList from './components/TrackList'

const MOUNT = 'yt-mount'

export default function App() {
  const {
    engine, listState, tracks, index, playing, buffering,
    time, duration, title: liveTitle, notice, volume, muted, actions,
  } = useYouTubePlayer(MOUNT)

  const listeners = useListeners(playing)
  const [listOpen, setListOpen] = useState(false)
  const [clock, setClock] = useState('')

  // Same wall clock as the one hanging in the photo.
  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))
    tick()
    const id = setInterval(tick, 10000)
    return () => clearInterval(id)
  }, [])

  // Keyboard transport.
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.code === 'Space') { e.preventDefault(); actions.toggle() }
      if (e.key === 'ArrowRight' && e.shiftKey) actions.next()
      if (e.key === 'ArrowLeft' && e.shiftKey) actions.prev()
      if (e.key === 'ArrowRight' && !e.shiftKey) actions.nudge(5)
      if (e.key === 'ArrowLeft' && !e.shiftKey) actions.nudge(-5)
      if (e.key.toLowerCase() === 'm') actions.toggleMute()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [actions])

  const current = tracks[index]
  const title =
    engine === 'blocked' ? 'প্লেয়ার লোড হয়নি'
      : liveTitle || current?.title
      || (engine === 'booting' ? 'লোড হচ্ছে…' : 'বাজাতে প্লে চাপুন')

  return (
    <>
      <Television mountId={MOUNT} lit={playing || buffering} onToggle={actions.toggle} />

      <div className="grain" aria-hidden="true" />

      {/* The name is already burnt into the screen behind us, so the
          masthead stays out of its way. */}
      <header className="masthead">
        <p className="eyebrow">{TAGLINE}</p>
        <div className="clock">{clock}</div>
      </header>

      <Deck
        title={title}
        time={time}
        duration={duration}
        playing={playing}
        buffering={buffering}
        volume={volume}
        muted={muted}
        notice={notice}
        engine={engine}
        listeners={listeners}
        onToggle={actions.toggle}
        onNext={actions.next}
        onPrev={actions.prev}
        onSeek={actions.seek}
        onVolume={actions.setVolume}
        onMute={actions.toggleMute}
        onOpenList={() => setListOpen(true)}
      />

      <TrackList
        open={listOpen}
        tracks={tracks}
        index={index}
        listState={listState}
        onPick={actions.playAt}
        onClose={() => setListOpen(false)}
      />
    </>
  )
}
