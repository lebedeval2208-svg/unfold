# UNFOLD

Everyone contributes. Nobody knows the plot.

## What is implemented

- Real D1-backed online rooms for 4–8 players. Six-character invite codes, local QR generation, private resume identities, readiness, immutable round settings and a frozen circle.
- One-device pass-and-play, with private handoffs for writing and ballots; locally saved progress.
- Clearly labeled solo sample: prewritten lines plus the visitor's exact contribution. Office Heist is the default; other themes are available after the sample.
- All six specified packs, 38 beats total, Ukrainian Family Classic labels, 114 curated sparks, 114 fallback answers and 114 prompt phrasings.
- Classic and One-Word Leak; optional private style cards; Unicode grapheme limits.
- Shared server deadlines, early completion, game fills, pause/resume, extra time, reconnect, host transfer and automatic migration after 30 seconds of host absence.
- Permission-filtered, line-by-line reveals; backward navigation, optional auto-unfold, real reactions, story hiding, collective voting, ties and abstentions.
- Results gallery, earlier rounds, clipboard/text/PNG card export. Exact contributions and honest game-fill/sample labels; author names only when enabled.
- TV-first host lobby with a high-resolution QR code, large room code, live player/ready tiles and full-screen control. Host on the TV (facilitator-only by default); players scan and write on their phones. A separate read-only TV display remains available. Physical TV/casting uses the browser or operating system’s own casting feature.
- Upward swipe-to-fold with visible paper animation; Fold & pass remains the keyboard/tap alternative. Reduced motion replaces the animation.
- Read-only shared display and facilitator-only hosting. Bright paper-and-eyes design with the subtler “Nothing to see here” hook, dark theme, reduced-motion rules, keyboard controls and optional synthesized effects. Read-aloud uses the current browser's speech capability.

## Architecture and operation

Vinext/React on a Cloudflare Worker, provisioned through Sites. `.openai/hosting.json` declares the D1 binding `DB`; the schema migration is under `drizzle/`. `lib/packs.js` is the content library; `lib/game.js` contains shared assignment/state rules; `app/api/room/route.ts` is transport and persistence; `lib/export.js` preserves text for exports.

The room is one versioned D1 record. Every command reads the latest record, applies server-side permission and phase checks, then writes using `UPDATE ... WHERE revision = ?`. A failed compare-and-swap retries against the new version. Unique story/beat slots and stored request IDs prevent duplicate answers and reveal advances, including a response lost after acceptance. No sealed answer, another player's style card, voting tally, or resume credential is included in a public response.

Clients poll every 1.6 seconds. These are shared server snapshots, not local-storage multiplayer. Every read/command reconciles deadlines using server time. No host tab is a timing authority. The platform does not need a permanently running worker: when connected clients poll, the server advances expired deadlines; after inactivity the next request reconciles state. If no participating members have been seen for 30 seconds, writing pauses. A returning host resumes it. D1 durability survives worker restarts.

Membership credentials are random UUID pairs, stored on the originating device and sent in POST bodies, never invite URLs. A second tab reuses that membership. The read-only display receives no membership credential. Codes allow viewing only authorized public state and joining the room. Sites audience controls apply before the game; the user authorized public access by site link. Individual games still require their six-character room code; no room directory is exposed. Public site access is applied at publication.

Room access expires after 24 hours without an authenticated member's activity. Optional Worker variable `ROOM_TTL_HOURS` accepts 1–168 hours; default 24. Expiry checks happen before every read or command. Physical cleanup is opportunistic: creating a room deletes up to 50 expired records. There is no scheduled deletion job configured. For strict deletion timing, schedule bounded execution of `DELETE FROM rooms WHERE code IN (SELECT code FROM rooms WHERE expires < ? LIMIT 50)` with the current Unix time in milliseconds; repeat until the batch is empty. Do not claim immediate physical deletion on expiry.

No generative AI API or external media/music service is configured or needed. Story connectors are deterministic, pack-specific prose around the exact contributions; hidden lines are never narrated or exported. Theme-specific original narrator profiles use the available system/browser speech voices, with modest pitch/rate adjustments. The user can select an available voice. These are not celebrity clones, and perceived naturalness depends on the device’s installed voices. The selected device can narrate each authorized unfold or read the whole visible story. Music ducks during speech. Sparks are bundled curated content. Browser speech voices and optional Web Audio effects vary by device. Six original procedural Web Audio music loops are included, one per pack, with a separate music toggle and volume control. Effects include a paper fold/swoosh, pass tones, reveal notes and a final-line flourish. Music and effects start only after a user gesture and can be turned off independently.

## Run locally

Requires Node 22.13+ and npm.

1. `npm ci`
2. `npm run build`
3. `node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_lethal_shiver_man.sql`
4. `npm run dev`

Open the printed loopback URL. In this workspace Node and npm were supplied through a workspace-local runtime path; ordinary installations can use their standard PATH.

The Sites build copies migrations into the deployment artifact and Sites applies them to hosted D1. Local and production databases are separate. Keep `.wrangler`, `.sites-runtime`, `.env*`, credentials and local game data out of source control.

## Verification

- `node --test tests/game.test.mjs tests/audio.test.mjs`: 17 checks passed. Covers 4/8 players, six/eight beats, deterministic rotation, Unicode, private responses/clues/cards, host permissions, duplicate submission and reveal IDs, deadlines and fills, pause/extra time, host migration, voting ties/abstentions, room expiry and exact-text export wrapping, and connected narrative privacy. Audio lifecycle tests cover all six themes, effect opt-in, stop/restart, and unavailable-browser fallback.
- `node tests/online.mjs`: full six-beat round passed against a real local Worker/D1 server using four independent HTTP player credentials. Includes concurrent writes/retries, privacy checks, synchronized reveal, and a tied award. This is not a four-human remote-device test.
- TypeScript check and production build passed before publication.
- Browser verified home/writing/reveal/results, creative sparks, copy, and a Ukrainian/emoji draft surviving refresh and appearing verbatim in the reveal.

Both the generated PNG story card and the connected-prose text export were previewed and successfully saved as real files. Clipboard copy was confirmed in the browser. A physical-phone, screen-reader, cross-account hosted multiplayer and prolonged network-loss soak test have not been performed. The upward swipe was browser-tested and sealed the answer correctly. The responsive and reduced-motion implementations are present; those full device/accessibility audits remain unverified.

Party edition browser checks: a real TV host room was created; a separate browser origin joined with its own membership and marked ready. The TV received the real player and ready state. Music on/off controls changed the active track and exposed a volume control. Upward dragging the fold strip successfully sealed a typed answer and advanced to the reveal; all six lines then revealed correctly with effects enabled. Physical TV hardware and phone-camera scanning remain untested.

Latest design refinement: repetitive “party” and numerical prewritten-demo copy was removed. The demo remains plainly identified as a sample. Paper characters have expressive eyes; real reaction events can produce synthesized cartoon wow/boo/chuckle/clap sounds when effects are enabled. Online play still gives every frozen slot one assignment per beat, simultaneously; four players produce four stories, not one sequential story.
