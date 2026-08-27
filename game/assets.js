export const IMAGES = {};

export const IMAGE_MANIFEST = {
  playerIdle: '/assets/player/idle.png',
  playerRun: '/assets/player/run.png',
  playerJump: '/assets/player/jump.png',
  playerSwordSlash: '/assets/player/sword-slash.png',
  playerHurt: '/assets/player/hurt.png',
  dragonIdle: '/assets/dragon/idle.png',
  dragonBreath: '/assets/dragon/breath.png',
  flyingDemon: '/assets/flying-demon/spritesheet.png',
  hellHoundWalk: '/assets/hell-hound/walk.png',
  castleBackground: '/assets/tileset/castle-background.png',
  platformerTileset: '/assets/tileset/platformer-tileset.png',
  itecLogo: '/assets/ui/itec-logo.png',
};

// Frame dimensions verified against the actual spritesheet files (see CLAUDE.md).
export const ANIMS = {
  playerIdle: { frameW: 128, frameH: 96, frameCount: 4, frameDuration: 120, loop: true },
  playerRun: { frameW: 128, frameH: 96, frameCount: 12, frameDuration: 80, loop: true },
  playerJump: { frameW: 128, frameH: 96, frameCount: 4, frameDuration: 100, loop: false },
  playerSwordSlash: { frameW: 128, frameH: 96, frameCount: 6, frameDuration: 70, loop: false },
  playerHurt: { frameW: 128, frameH: 96, frameCount: 3, frameDuration: 100, loop: false },
  dragonIdle: { frameW: 160, frameH: 144, frameCount: 6, frameDuration: 130, loop: true },
  dragonBreath: { frameW: 312, frameH: 220, frameCount: 18, frameDuration: 100, loop: false },
  flyingDemon: { frameW: 48, frameH: 48, frameCount: 8, frameDuration: 100, loop: true },
  hellHoundWalk: { frameW: 64, frameH: 48, frameCount: 12, frameDuration: 90, loop: true },
};

export class Anim {
  constructor(def) {
    this.def = def;
    this.frameIndex = 0;
    this.elapsed = 0;
    this.done = false;
  }
  reset() {
    this.frameIndex = 0;
    this.elapsed = 0;
    this.done = false;
  }
  update(dt) {
    if (this.done) return;
    this.elapsed += dt * 1000;
    while (this.elapsed >= this.def.frameDuration) {
      this.elapsed -= this.def.frameDuration;
      if (this.frameIndex < this.def.frameCount - 1) {
        this.frameIndex++;
      } else if (this.def.loop) {
        this.frameIndex = 0;
      } else {
        this.done = true;
        break;
      }
    }
  }
}

export function drawFrame(ctx, img, frameIndex, frameW, frameH, dx, dy, dw, dh, flipX) {
  if (!img || !img.complete || img.naturalWidth === 0) return;
  if (flipX) {
    ctx.save();
    ctx.translate(dx + dw, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(img, frameIndex * frameW, 0, frameW, frameH, 0, 0, dw, dh);
    ctx.restore();
  } else {
    ctx.drawImage(img, frameIndex * frameW, 0, frameW, frameH, dx, dy, dw, dh);
  }
}

// Draws a sprite frame with an optional white "hit flash" tinted through an
// offscreen buffer, so the flash respects the sprite's own alpha silhouette
// instead of bleeding into whatever's already drawn behind it on the canvas.
// Created lazily (not at module top-level) since document isn't available
// during server-side module evaluation in Next.js.
let _flashCanvas = null;
let _flashCtx = null;
function getFlashCtx() {
  if (!_flashCanvas) {
    _flashCanvas = document.createElement('canvas');
    _flashCtx = _flashCanvas.getContext('2d');
  }
  return _flashCtx;
}

export function drawFrameWithFlash(ctx, img, frameIndex, frameW, frameH, dx, dy, dw, dh, flipX, flashAlpha) {
  if (!flashAlpha || flashAlpha <= 0) {
    drawFrame(ctx, img, frameIndex, frameW, frameH, dx, dy, dw, dh, flipX);
    return;
  }
  if (!img || !img.complete || img.naturalWidth === 0) return;
  const flashCtx = getFlashCtx();
  _flashCanvas.width = dw;
  _flashCanvas.height = dh;
  flashCtx.clearRect(0, 0, dw, dh);
  flashCtx.save();
  if (flipX) {
    flashCtx.translate(dw, 0);
    flashCtx.scale(-1, 1);
  }
  flashCtx.drawImage(img, frameIndex * frameW, 0, frameW, frameH, 0, 0, dw, dh);
  flashCtx.restore();
  flashCtx.globalCompositeOperation = 'source-atop';
  flashCtx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
  flashCtx.fillRect(0, 0, dw, dh);
  flashCtx.globalCompositeOperation = 'source-over';
  ctx.drawImage(_flashCanvas, dx, dy);
}

export function loadImages(manifest, onDone) {
  const keys = Object.keys(manifest);
  let loaded = 0;
  keys.forEach(key => {
    const img = new Image();
    img.onload = img.onerror = () => {
      loaded++;
      if (loaded === keys.length) onDone();
    };
    img.src = manifest[key];
    IMAGES[key] = img;
  });
}

export function rollDamage() {
  return 10 + Math.floor(Math.random() * 11); // 10-20 inclusive
}

export function randRange(min, max) {
  return min + Math.random() * (max - min);
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
