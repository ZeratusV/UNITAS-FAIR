# UNITAS FAIR — Dragon Duel

This repo holds **Dragon Duel**, a browser-based 2D platformer boss fight built for the ITeC UNITAS Fair. The player (a sword-wielding knight) fights a hovering, fire-breathing dragon across a multi-platform arena.

## Stack

Next.js (App Router, plain JavaScript, no TypeScript) with a single Client Component (`components/GameCanvas.js`) that mounts a `<canvas>` and hands it to a self-contained, framework-agnostic game engine in `game/`. The engine itself doesn't touch React at all — it's plain imperative Canvas 2D code (classes, a `requestAnimationFrame` loop), the same style as a vanilla JS game; React's only job is mounting the canvas and starting/stopping it via `useEffect`.

```
app/
  layout.js          html/body shell, global metadata, imports globals.css
  page.js             renders <GameCanvas />
  globals.css
components/
  GameCanvas.js       'use client' - canvas ref + useEffect(() => startGame(canvas))
game/
  assets.js           image manifest, sprite-sheet frame metadata, Anim class, drawFrame helpers
  input.js             keyboard state tracking ("just pressed" semantics), initInput() attaches listeners
  level.js               canvas size, tile source rects, platform layout, drawLevel()
  particles.js             ambient background embers/sparks (decorative only)
  player.js                  Player class: physics, animation, sword attack, potions
  monsters.js                  FlyingDemon + HellHound (dragon-summoned adds)
  dragon.js                      Dragon class: AI state machine, fire breath, teleport-on-hit
  ui.js                            Button helper, HUD, menu/victory/game-over screens
  engine.js                          startGame(canvas) -> cleanup: game state machine, RAF loop, all DOM listeners
public/assets/        sprites/tiles copied out of the Legacy Collection pack (see below)
```

`game/` files are plain ES modules (`export`/`import`), unlike the very first iteration of this project which was a zero-build static site using global `<script>` tags — that's gone now, replaced by this Next.js version end to end.

## Running it

```
npm install
npm run dev      # http://localhost:3000 (or next available port)
npm run build && npm run start   # production build/serve
```

No test suite — verified by hand, or by driving a headless browser (Playwright) and screenshotting/inspecting console output.

## Why the engine isn't React state

The game runs a physics/AI simulation at 60fps with lots of tiny mutable per-frame state (positions, timers, animation frames). Modeling that as React state/props would mean either re-rendering constantly or fighting the render model for no benefit — Canvas already owns its own pixels. So `game/engine.js` exports one function, `startGame(canvasElement)`, which does everything main.js used to do in the pre-Next.js version (resize handling, input listeners, the RAF loop, game state machine) and returns a `cleanup()` function. `GameCanvas.js` calls `startGame` in a `useEffect` and returns `cleanup` from that effect, so React (including StrictMode's dev-only mount→unmount→remount) starts and tears down the engine correctly with no duplicate loops or listeners.

Because of this, module-level top-level code in `game/*.js` must never depend on another module's export at *evaluation* time (only inside function/method bodies) — `level.js` and `particles.js` import each other, and `particles.js`'s array is populated lazily via `initParticles()` (called from `engine.js`) rather than at module-load time, specifically to avoid that hazard. Follow the same pattern for any new circular-ish dependency.

`input.js`'s `window.addEventListener` calls, and anything else DOM-touching, must live inside a function (`initInput()`, `startGame()`, etc.), never at module top level — Next.js evaluates modules on the server too, where `window`/`document` don't exist.

## Combat rules (as specified for the fair)

- Player: 50 HP, sword swing deals 10–20 damage (random), 3 potions healing 20 HP each.
- Dragon: 100 HP, contact/fire-breath damage is 10–20 (random). It's a flyer — hovers with a wing-flap idle, patrols left/right within `DRAGON_MIN_X`–`DRAGON_MAX_X` (`game/dragon.js`) while `IDLE`, and **teleports to whichever end of that range is farthest from the player** every time it's hit — the range spans almost the full arena width (220–1160 of a 1280-wide canvas) specifically so a teleport is a dramatic full-screen reposition, not a nearby hop.
- Dragon abilities cycle through a state machine (`IDLE → FIRE_TELEGRAPH → FIRE_ACTIVE → RECOVER` or `IDLE → SUMMON → IDLE`) so only one telegraphed action happens at a time. Fire breath is drawn at an enlarged scale (`DRAGON_BREATH_SCALE`) so the flame art itself communicates the danger zone, rather than a debug-looking rectangle; the AOE zone's x is clamped to stay on-screen regardless of where along its wide range the dragon currently is.
- Summoned monsters (`FlyingDemon`, `HellHound`) alternate spawn side (left/right) via `nextSpawnFromLeft` in `engine.js`, and get knocked back (~165px) after landing a hit on the player so they don't just sit clipped into the player's hitbox.

## Controls

Keyboard: `A`/`D` or arrow keys to move, `W`/`↑`/`Space` to jump, `J` or `F` to attack, `H` to drink a potion, `Enter`/`Space` to confirm menus.
Mouse: left click to attack, right click to drink a potion (canvas `contextmenu` is suppressed during play).

## Assets

Sprites and tiles in `public/assets/` are copied (and in a couple of cases, recombined into a clean spritesheet via a one-off Pillow script) out of the **Legacy Collection** asset pack, which is *not* checked into this repo — see `.gitignore`. It's a large (2000+ file) purchased/licensed third-party pack; only the specific frames Dragon Duel actually uses were copied out, under clean filenames. If you need to re-derive or re-slice a sprite, the original pack lives locally at `Legacy Collection/Legacy Collection/Assets/Gothicvania/...` (not present in this repo) — the specific source paths and frame dimensions used are documented as comments near each `ANIMS`/tile-source-rect definition in `assets.js`, `level.js`, and `dragon.js`.

The ITeC logo (`ITeC Picture/iteclogowhite (1).png`, duplicated into `public/assets/ui/itec-logo.png`) is used on the main menu under "Prepared By". `IMAGE_MANIFEST` paths in `game/assets.js` are root-absolute (`/assets/...`), matching how Next.js serves the `public/` folder.

## Notes for future changes

- Canvas size, tile-source rects, and platform layout are all in `level.js` — if you resize the arena, check `DRAGON_MIN_X`/`MAX_X` in `dragon.js` and the platform positions still make sense together (the dragon's range should stay reachable from at least one platform or a well-timed jump-attack from most positions in it).
- `GROUND_TOP` (412) and the platform `top` values were tuned against the player's jump physics (`GRAVITY`, `JUMP_VELOCITY` in `player.js`) so that jumping clears both platforms with a small margin, and so a jump-attack from ground level can just barely reach the hovering dragon's hurtbox. Changing one without checking the other will likely break reachability.
- No bundler config beyond Next's default — new sprites go in `public/assets/<thing>/`, get a root-absolute entry in `IMAGE_MANIFEST` (`game/assets.js`), and (if animated) a matching `ANIMS` frame definition.
- This project deploys to Vercel with zero configuration (no `vercel.json` needed) — it's a standard Next.js app at the repo root.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
