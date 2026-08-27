# UNITAS FAIR — Dragon Duel

This repo holds **Dragon Duel**, a browser-based 2D platformer boss fight built for the ITeC UNITAS Fair. The player (a sword-wielding knight) fights a hovering, fire-breathing dragon across a multi-platform arena.

## Where the game lives

Everything runs from [`dragon-duel/`](dragon-duel/). It's a zero-dependency static site — plain HTML5 Canvas + vanilla JS, no build step, no npm packages, no framework.

```
dragon-duel/
  index.html          entry point — open directly, or serve the folder
  style.css
  js/
    assets.js         image manifest, sprite-sheet frame metadata, Anim class, drawFrame helpers
    input.js           keyboard state tracking ("just pressed" semantics)
    level.js             canvas size, tile source rects, platform layout, drawLevel()
    particles.js           ambient background embers/sparks (decorative only)
    player.js                Player class: physics, animation, sword attack, potions
    monsters.js                FlyingDemon + HellHound (dragon-summoned adds)
    dragon.js                    Dragon class: AI state machine, fire breath, teleport-on-hit
    ui.js                          Button helper, HUD, menu/victory/game-over screens
    main.js                          canvas setup, resize, game state machine, RAF loop
  assets/images/       sprites/tiles copied out of the Legacy Collection pack (see below)
```

Script tags load in that dependency order in `index.html` — deliberately **not** ES modules, since `import`/`export` is blocked by CORS under `file://` with no visible error, which is exactly how this is meant to be opened (double-click `index.html`).

## Running it

Just open `dragon-duel/index.html` in a browser. If you want to serve it instead (equivalent, occasionally better for dev tools):

```
cd dragon-duel
python -m http.server 8877
```

There's no test suite — this project is verified by hand (or by driving a headless browser and screenshotting) rather than automated tests.

## Game state machine

`main.js` drives a single `gameState`: `MENU → PLAYING → VICTORY | GAME_OVER`, each with its own `update()`/`render()` dispatch inside one `requestAnimationFrame` loop. Canvas logical resolution is `CANVAS_W × CANVAS_H` (1280×540, defined in `level.js`), CSS-scaled to fit the window and backed by a device-pixel-ratio-matched backing store (see `resize()` in `main.js`) so text stays crisp while `imageSmoothingEnabled = false` keeps sprites looking like clean pixel art.

## Combat rules (as specified for the fair)

- Player: 50 HP, sword swing deals 10–20 damage (random), 3 potions healing 20 HP each.
- Dragon: 100 HP, contact/fire-breath damage is 10–20 (random). It's a stationary-but-mobile flyer — hovers with a wing-flap idle, patrols left/right within `DRAGON_MIN_X`–`DRAGON_MAX_X` while `IDLE`, and **teleports to a new spot in that range every time the player lands a hit** (`Dragon.startTeleport()`), so the fight can't be turtled from one spot.
- Dragon abilities cycle through a state machine (`IDLE → FIRE_TELEGRAPH → FIRE_ACTIVE → RECOVER` or `IDLE → SUMMON → IDLE`) so only one telegraphed action happens at a time. Fire breath is drawn at an enlarged scale (`DRAGON_BREATH_SCALE`) so the flame art itself communicates the danger zone, rather than a debug-looking rectangle.
- Summoned monsters (`FlyingDemon`, `HellHound`) alternate spawn side (left/right) via `nextSpawnFromLeft` in `main.js`, and get knocked back after landing a hit on the player so they don't just sit clipped into the player's hitbox.

## Controls

Keyboard: `A`/`D` or arrow keys to move, `W`/`↑`/`Space` to jump, `J` or `F` to attack, `H` to drink a potion, `Enter`/`Space` to confirm menus.
Mouse: left click to attack, right click to drink a potion (canvas `contextmenu` is suppressed during play).

## Assets

Sprites and tiles in `dragon-duel/assets/images/` are copied (and in a couple of cases, recombined into a clean spritesheet via a one-off Pillow script) out of the **Legacy Collection** asset pack, which is *not* checked into this repo — see `.gitignore`. It's a large (2000+ file) purchased/licensed third-party pack; only the specific frames Dragon Duel actually uses were copied out, under clean filenames, into `dragon-duel/assets/`. If you need to re-derive or re-slice a sprite, the original pack lives locally at `Legacy Collection/Legacy Collection/Assets/Gothicvania/...` (not present in this repo) — the specific source paths and frame dimensions used are documented as comments near each `ANIMS`/tile-source-rect definition in `assets.js`, `level.js`, and `dragon.js`.

The ITeC logo (`ITeC Picture/iteclogowhite (1).png`, duplicated into `dragon-duel/assets/images/ui/itec-logo.png`) is used on the main menu under "Prepared By".

## Notes for future changes

- Canvas size, tile-source rects, and platform layout are all in `level.js` — if you resize the arena, check `DRAGON_MIN_X`/`MAX_X` in `dragon.js` and the platform positions still make sense together (the dragon's patrol range is deliberately reachable from the platform nearest it).
- `GROUND_TOP` (412) and the platform `top` values were tuned against the player's jump physics (`GRAVITY`, `JUMP_VELOCITY` in `player.js`) so that jumping clears both platforms with a small margin, and so a jump-attack from ground level can just barely reach the hovering dragon's hurtbox. Changing one without checking the other will likely break reachability.
- There's no bundler — new sprites go in `assets/images/<thing>/`, get an entry in `IMAGE_MANIFEST` (`assets.js`), and (if animated) a matching `ANIMS` frame definition.
