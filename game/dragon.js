import { Anim, ANIMS, IMAGES, drawFrameWithFlash, randRange, rollDamage, rectsOverlap } from './assets';
import { CANVAS_W } from './level';

export const DRAGON_MAX_HP = 100;
const DRAGON_SCALE = 1.3; // independent of the global tile/character SCALE - this sprite has a lot of padding
const DRAGON_BREATH_SCALE = 1.8; // breath frames drawn much bigger so the flame art itself reads as the danger zone
const DRAGON_BREATH_X_OFFSET = -27.5; // the demon's body sits off-center within the breath sheet's wider frame; this keeps it visually anchored vs the idle sprite

// Wide enough that a teleport can genuinely relocate the dragon from one
// side of the arena to the other (near Platform A on the left, to near the
// right edge) rather than just bouncing within a small local slice.
const DRAGON_MIN_X = 220;
const DRAGON_MAX_X = 1160;
const DRAGON_MIN_Y = 160;
const DRAGON_MAX_Y = 320;

const DRAGON_PATROL_SPEED = 150; // px/s, only moves while IDLE - bounces around in 2D (x and y), not just side to side
const DRAGON_HB_W = 110;
const DRAGON_HB_H = 110;
const DRAGON_CONTACT_COOLDOWN = 700;
const DRAGON_TELEPORT_DURATION = 240; // ms, blink-away triggered on every hit taken
const DRAGON_TELEPORT_MIN_DISTANCE = 150;
const DRAGON_TELEPORT_JITTER = 40; // px, avoids teleporting to the exact same spot every time
const AOE_ZONE_WIDTH = 500;

export class Dragon {
  constructor() {
    this.hp = DRAGON_MAX_HP;
    this.x = DRAGON_MAX_X - 60; // starts on the right side of the arena
    this.y = (DRAGON_MIN_Y + DRAGON_MAX_Y) / 2;
    this.state = 'IDLE';
    this.stateTimer = 0;
    this.idleDecisionTime = randRange(1200, 2200);
    this.fireCooldown = 0;
    this.summonCooldown = 0;
    this.contactCooldown = 0;
    this.flashTimer = 0;
    this.contactShakeTimer = 0;
    this.fireResolved = false;
    this.summonSpawned = false;
    this.vx = 0;
    this.vy = 0;
    this.randomizeDirection();
    this.aoeZone = null;
    this.teleportTimer = 0;
    this.teleportMoved = false;
    this.pendingX = this.x;
    this.pendingY = this.y;
    this.anims = { idle: new Anim(ANIMS.dragonIdle) };
  }

  get hurtbox() {
    return { x: this.x - DRAGON_HB_W / 2, y: this.y - DRAGON_HB_H / 2, w: DRAGON_HB_W, h: DRAGON_HB_H };
  }

  randomizeDirection() {
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * DRAGON_PATROL_SPEED;
    this.vy = Math.sin(angle) * DRAGON_PATROL_SPEED;
  }

  takeDamage(amount, playerX) {
    if (this.hp <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.flashTimer = 100;
    if (this.hp > 0) this.startTeleport(playerX);
  }

  startTeleport(playerX) {
    this.teleportTimer = DRAGON_TELEPORT_DURATION;
    this.teleportMoved = false;
    // Teleport to whichever end of the patrol range is farthest from the
    // player (a point-to-interval distance is always maximized at an
    // endpoint) - i.e. all the way across the arena, not just a nearby
    // spot - with a little jitter so it's not the exact same spot every
    // time. Falls back to the opposite end if that's too close to where
    // the dragon already is (e.g. it's already sitting at that end).
    const distToMin = Math.abs(DRAGON_MIN_X - playerX);
    const distToMax = Math.abs(DRAGON_MAX_X - playerX);
    let farEnd = distToMax >= distToMin ? DRAGON_MAX_X : DRAGON_MIN_X;
    let nx = farEnd + (Math.random() - 0.5) * 2 * DRAGON_TELEPORT_JITTER;
    if (Math.abs(nx - this.x) < DRAGON_TELEPORT_MIN_DISTANCE) {
      farEnd = farEnd === DRAGON_MAX_X ? DRAGON_MIN_X : DRAGON_MAX_X;
      nx = farEnd + (Math.random() - 0.5) * 2 * DRAGON_TELEPORT_JITTER;
    }
    nx = Math.max(DRAGON_MIN_X, Math.min(DRAGON_MAX_X, nx));
    this.pendingX = nx;
    this.pendingY = randRange(DRAGON_MIN_Y, DRAGON_MAX_Y);
  }

  enterIdle() {
    this.state = 'IDLE';
    this.stateTimer = 0;
    this.idleDecisionTime = randRange(1200, 2200);
    this.randomizeDirection();
  }

  decideAction() {
    const canFire = this.fireCooldown <= 0;
    const canSummon = this.summonCooldown <= 0;
    let choice = null;
    if (canFire && canSummon) choice = Math.random() < 0.5 ? 'FIRE' : 'SUMMON';
    else if (canFire) choice = 'FIRE';
    else if (canSummon) choice = 'SUMMON';

    if (choice === 'FIRE') {
      this.state = 'FIRE_TELEGRAPH';
      this.stateTimer = 0;
      this.fireResolved = false;
      // The breath animation always blows toward the left, so the zone
      // sits left of the dragon's current position - clamped to stay on
      // screen regardless of where in the (now much wider) range it is.
      const rawX = this.x - 620;
      this.aoeZone = { x: Math.max(0, Math.min(CANVAS_W - AOE_ZONE_WIDTH, rawX)), y: 350, w: AOE_ZONE_WIDTH, h: 190 };
    } else if (choice === 'SUMMON') {
      this.state = 'SUMMON';
      this.stateTimer = 0;
      this.summonSpawned = false;
    } else {
      this.enterIdle();
    }
  }

  update(dt, player, spawnMonster) {
    if (this.hp <= 0) return;
    const dtMs = dt * 1000;
    if (this.fireCooldown > 0) this.fireCooldown -= dtMs;
    if (this.summonCooldown > 0) this.summonCooldown -= dtMs;
    if (this.contactCooldown > 0) this.contactCooldown -= dtMs;
    if (this.flashTimer > 0) this.flashTimer -= dtMs;
    if (this.contactShakeTimer > 0) this.contactShakeTimer -= dtMs;

    if (this.teleportTimer > 0) {
      this.teleportTimer -= dtMs;
      if (!this.teleportMoved && this.teleportTimer <= DRAGON_TELEPORT_DURATION / 2) {
        this.x = this.pendingX;
        this.y = this.pendingY;
        this.teleportMoved = true;
        this.randomizeDirection();
      }
      if (this.teleportTimer < 0) this.teleportTimer = 0;
    }

    this.anims.idle.update(dt);
    this.stateTimer += dtMs;

    if (this.state === 'IDLE') {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.x >= DRAGON_MAX_X) { this.x = DRAGON_MAX_X; this.vx = -Math.abs(this.vx); }
      if (this.x <= DRAGON_MIN_X) { this.x = DRAGON_MIN_X; this.vx = Math.abs(this.vx); }
      if (this.y >= DRAGON_MAX_Y) { this.y = DRAGON_MAX_Y; this.vy = -Math.abs(this.vy); }
      if (this.y <= DRAGON_MIN_Y) { this.y = DRAGON_MIN_Y; this.vy = Math.abs(this.vy); }
    }

    switch (this.state) {
      case 'IDLE':
        if (this.stateTimer >= this.idleDecisionTime) this.decideAction();
        break;

      case 'FIRE_TELEGRAPH':
        if (this.stateTimer >= 600) {
          this.state = 'FIRE_ACTIVE';
          this.stateTimer = 0;
          this.fireResolved = false;
        }
        break;

      case 'FIRE_ACTIVE':
        if (!this.fireResolved) {
          this.fireResolved = true;
          if (rectsOverlap(player.hitbox, this.aoeZone)) {
            player.takeDamage(rollDamage());
          }
        }
        if (this.stateTimer >= 900) {
          this.fireCooldown = 2800;
          this.state = 'RECOVER';
          this.stateTimer = 0;
        }
        break;

      case 'RECOVER':
        if (this.stateTimer >= 500) this.enterIdle();
        break;

      case 'SUMMON':
        if (!this.summonSpawned && this.stateTimer >= 200) {
          this.summonSpawned = true;
          spawnMonster();
        }
        if (this.stateTimer >= 400) {
          this.summonCooldown = 3500;
          this.enterIdle();
        }
        break;
    }

    // Contact/melee damage is always live, independent of the state machine above.
    if (this.teleportTimer <= 0 && this.contactCooldown <= 0 && rectsOverlap(player.hitbox, this.hurtbox)) {
      if (player.takeDamage(rollDamage())) {
        this.contactCooldown = DRAGON_CONTACT_COOLDOWN;
        this.contactShakeTimer = 200;
      }
    }
  }

  draw(ctx) {
    let shakeX = 0;
    if (this.contactShakeTimer > 0) {
      shakeX = Math.sin(this.contactShakeTimer * 0.8) * 4;
    }

    const attacking = this.state === 'FIRE_TELEGRAPH' || this.state === 'FIRE_ACTIVE';

    if (this.state === 'FIRE_TELEGRAPH') {
      // Soft pulsing glow near the mouth as a warning cue, instead of a hard AOE rectangle.
      const pulse = 0.35 + 0.35 * Math.sin(this.stateTimer / 60);
      const gx = this.x - 90, gy = this.y + 30;
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, 90);
      grad.addColorStop(0, `rgba(90,220,230,${pulse})`);
      grad.addColorStop(1, 'rgba(90,220,230,0)');
      ctx.save();
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(gx, gy, 90, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    let img, def, frameIndex, scale, xOffset;
    if (this.state === 'FIRE_TELEGRAPH') {
      def = ANIMS.dragonBreath;
      img = IMAGES.dragonBreath;
      frameIndex = Math.min(5, Math.floor(this.stateTimer / 100));
      scale = DRAGON_BREATH_SCALE;
      xOffset = DRAGON_BREATH_X_OFFSET * scale;
    } else if (this.state === 'FIRE_ACTIVE') {
      def = ANIMS.dragonBreath;
      img = IMAGES.dragonBreath;
      frameIndex = 6 + Math.min(9, Math.floor(this.stateTimer / 90));
      scale = DRAGON_BREATH_SCALE;
      xOffset = DRAGON_BREATH_X_OFFSET * scale;
    } else {
      def = ANIMS.dragonIdle;
      img = IMAGES.dragonIdle;
      frameIndex = this.anims.idle.frameIndex;
      scale = DRAGON_SCALE;
      xOffset = 0;
    }

    const dw = def.frameW * scale, dh = def.frameH * scale;
    const dx = this.x - dw / 2 + xOffset + shakeX;
    const dy = this.y - dh / 2;
    const flip = !attacking && this.vx > 0;

    let alpha = 1;
    if (this.teleportTimer > 0) {
      const t = 1 - this.teleportTimer / DRAGON_TELEPORT_DURATION;
      alpha = Math.abs(t - 0.5) * 2;
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    drawFrameWithFlash(ctx, img, frameIndex, def.frameW, def.frameH, dx, dy, dw, dh, flip, this.flashTimer > 0 ? 0.85 : 0);
    ctx.restore();
  }
}
