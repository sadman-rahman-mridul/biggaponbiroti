// ─── Everything you'd want to change lives here ───────────────

export const PLAYLIST_ID = 'PLdZKZfqjP3_U'

export const SITE_NAME = 'বিজ্ঞাপন বিরতি'
export const TAGLINE   = 'বাংলাদেশি জিঙ্গল, লুপে'

/* The wordmark is already burnt into the screen in the background
   photograph, so the masthead doesn't repeat it. */

export const CURATOR = {
  name: 'Sadman',
  url: 'https://www.linkedin.com/in/sadman-rahman-mridul/',
}

/* Audio only. The player still loads — it's the sound source — but the
   picture never comes up, which also keeps the title on the screen from
   being covered. Read the note in README.md before you ship. */
export const AUDIO_ONLY = true

/* Live listener count. Leave these blank and the counter doesn't render;
   everything else works the same.
   Supabase -> new project -> Settings -> API.
   The anon key is designed to be public, so it's safe in client code. */
export const SUPABASE_URL = ''
export const SUPABASE_ANON_KEY = ''
export const ROOM = 'biroti-live'

// Where the television screen sits inside the background photo, as
// fractions of the image. Measured off WebBG.jpg (1672 x 941).
export const TV_RECT = { l: 0.3320, r: 0.6148, t: 0.3592, b: 0.7524 }

// This set faces us square on, unlike the last one.
export const TV_TILT = 0 // degrees

// Natural size of the background image, used for the cover-fit math.
export const BG_SIZE = { w: 1672, h: 941 }
