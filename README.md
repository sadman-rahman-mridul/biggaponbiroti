# অ্যান্টেনা

A single-page listening room for Bangladeshi jingles. The YouTube player
is mapped onto the television in the background photograph.

## Run it

    npm install
    npm run dev        # http://localhost:5173

## Ship it

    npm run build      # outputs to dist/

`dist/` is a plain static folder — drop it on Vercel, Netlify, or GitHub Pages.
On Vercel: framework preset **Vite**, build `npm run build`, output `dist`.

## Where things are

- `src/config.js` — playlist ID, site name, and the TV screen coordinates
- `src/useYouTubePlayer.js` — playback, error recovery, Media Session
- `src/components/Television.jsx` — the cover-fit maths that pins the player to the CRT
- `public/bg-*.webp` — the background at three sizes, served via srcset

## Swapping the background

Replace the files in `public/`, then update `TV_RECT` and `BG_SIZE`
in `src/config.js` so the player still lands on the screen. `TV_RECT`
values are fractions of the image: left/right/top/bottom edges of the
glass, from 0 to 1.

## Keyboard

- `Space` play / pause
- `←` `→` scrub 5s
- `Shift + ←` `→` previous / next track
- `M` mute
- `Esc` close the track list

## Audio only

`AUDIO_ONLY` in `src/config.js` is `true`. The player still loads — it's
the sound source — but the picture never fades up, so the television
shows the static baked into the photograph and pulses while a track runs.

Worth knowing before you ship: YouTube's embedded player terms expect
their player to stay visible and unobscured. Hiding it is a terms
violation, and the practical risk is that a future player update starts
refusing to run this way, or the embed gets blocked. Set `AUDIO_ONLY`
to `false` to show the picture again.

A genuinely audio-only version means licensed audio files served from
your own `<audio>` tag, which for jingles means clearing rights with
the brands or agencies that own them.

## Live listener count

Uses Supabase Realtime presence — a live roster of connected clients,
no database table and no cleanup job.

1. Create a free project at supabase.com
2. Settings → API, copy the Project URL and the `anon` public key
3. Paste both into `src/config.js`

The anon key is designed to be exposed in client code, so it's safe to
commit. With the fields blank the counter simply doesn't render.

Free tier covers 200 concurrent connections, which is plenty until the
site takes off.
# biggaponbiroti
