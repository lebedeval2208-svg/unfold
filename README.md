# UNFOLD

**You wrote this. Now look at what you’ve done**

[**Play the live game →**](https://unfold-paper-stories.woollymap129.chatgpt.site)

A collaborative story game for 4–8 people. Open it on a TV or laptop, scan the room QR code with your phones, and write simultaneously. Every question sends you to a different story. At the end, unfold what you accidentally wrote together.
‘Can’t look away’ = complicity. Everyone secretly contributes to a story without seeing what anyone else wrote. When it unfolds, you’re watching a disaster you helped create and waiting to discover what your innocent sentence has become. It’s a game where you have to look away first, to create something you can’t look away from.

## Play

1. Open the live game and choose **Start on the TV** (or host on your phone).
2. Share the room code or scan its QR code on each player's phone.
3. Everyone picks a nickname and taps **I'm ready**.
4. Write, fold, and pass. The host reveals the finished stories one line at a time.

One-device pass-and-play and a clearly labeled solo sample are also included.

Opening the main site link always shows the home page. Choose **Resume saved game** to return to progress saved on this device. Room invite links still open the join screen.

## What's included

- Six themes: Family Classic, Office Heist, Disastrous Product Launch, Space Emergency, Fairy-Tale Chaos, and Nature Documentary.
- Classic hidden answers or an optional one-word clue.
- Real shared rooms, server-controlled timing, reconnects, host migration, private clues and private style cards.
- Connected story prose, optional theme narrators using device voices, original theme music, cartoon reaction sounds, and swipe-to-fold graphics.
- Shared TV display, collective awards, a story gallery, and text/PNG exports.
- Unicode input, keyboard controls, light/dark themes, and reduced-motion support.

## Run locally

You need Node.js **22.13+** and npm.

```sh
git clone https://github.com/lebedeval2208-svg/unfold.git
cd unfold
npm ci
npm run build
npm run db:setup
npm run dev
```

Open the URL printed by the development server. `db:setup` creates the local room table; it does not change the live database. Run that setup once per fresh local database.

```sh
npm test
npm run typecheck
```

The 17 tests cover story rotation for 4/8 players, privacy, timing, duplicate requests, host permissions, voting, Unicode, connected prose, exports, and audio behavior. A complete four-session round was also verified against the hosted service.

## Hosting and deployment

The live URL above is already launched and publicly accessible. Each game still requires its room code.

This is a **full-stack Cloudflare Worker/D1 application**, built with Vinext and React. GitHub Pages alone cannot run its online rooms.

The current deployment is managed through Sites. This GitHub repository is the source repository for sharing and development; pushing here does **not** automatically redeploy the live Site. To update that deployment, use the Sites workflow with the existing Site's identity and its authorized source publication process. To launch a separate copy, create a new Site, keep the `DB` binding, and apply the included Drizzle migration through that deployment workflow.

The public checkout deliberately omits the existing Site's project ID. No service credentials or player/session data are included. The game requires no AI API key. Speech quality depends on voices available on the device.

For another hosting provider, supply a compatible Worker runtime and D1 database, or port the room API/storage layer first. Do not deploy only the static client and expect shared online play.

## Project structure

- `app/page.tsx` and `app/globals.css` — game screens and visuals.
- `app/api/room/route.ts` — permission-filtered room API and atomic persistence.
- `lib/game.js` — shared assignment rules and state machine.
- `lib/packs.js` — prompts, examples, sparks, and fallback content.
- `lib/narrative.js` — connective prose and narrator profiles.
- `lib/party-audio.js` — original procedural music and sound effects.
- `lib/export.js` — exact-text story exports.
- `db/` and `drizzle/` — database schema and migration.
- `tests/` — rule, audio, and live-service checks.

[Architecture, operation, and verification notes](docs/architecture-and-verification.md)

## Inspiration

Inspired by the folded-paper game the creator grew up playing with her family in Ukraine: each person adds a little, nobody sees the whole, and the reveal belongs to everyone.
