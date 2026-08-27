const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let gameState = 'LOADING'; // LOADING | MENU | PLAYING | VICTORY | GAME_OVER
let player, dragon, monsters;
const mouse = { x: -1, y: -1 };

// Backing-store resolution is sized to actual device pixels (not just the
// 960x540 logical canvas stretched via CSS), so text renders crisp. A
// ctx.scale() maps our logical 960x540 coordinate system onto it. Sprites
// still look like clean pixel art because imageSmoothingEnabled stays off -
// they just no longer get a second, blurrier CSS-level upscale on top.
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
window.addEventListener('resize', resize);

function canvasCoordsFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (CANVAS_W / rect.width),
    y: (e.clientY - rect.top) * (CANVAS_H / rect.height),
  };
}

canvas.addEventListener('mousemove', e => {
  const p = canvasCoordsFromEvent(e);
  mouse.x = p.x;
  mouse.y = p.y;
});

canvas.addEventListener('click', e => {
  const p = canvasCoordsFromEvent(e);
  handleClick(p.x, p.y);
});

// Left click = attack, right click = drink a potion (in addition to the J/F and H keys).
canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  if (gameState === 'PLAYING' && player) player.usePotion();
});

function handleClick(x, y) {
  if (gameState === 'PLAYING') {
    if (player) player.startAttack();
    return;
  }
  if (gameState === 'MENU') {
    if (playButton.hitTest(x, y)) startGame();
  } else if (gameState === 'VICTORY') {
    if (victoryPlayAgainButton.hitTest(x, y)) startGame();
    else if (victoryMenuButton.hitTest(x, y)) gameState = 'MENU';
  } else if (gameState === 'GAME_OVER') {
    if (gameoverRetryButton.hitTest(x, y)) startGame();
    else if (gameoverMenuButton.hitTest(x, y)) gameState = 'MENU';
  }
}

function startGame() {
  player = new Player(100, GROUND_TOP);
  dragon = new Dragon();
  monsters = [];
  nextSpawnFromLeft = true;
  gameState = 'PLAYING';
}

let nextSpawnFromLeft = true;

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
    if (gameState === 'MENU' || gameState === 'VICTORY' || gameState === 'GAME_OVER') startGame();
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

let lastTime = 0;
function loop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  render();
  clearFramePressed();
  requestAnimationFrame(loop);
}

resize();
render();
loadImages(IMAGE_MANIFEST, () => {
  gameState = 'MENU';
  lastTime = performance.now();
  requestAnimationFrame(loop);
});
