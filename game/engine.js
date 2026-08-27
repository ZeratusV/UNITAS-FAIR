import { IMAGE_MANIFEST, loadImages, rectsOverlap, rollDamage } from './assets';
import { initInput, consumePressed, clearFramePressed } from './input';
import { CANVAS_W, CANVAS_H, GROUND_TOP, drawLevel } from './level';
import { initParticles, updateParticles } from './particles';
import { Player } from './player';
import { FlyingDemon, HellHound } from './monsters';
import { Dragon } from './dragon';
import {
  drawMenuScreen, drawVictoryScreen, drawGameOverScreen, drawHUD,
  playButton, victoryPlayAgainButton, victoryMenuButton, gameoverRetryButton, gameoverMenuButton,
} from './ui';

// Starts the game on the given <canvas> element and returns a cleanup
// function that stops the loop and removes every listener it attached -
// called from GameCanvas's useEffect so React (including StrictMode's
// mount/unmount/remount in dev) can start and tear this down cleanly.
export function startGame(canvas) {
  const ctx = canvas.getContext('2d');

  let gameState = 'LOADING'; // LOADING | MENU | PLAYING | VICTORY | GAME_OVER
  let player, dragon, monsters;
  const mouse = { x: -1, y: -1 };
  let nextSpawnFromLeft = true;
  let running = true;
  let rafId = null;
  let lastTime = 0;

  // Backing-store resolution is sized to actual device pixels (not just the
  // logical canvas stretched via CSS), so text renders crisp. A
  // ctx.scale() maps our logical CANVAS_W x CANVAS_H coordinate system onto
  // it. Sprites still look like clean pixel art because
  // imageSmoothingEnabled stays off - they just don't get a second,
  // blurrier CSS-level upscale on top.
  function resize() {
    const scale = Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H);
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = CANVAS_W * scale;
    const displayHeight = CANVAS_H * scale;
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    canvas.width = Math.round(displayWidth * dpr);
    canvas.height = Math.round(displayHeight * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale((displayWidth * dpr) / CANVAS_W, (displayHeight * dpr) / CANVAS_H);
    ctx.imageSmoothingEnabled = false;
  }

  function canvasCoordsFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (CANVAS_W / rect.width),
      y: (e.clientY - rect.top) * (CANVAS_H / rect.height),
    };
  }

  function onMouseMove(e) {
    const p = canvasCoordsFromEvent(e);
    mouse.x = p.x;
    mouse.y = p.y;
  }

  function onClick(e) {
    const p = canvasCoordsFromEvent(e);
    handleClick(p.x, p.y);
  }

  // Left click = attack, right click = drink a potion (in addition to the J/F and H keys).
  function onContextMenu(e) {
    e.preventDefault();
    if (gameState === 'PLAYING' && player) player.usePotion();
  }

  function handleClick(x, y) {
    if (gameState === 'PLAYING') {
      if (player) player.startAttack();
      return;
    }
    if (gameState === 'MENU') {
      if (playButton.hitTest(x, y)) startRun();
    } else if (gameState === 'VICTORY') {
      if (victoryPlayAgainButton.hitTest(x, y)) startRun();
      else if (victoryMenuButton.hitTest(x, y)) gameState = 'MENU';
    } else if (gameState === 'GAME_OVER') {
      if (gameoverRetryButton.hitTest(x, y)) startRun();
      else if (gameoverMenuButton.hitTest(x, y)) gameState = 'MENU';
    }
  }

  function startRun() {
    player = new Player(100, GROUND_TOP);
    dragon = new Dragon();
    monsters = [];
    nextSpawnFromLeft = true;
    gameState = 'PLAYING';
  }

  function spawnMonsterRandom() {
    const activeCount = monsters.filter(m => !m.dying).length;
    if (activeCount >= 2) return;
    const fromLeft = nextSpawnFromLeft;
    nextSpawnFromLeft = !nextSpawnFromLeft;
    monsters.push(Math.random() < 0.5 ? new FlyingDemon(fromLeft) : new HellHound(fromLeft));
  }

  function updatePlaying(dt) {
    player.update(dt);
    dragon.update(dt, player, spawnMonsterRandom);
    monsters.forEach(m => m.update(dt, player));
    monsters = monsters.filter(m => m.alive);

    const hb = player.attackHitbox;
    if (hb) {
      if (dragon.hp > 0 && !player.attackHitTargets.has(dragon) && rectsOverlap(hb, dragon.hurtbox)) {
        dragon.takeDamage(rollDamage(), player.x);
        player.attackHitTargets.add(dragon);
      }
      monsters.forEach(m => {
        if (!m.dying && !player.attackHitTargets.has(m) && rectsOverlap(hb, m.hitbox)) {
          m.takeDamage(rollDamage());
          player.attackHitTargets.add(m);
        }
      });
    }

    if (dragon.hp <= 0) gameState = 'VICTORY';
    else if (player.hp <= 0) gameState = 'GAME_OVER';
  }

  function update(dt) {
    updateParticles(dt);

    if (gameState === 'PLAYING') {
      updatePlaying(dt);
      return;
    }
    if (consumePressed('Enter') || consumePressed('Space')) {
      if (gameState === 'MENU' || gameState === 'VICTORY' || gameState === 'GAME_OVER') startRun();
    }
  }

  function render() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    if (gameState === 'MENU') {
      drawMenuScreen(ctx, mouse);
    } else if (gameState === 'PLAYING') {
      drawLevel(ctx);
      monsters.forEach(m => m.draw(ctx));
      dragon.draw(ctx);
      player.draw(ctx);
      drawHUD(ctx, player, dragon);
    } else if (gameState === 'VICTORY') {
      drawVictoryScreen(ctx, mouse);
    } else if (gameState === 'GAME_OVER') {
      drawGameOverScreen(ctx, mouse);
    } else {
      ctx.fillStyle = '#0a0a10';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#fff';
      ctx.font = '24px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Loading...', CANVAS_W / 2, CANVAS_H / 2);
    }
  }

  function loop(ts) {
    if (!running) return;
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    update(dt);
    render();
    clearFramePressed();
    rafId = requestAnimationFrame(loop);
  }

  const removeInputListeners = initInput();
  window.addEventListener('resize', resize);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('contextmenu', onContextMenu);

  initParticles();
  resize();
  render();
  loadImages(IMAGE_MANIFEST, () => {
    if (!running) return;
    gameState = 'MENU';
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
  });

  return function cleanup() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    removeInputListeners();
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('click', onClick);
    canvas.removeEventListener('contextmenu', onContextMenu);
  };
}
