class Button {
  constructor(x, y, w, h, label) {
    this.x = x; this.y = y; this.w = w; this.h = h; this.label = label;
  }

  hitTest(mx, my) {
    return mx >= this.x && mx <= this.x + this.w && my >= this.y && my <= this.y + this.h;
  }

  draw(ctx, hovered) {
    ctx.save();
    const r = 10;
    ctx.beginPath();
    ctx.moveTo(this.x + r, this.y);
    ctx.arcTo(this.x + this.w, this.y, this.x + this.w, this.y + this.h, r);
    ctx.arcTo(this.x + this.w, this.y + this.h, this.x, this.y + this.h, r);
    ctx.arcTo(this.x, this.y + this.h, this.x, this.y, r);
    ctx.arcTo(this.x, this.y, this.x + this.w, this.y, r);
    ctx.closePath();
    ctx.fillStyle = hovered ? '#8a2727' : '#5c1717';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#d4af37';
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.label, this.x + this.w / 2, this.y + this.h / 2 + 1);
    ctx.restore();
  }
}

// Layout centered within the canvas (CANVAS_W from level.js): title -> button -> "Prepared By" -> logo.
const playButton = new Button(CANVAS_W / 2 - 100, 175, 200, 56, 'PLAY GAME');
const PAIR_BUTTON_LEFT_X = CANVAS_W / 2 - 220;
const PAIR_BUTTON_RIGHT_X = CANVAS_W / 2 + 30;
const victoryPlayAgainButton = new Button(PAIR_BUTTON_LEFT_X, 340, 190, 52, 'Play Again');
const victoryMenuButton = new Button(PAIR_BUTTON_RIGHT_X, 340, 190, 52, 'Main Menu');
const gameoverRetryButton = new Button(PAIR_BUTTON_LEFT_X, 340, 190, 52, 'Retry');
const gameoverMenuButton = new Button(PAIR_BUTTON_RIGHT_X, 340, 190, 52, 'Main Menu');

function drawTextOutlined(ctx, text, x, y, font, fillStyle, strokeStyle, lineWidth) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = strokeStyle;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fillStyle;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawScreenBackground(ctx) {
  const bg = IMAGES.castleBackground;
  if (bg && bg.complete && bg.naturalWidth > 0) {
    const scale = Math.max(CANVAS_W / bg.naturalWidth, CANVAS_H / bg.naturalHeight);
    const dw = bg.naturalWidth * scale, dh = bg.naturalHeight * scale;
    ctx.drawImage(bg, (CANVAS_W - dw) / 2, (CANVAS_H - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = '#0a0a10';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
  ctx.save();
  ctx.fillStyle = 'rgba(5,5,10,0.55)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.restore();
  drawParticles(ctx);
}

function drawMenuScreen(ctx, mouse) {
  drawScreenBackground(ctx);
  drawTextOutlined(ctx, 'ITeC UNITAS Fair', CANVAS_W / 2, 110, 'bold 50px Georgia, "Times New Roman", serif', '#f1d27a', '#000', 6);
  playButton.draw(ctx, playButton.hitTest(mouse.x, mouse.y));

  ctx.save();
  ctx.fillStyle = '#e8e8e8';
  ctx.font = '22px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Prepared By', CANVAS_W / 2, 310);
  ctx.restore();

  const logo = IMAGES.itecLogo;
  if (logo && logo.complete && logo.naturalWidth > 0) {
    const size = 100;
    ctx.drawImage(logo, CANVAS_W / 2 - size / 2, 330, size, size);
  }
}

function drawVictoryScreen(ctx, mouse) {
  drawScreenBackground(ctx);
  drawTextOutlined(ctx, 'VICTORY!', CANVAS_W / 2, 220, 'bold 56px Georgia, serif', '#f1d27a', '#000', 6);
  victoryPlayAgainButton.draw(ctx, victoryPlayAgainButton.hitTest(mouse.x, mouse.y));
  victoryMenuButton.draw(ctx, victoryMenuButton.hitTest(mouse.x, mouse.y));
}

function drawGameOverScreen(ctx, mouse) {
  drawScreenBackground(ctx);
  drawTextOutlined(ctx, 'GAME OVER', CANVAS_W / 2, 220, 'bold 56px Georgia, serif', '#e74c3c', '#000', 6);
  gameoverRetryButton.draw(ctx, gameoverRetryButton.hitTest(mouse.x, mouse.y));
  gameoverMenuButton.draw(ctx, gameoverMenuButton.hitTest(mouse.x, mouse.y));
}

function drawBar(ctx, x, y, w, h, ratio, label, fillColor) {
  ratio = Math.max(0, Math.min(1, ratio));
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fillColor;
  ctx.fillRect(x + 2, y + 2, (w - 4) * ratio, h - 4);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#d4af37';
  ctx.strokeRect(x, y, w, h);
  ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(label, x + w / 2, y + h / 2 + 1);
  ctx.fillStyle = '#fff';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

function drawPotionIcon(ctx, x, y, filled) {
  ctx.save();
  ctx.globalAlpha = filled ? 1 : 0.25;
  ctx.fillStyle = '#555';
  ctx.fillRect(x + 6, y, 6, 5);
  ctx.fillStyle = '#2e2e2e';
  ctx.fillRect(x + 2, y + 5, 14, 13);
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(x + 3, y + 9, 12, 8);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 2, y + 5, 14, 13);
  ctx.restore();
}

function drawHUD(ctx, player, dragon) {
  drawBar(ctx, 20, 20, 250, 24, player.hp / MAX_HP, `HP ${Math.ceil(Math.max(0, player.hp))}/${MAX_HP}`, '#c0392b');
  drawBar(ctx, CANVAS_W - 270, 20, 250, 24, dragon.hp / DRAGON_MAX_HP, `DRAGON ${Math.ceil(Math.max(0, dragon.hp))}/${DRAGON_MAX_HP}`, '#8e44ad');
  for (let i = 0; i < 3; i++) {
    drawPotionIcon(ctx, 20 + i * 26, 52, i < player.potions);
  }
}
