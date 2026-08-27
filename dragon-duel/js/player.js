const PLAYER_W = 40;
const PLAYER_H = 78;
const GRAVITY = 1700;
const JUMP_VELOCITY = -700;
const MOVE_SPEED = 220;

const ATTACK_COOLDOWN = 500;
const ATTACK_DURATION = 420; // 6 frames * 70ms
const ATTACK_HITBOX_START = 140; // frame index 2
const ATTACK_HITBOX_END = 280; // through frame index 3

const IFRAME_MS = 800;
const MAX_HP = 50;
const POTION_HEAL = 20;

class Player {
  constructor(x, y) {
    this.x = x; // center x
    this.y = y; // feet y
    this.vx = 0;
    this.vy = 0;
    this.facing = 1; // 1 = right, -1 = left
    this.onGround = true;
    this.hp = MAX_HP;
    this.potions = 3;
    this.state = 'idle';
    this.anims = {
      idle: new Anim(ANIMS.playerIdle),
      run: new Anim(ANIMS.playerRun),
      jump: new Anim(ANIMS.playerJump),
      attack: new Anim(ANIMS.playerSwordSlash),
      hurt: new Anim(ANIMS.playerHurt),
    };
    this.attackTimer = -1; // -1 = not attacking
    this.attackCooldownTimer = 0;
    this.attackHitTargets = new Set();
    this.hurtTimer = 0;
    this.iframeTimer = 0;
  }

  get hitbox() {
    return { x: this.x - PLAYER_W / 2, y: this.y - PLAYER_H, w: PLAYER_W, h: PLAYER_H };
  }

  get attackHitbox() {
    if (this.attackTimer < ATTACK_HITBOX_START || this.attackTimer > ATTACK_HITBOX_END) return null;
    const w = 64, h = 60;
    const x = this.facing === 1 ? this.x + PLAYER_W / 2 : this.x - PLAYER_W / 2 - w;
    const y = this.y - h - 10;
    return { x, y, w, h };
  }

  takeDamage(amount) {
    if (this.iframeTimer > 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.iframeTimer = IFRAME_MS;
    this.hurtTimer = ANIMS.playerHurt.frameCount * ANIMS.playerHurt.frameDuration;
    this.anims.hurt.reset();
    return true;
  }

  usePotion() {
    if (this.potions <= 0) return false;
    this.potions--;
    this.hp = Math.min(MAX_HP, this.hp + POTION_HEAL);
    return true;
  }

  startAttack() {
    if (this.attackCooldownTimer > 0 || this.attackTimer >= 0) return;
    this.attackTimer = 0;
    this.attackCooldownTimer = ATTACK_COOLDOWN;
    this.attackHitTargets = new Set();
    this.anims.attack.reset();
  }

  update(dt) {
    const dtMs = dt * 1000;
    if (this.attackCooldownTimer > 0) this.attackCooldownTimer -= dtMs;
    if (this.iframeTimer > 0) this.iframeTimer -= dtMs;
    if (this.hurtTimer > 0) this.hurtTimer -= dtMs;

    const attacking = this.attackTimer >= 0;
    const hurt = this.hurtTimer > 0;

    if (!attacking && !hurt) {
      let move = 0;
      if (Input.keys['KeyA'] || Input.keys['ArrowLeft']) move -= 1;
      if (Input.keys['KeyD'] || Input.keys['ArrowRight']) move += 1;
      this.vx = move * MOVE_SPEED;
      if (move !== 0) this.facing = move > 0 ? 1 : -1;

      if ((Input.keys['KeyW'] || Input.keys['ArrowUp'] || Input.keys['Space']) && this.onGround) {
        this.vy = JUMP_VELOCITY;
        this.onGround = false;
        this.anims.jump.reset();
      }

      if (consumePressed('KeyJ') || consumePressed('KeyF')) {
        this.startAttack();
      }
    } else {
      this.vx = 0;
    }

    if (consumePressed('KeyH')) this.usePotion();

    if (this.attackTimer >= 0) {
      this.attackTimer += dtMs;
      if (this.attackTimer > ATTACK_DURATION) this.attackTimer = -1;
    }

    // Physics
    this.vy += GRAVITY * dt;
    this.x += this.vx * dt;
    this.x = Math.max(PLAYER_W / 2, Math.min(CANVAS_W - PLAYER_W / 2, this.x));

    const prevFeetY = this.y;
    this.y += this.vy * dt;
    this.onGround = false;

    if (this.y >= GROUND_TOP) {
      this.y = GROUND_TOP;
      this.vy = 0;
      this.onGround = true;
    }

    if (this.vy >= 0) {
      for (const p of PLATFORMS) {
        const left = p.x, right = p.x + p.width;
        if (this.x + PLAYER_W / 2 > left && this.x - PLAYER_W / 2 < right) {
          if (prevFeetY <= p.top && this.y >= p.top) {
            this.y = p.top;
            this.vy = 0;
            this.onGround = true;
          }
        }
      }
    }

    // Animation state selection
    if (hurt) {
      this.state = 'hurt';
      this.anims.hurt.update(dt);
    } else if (attacking) {
      this.state = 'attack';
      this.anims.attack.update(dt);
    } else if (!this.onGround) {
      this.state = 'jump';
      this.anims.jump.update(dt);
    } else if (this.vx !== 0) {
      this.state = 'run';
      this.anims.run.update(dt);
    } else {
      this.state = 'idle';
      this.anims.idle.update(dt);
    }
  }

  draw(ctx) {
    const anim = this.anims[this.state];
    const def = anim.def;
    const dw = def.frameW * SCALE, dh = def.frameH * SCALE;
    const dx = this.x - dw / 2;
    const dy = this.y - dh;
    const imgKey = {
      idle: 'playerIdle', run: 'playerRun', jump: 'playerJump',
      attack: 'playerSwordSlash', hurt: 'playerHurt',
    }[this.state];

    ctx.save();
    if (this.iframeTimer > 0 && Math.floor(this.iframeTimer / 100) % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }
    drawFrame(ctx, IMAGES[imgKey], anim.frameIndex, def.frameW, def.frameH, dx, dy, dw, dh, this.facing === -1);
    ctx.restore();
  }
}
