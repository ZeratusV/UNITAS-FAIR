import { IMAGES } from './assets';
import { drawParticles } from './particles';

export const CANVAS_W = 1280;
export const CANVAS_H = 540;
export const SCALE = 2;
export const GROUND_TOP = 412; // tuned layout: jump height / platform reachability / dragon hurtbox overlap all line up against this value

// Source rects sampled directly from platformer-tileset.png (exact bounding
// boxes found via connected-component analysis on the sheet).
export const TILE_SRC = { sx: 224, sy: 64, sw: 32, sh: 32 }; // tan dirt/grass ground block
export const PLATFORM_SRC = { sx: 304, sy: 64, sw: 32, sh: 32 }; // maroon block, deliberately different from the ground so platforms read as distinct

export const PLATFORMS = [
  { x: 160, width: 192, top: 300 }, // Platform A, near player spawn
  { x: 520, width: 160, top: 340 }, // Platform C, a mid-arena stepping stone across the wider gap
  { x: 900, width: 192, top: 280 }, // Platform B, near the dragon's usual patrol range, primary fire-dodge spot
];

export function drawLevel(ctx) {
  const bg = IMAGES.castleBackground;
  if (bg && bg.complete && bg.naturalWidth > 0) {
    const scale = Math.max(CANVAS_W / bg.naturalWidth, CANVAS_H / bg.naturalHeight);
    const dw = bg.naturalWidth * scale;
    const dh = bg.naturalHeight * scale;
    ctx.drawImage(bg, (CANVAS_W - dw) / 2, (CANVAS_H - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = '#141018';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  drawParticles(ctx);

  const ts = IMAGES.platformerTileset;
  if (!ts || !ts.complete || ts.naturalWidth === 0) return;

  const tileW = TILE_SRC.sw * SCALE;
  const tileH = TILE_SRC.sh * SCALE;
  // Ground band runs from GROUND_TOP to the bottom of the canvas, so stack
  // enough rows of the (now smaller) 32px source tile to fully cover it.
  for (let y = GROUND_TOP; y < CANVAS_H; y += tileH) {
    for (let x = 0; x < CANVAS_W; x += tileW) {
      ctx.drawImage(ts, TILE_SRC.sx, TILE_SRC.sy, TILE_SRC.sw, TILE_SRC.sh, x, y, tileW, tileH);
    }
  }

  const chunkW = PLATFORM_SRC.sw * SCALE;
  const chunkH = PLATFORM_SRC.sh * SCALE;
  PLATFORMS.forEach(p => {
    const count = Math.round(p.width / chunkW);
    for (let i = 0; i < count; i++) {
      ctx.drawImage(ts, PLATFORM_SRC.sx, PLATFORM_SRC.sy, PLATFORM_SRC.sw, PLATFORM_SRC.sh, p.x + i * chunkW, p.top, chunkW, chunkH);
    }
  });
}
