import { Anim, ANIMS, IMAGES, drawFrame, randRange, rectsOverlap } from './assets';
import { CANVAS_W, GROUND_TOP, SCALE } from './level';

const MONSTER_MAX_HP = 20;
const MONSTER_CONTACT_DAMAGE_MIN = 5;
const MONSTER_CONTACT_COOLDOWN = 700;
const MONSTER_DEATH_FADE_MS = 200;
const MONSTER_KNOCKBACK_SPEED = 420;
const MONSTER_KNOCKBACK_DURATION = 450; // ms - pushed away from the player after landing a hit, so it can't just sit clipped into them and the player gets a real window to land a counter-hit

function monsterContactDamage() {
  return MONSTER_CONTACT_DAMAGE_MIN + Math.floor(Math.random() * 6); // 5-10
}

export class FlyingDemon {
  constructor(spawnFromLeft) {
    this.x = spawnFromLeft ? -40 : CANVAS_W + 40;
    this.y = randRange(80, 150);
    this.hp = MONSTER_MAX_HP;
    this.anim = new Anim(ANIMS.flyingDemon);
    this.alive = true;
    this.dying = false;
    this.dyingTimer = 0;
    this.contactCooldown = 0;
    this.facing = 1;
    this.knockbackTimer = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
  }

  get hitbox() {
    return { x: this.x - 16, y: this.y - 16, w: 32, h: 32 };
  }

  takeDamage(amount) {
    if (this.dying) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.dying = true;
      this.dyingTimer = 0;
    }
  }

  update(dt, player) {
    if (this.dying) {
      this.dyingTimer += dt * 1000;
      if (this.dyingTimer >= MONSTER_DEATH_FADE_MS) this.alive = false;
      return;
    }

    if (this.knockbackTimer > 0) {
      this.knockbackTimer -= dt * 1000;
      this.x += this.knockbackVx * dt;
      this.y += this.knockbackVy * dt;
      this.anim.update(dt);
      return;
    }

    const dx = player.x - this.x;
    const dy = (player.y - 40) - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = 130;
    this.x += (dx / dist) * speed * dt;
    this.y += (dy / dist) * speed * dt;
    this.facing = dx >= 0 ? 1 : -1;
    this.anim.update(dt);

    if (this.contactCooldown > 0) this.contactCooldown -= dt * 1000;
    if (this.contactCooldown <= 0 && rectsOverlap(this.hitbox, player.hitbox)) {
      if (player.takeDamage(monsterContactDamage())) {
        this.contactCooldown = MONSTER_CONTACT_COOLDOWN;
        this.knockbackTimer = MONSTER_KNOCKBACK_DURATION;
        this.knockbackVx = -(dx / dist) * MONSTER_KNOCKBACK_SPEED;
        this.knockbackVy = -(dy / dist) * MONSTER_KNOCKBACK_SPEED - 40;
      }
    }
  }

  draw(ctx) {
    const def = ANIMS.flyingDemon;
    const dw = def.frameW * SCALE, dh = def.frameH * SCALE;
    const dx = this.x - dw / 2, dy = this.y - dh / 2;
    ctx.save();
    if (this.dying) ctx.globalAlpha = Math.max(0, 1 - this.dyingTimer / MONSTER_DEATH_FADE_MS);
    drawFrame(ctx, IMAGES.flyingDemon, this.anim.frameIndex, def.frameW, def.frameH, dx, dy, dw, dh, this.facing === -1);
    ctx.restore();
  }
}

export class HellHound {
  constructor(spawnFromLeft) {
    this.x = spawnFromLeft ? -40 : CANVAS_W + 40;
    this.y = GROUND_TOP;
    this.hp = MONSTER_MAX_HP;
    this.anim = new Anim(ANIMS.hellHoundWalk);
    this.alive = true;
    this.dying = false;
    this.dyingTimer = 0;
    this.contactCooldown = 0;
    this.facing = 1;
    this.knockbackTimer = 0;
    this.knockbackVx = 0;
  }

  get hitbox() {
    return { x: this.x - 22, y: this.y - 24, w: 44, h: 24 };
  }

  takeDamage(amount) {
    if (this.dying) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.dying = true;
      this.dyingTimer = 0;
    }
  }

  update(dt, player) {
    if (this.dying) {
      this.dyingTimer += dt * 1000;
      if (this.dyingTimer >= MONSTER_DEATH_FADE_MS) this.alive = false;
      return;
    }

    if (this.knockbackTimer > 0) {
      this.knockbackTimer -= dt * 1000;
      this.x += this.knockbackVx * dt;
      this.anim.update(dt);
      return;
    }

    const dx = player.x - this.x;
    const dir = dx >= 0 ? 1 : -1;
    this.facing = dir;
    this.x += dir * 200 * dt;
    this.anim.update(dt);

    if (this.contactCooldown > 0) this.contactCooldown -= dt * 1000;
    if (this.contactCooldown <= 0 && rectsOverlap(this.hitbox, player.hitbox)) {
      if (player.takeDamage(monsterContactDamage())) {
        this.contactCooldown = MONSTER_CONTACT_COOLDOWN;
        this.knockbackTimer = MONSTER_KNOCKBACK_DURATION;
        this.knockbackVx = -dir * MONSTER_KNOCKBACK_SPEED;
      }
    }
  }

  draw(ctx) {
    const def = ANIMS.hellHoundWalk;
    const dw = def.frameW * SCALE, dh = def.frameH * SCALE;
    const dx = this.x - dw / 2, dy = this.y - dh;
    ctx.save();
    if (this.dying) ctx.globalAlpha = Math.max(0, 1 - this.dyingTimer / MONSTER_DEATH_FADE_MS);
    // hell-hound-walk.png faces left by default (opposite of the player sprite),
    // so the flip condition is inverted relative to FlyingDemon's.
    drawFrame(ctx, IMAGES.hellHoundWalk, this.anim.frameIndex, def.frameW, def.frameH, dx, dy, dw, dh, this.facing === 1);
    ctx.restore();
  }
}
