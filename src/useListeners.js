import { useEffect, useState } from 'react'
import { SUPABASE_URL, SUPABASE_ANON_KEY, ROOM } from './config'

/* How many people have the room open right now.
 *
 * This uses Supabase Realtime "presence", which keeps a live roster of
 * connected clients and drops you from it the moment your socket closes
 * — no database table, no cleanup job, no stale rows.
 *
 * With no keys configured the hook returns { enabled: false } and the
 * counter never renders. Nothing else in the app depends on it. */
export function useListeners(active) {
  const [count, setCount] = useState(0)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return

    let channel = null
    let client = null
    let dropped = false

    ;(async () => {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        if (dropped) return

        client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          realtime: { params: { eventsPerSecond: 2 } },
        })

        channel = client.channel(ROOM, {
          config: { presence: { key: Math.random().toString(36).slice(2) } },
        })

        channel.on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState()
          setCount(Object.keys(state).length)
          setEnabled(true)
        })

        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && !dropped) {
            await channel.track({ joined: Date.now() })
          }
        })
      } catch {
        setEnabled(false)
      }
    })()

    return () => {
      dropped = true
      try { channel?.untrack(); client?.removeChannel(channel) } catch {}
    }
  }, [])

  return { count, enabled }
}

/* ০১২৩৪৫৬৭৮৯ — the numerals belong in the same script as the rest. */
export const bn = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d])
