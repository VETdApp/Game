const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;

const SOLDIER_RADIUS = 15;
const SWORD_LENGTH = 20;
const TEAMS = [
  { color: 'green' },
  { color: 'yellow' }
];
const NUM_PER_TEAM = 10;

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

class Soldier {
  constructor(team) {
    this.team = team;
    this.x = rand(SOLDIER_RADIUS, width - SOLDIER_RADIUS);
    this.y = rand(SOLDIER_RADIUS, height - SOLDIER_RADIUS);
    this.vx = rand(-2, 2);
    this.vy = rand(-2, 2);
    this.angle = rand(0, Math.PI * 2);
    this.va = rand(-0.05, 0.05);
    this.swing = 0;
    this.swingVel = rand(-0.1, 0.1);
    this.alive = true;
  }

  get swordTip() {
    const ang = this.angle + this.swing;
    return {
      x: this.x + Math.cos(ang) * (SOLDIER_RADIUS + SWORD_LENGTH),
      y: this.y + Math.sin(ang) * (SOLDIER_RADIUS + SWORD_LENGTH)
    };
  }

  update() {
    if (!this.alive) return;
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.va;
    this.swing += this.swingVel;
    // bounce on walls
    if (this.x < SOLDIER_RADIUS) {
      this.x = SOLDIER_RADIUS;
      this.vx *= -1;
    } else if (this.x > width - SOLDIER_RADIUS) {
      this.x = width - SOLDIER_RADIUS;
      this.vx *= -1;
    }
    if (this.y < SOLDIER_RADIUS) {
      this.y = SOLDIER_RADIUS;
      this.vy *= -1;
    } else if (this.y > height - SOLDIER_RADIUS) {
      this.y = height - SOLDIER_RADIUS;
      this.vy *= -1;
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    // body
    ctx.fillStyle = this.alive ? '#777' : '#444';
    ctx.beginPath();
    ctx.arc(0, 0, SOLDIER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.team.color;
    ctx.stroke();
    // sword
    ctx.rotate(this.swing);
    ctx.strokeStyle = '#ccc';
    ctx.beginPath();
    ctx.moveTo(SOLDIER_RADIUS, 0);
    ctx.lineTo(SOLDIER_RADIUS + SWORD_LENGTH, 0);
    ctx.stroke();
    ctx.restore();
  }
}

const soldiers = [];
for (let t = 0; t < TEAMS.length; t++) {
  for (let i = 0; i < NUM_PER_TEAM; i++) {
    soldiers.push(new Soldier(TEAMS[t]));
  }
}

function collide(s1, s2) {
  const dx = s2.x - s1.x;
  const dy = s2.y - s1.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0 || dist > SOLDIER_RADIUS * 2) return;
  const nx = dx / dist;
  const ny = dy / dist;
  const p = 2 * (s1.vx * nx + s1.vy * ny - s2.vx * nx - s2.vy * ny) / 2;
  s1.vx -= p * nx;
  s1.vy -= p * ny;
  s2.vx += p * nx;
  s2.vy += p * ny;
  // slight rotation adjustment
  s1.va += rand(-0.05, 0.05);
  s2.va += rand(-0.05, 0.05);
  // separate soldiers
  const overlap = SOLDIER_RADIUS * 2 - dist;
  s1.x -= nx * overlap / 2;
  s1.y -= ny * overlap / 2;
  s2.x += nx * overlap / 2;
  s2.y += ny * overlap / 2;
}

function swordHit(attacker, target) {
  const tip = attacker.swordTip;
  const dx = tip.x - target.x;
  const dy = tip.y - target.y;
  if (Math.hypot(dx, dy) < SOLDIER_RADIUS) {
    target.alive = false;
    target.vx = target.vy = target.va = target.swingVel = 0;
  }
}

function update() {
  let green = 0, yellow = 0;
  soldiers.forEach(s => {
    s.update();
    if (s.alive) {
      if (s.team.color === 'green') green++; else yellow++;
    }
  });
  for (let i = 0; i < soldiers.length; i++) {
    for (let j = i + 1; j < soldiers.length; j++) {
      const a = soldiers[i], b = soldiers[j];
      if (a.alive && b.alive) collide(a, b);
    }
  }
  for (let i = 0; i < soldiers.length; i++) {
    const a = soldiers[i];
    if (!a.alive) continue;
    for (let j = 0; j < soldiers.length; j++) {
      const b = soldiers[j];
      if (!b.alive || a.team === b.team) continue;
      swordHit(a, b);
    }
  }
  document.getElementById('greenCount').textContent = green;
  document.getElementById('yellowCount').textContent = yellow;
  if (green === 0 || yellow === 0) return true;
  return false;
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  soldiers.forEach(s => s.draw());
}

function loop() {
  const gameOver = update();
  draw();
  if (!gameOver) requestAnimationFrame(loop);
}

loop();
