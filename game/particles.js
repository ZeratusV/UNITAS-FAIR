// Purely decorative ambient particles (embers + cyan sparks) so the
// background isn't a flat, static image. Runs behind gameplay entities.
import { CANVAS_W, CANVAS_H } from './level';

const PARTICLE_COUNT = 35; // scaled up a bit for the wider arena

const PARTICLE_COLORS = [
  { r: 255, g: 140, b: 60 }, // ember orange, ties to the fire theme
  { r: 90, g: 220, b: 230 }, // cyan, ties to the dragon's breath color
];

function makeParticle() {
  const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
  return {
    x: Math.random() * CANVAS_W,
    y: Math.random() * CANVAS_H,
    radius: 1 + Math.random() * 2.2,
    speed: 10 + Math.random() * 18,
    swayAmp: 8 + Math.random() * 18,
    swaySpeed: 0.4 + Math.random() * 0.8,
    phase: Math.random() * Math.PI * 2,
    baseAlpha: 0.25 + Math.random() * 0.45,
    color,
    baseX: 0,
  };
}

// Populated lazily via initParticles() (called once by the engine at
// startup) rather than at module-evaluation time, since level.js and
// particles.js import each other and module-top-level access to a
// circularly-imported binding is fragile to evaluation order.
export const particles = [];

export function initParticles() {
  particles.length = 0;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = makeParticle();
    p.baseX = p.x;
    particles.push(p);
  }
}

let particleTime = 0;

export function updateParticles(dt) {
  particleTime += dt;
  for (const p of particles) {
    p.y -= p.speed * dt;
    if (p.y < -10) {
      p.y = CANVAS_H + 10;
      p.baseX = Math.random() * CANVAS_W;
    }
    p.x = p.baseX + Math.sin(particleTime * p.swaySpeed + p.phase) * p.swayAmp;
  }
}

export function drawParticles(ctx) {
  ctx.save();
  for (const p of particles) {
    const flicker = 0.75 + 0.25 * Math.sin(particleTime * 3 + p.phase);
    const alpha = p.baseAlpha * flicker;
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
    grad.addColorStop(0, `rgba(${p.color.r},${p.color.g},${p.color.b},${alpha})`);
    grad.addColorStop(1, `rgba(${p.color.r},${p.color.g},${p.color.b},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
