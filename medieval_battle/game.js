const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Utility functions
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function vecLength(x, y) {
  return Math.sqrt(x * x + y * y);
}

function normalize(x, y) {
  const len = vecLength(x, y);
  if (len === 0) return {x: 0, y: 0};
  return {x: x / len, y: y / len};
}

class Soldier {
  constructor(team, x, y) {
    this.team = team; // 'green' or 'yellow'
    this.x = x;
    this.y = y;
    this.vx = rand(-1, 1);
    this.vy = rand(-1, 1);
    this.angle = rand(0, Math.PI * 2);
    this.spin = rand(-0.05, 0.05);
    this.swordAngle = 0;
    this.swordSpin = rand(-0.1, 0.1);
    this.radius = 12;
    this.swordLength = 20;
    this.alive = true;
  }

  color() {
    if (!this.alive) return 'gray';
    return this.team;
  }

  outline() {
    return this.team;
  }

  update(dt) {
    if (!this.alive) return;
    // Random impulse
    this.vx += rand(-0.1, 0.1) * dt;
    this.vy += rand(-0.1, 0.1) * dt;
    this.spin += rand(-0.005, 0.005) * dt;
    this.swordSpin += rand(-0.01, 0.01) * dt;

    // Clamp velocity
    this.vx = clamp(this.vx, -3, 3);
    this.vy = clamp(this.vy, -3, 3);

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle += this.spin * dt;
    this.swordAngle += this.swordSpin * dt;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Draw body
    ctx.fillStyle = this.alive ? '#ccc' : '#666';
    ctx.strokeStyle = this.outline();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw sword
    ctx.save();
    ctx.rotate(this.swordAngle);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(this.swordLength, 0);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  handleWallCollision(width, height) {
    if (!this.alive) return;
    if (this.x - this.radius < 0) {
      this.x = this.radius;
      this.vx = Math.abs(this.vx);
      this.spin *= -1;
    } else if (this.x + this.radius > width) {
      this.x = width - this.radius;
      this.vx = -Math.abs(this.vx);
      this.spin *= -1;
    }

    if (this.y - this.radius < 0) {
      this.y = this.radius;
      this.vy = Math.abs(this.vy);
      this.spin *= -1;
    } else if (this.y + this.radius > height) {
      this.y = height - this.radius;
      this.vy = -Math.abs(this.vy);
      this.spin *= -1;
    }
  }

  swordTip() {
    const angle = this.angle + this.swordAngle;
    return {
      x: this.x + Math.cos(angle) * this.swordLength,
      y: this.y + Math.sin(angle) * this.swordLength
    };
  }
}

function lineCircleIntersect(p1, p2, cx, cy, r) {
  // from https://stackoverflow.com/a/1088058/259456
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const fx = p1.x - cx;
  const fy = p1.y - cy;

  const a = dx*dx + dy*dy;
  const b = 2 * (fx*dx + fy*dy);
  const c = (fx*fx + fy*fy) - r*r;

  let discriminant = b*b - 4*a*c;
  if (discriminant < 0) {
    return false;
  }
  discriminant = Math.sqrt(discriminant);
  let t1 = (-b - discriminant)/(2*a);
  let t2 = (-b + discriminant)/(2*a);
  if ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1)) {
    return true;
  }
  return false;
}

const soldiers = [];
const teamCounts = {green: 10, yellow: 10};

function init() {
  const margin = 50;
  for (let i = 0; i < 10; i++) {
    soldiers.push(new Soldier('green', rand(margin, canvas.width/2-margin), rand(margin, canvas.height-margin)));
    soldiers.push(new Soldier('yellow', rand(canvas.width/2+margin, canvas.width-margin), rand(margin, canvas.height-margin)));
  }
}

function update(dt) {
  soldiers.forEach(s => s.update(dt));

  // Handle wall collisions
  soldiers.forEach(s => s.handleWallCollision(canvas.width, canvas.height));

  // Soldier-soldier collisions
  for (let i = 0; i < soldiers.length; i++) {
    for (let j = i+1; j < soldiers.length; j++) {
      const a = soldiers[i];
      const b = soldiers[j];
      if (!a.alive || !b.alive) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = vecLength(dx, dy);
      const minDist = a.radius + b.radius;
      if (dist < minDist && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;
        const p = 2 * (a.vx*nx + a.vy*ny - b.vx*nx - b.vy*ny) / 2; // masses are equal
        a.vx = a.vx - p * nx;
        a.vy = a.vy - p * ny;
        b.vx = b.vx + p * nx;
        b.vy = b.vy + p * ny;
        // reposition to prevent overlap
        const overlap = minDist - dist;
        a.x -= nx * overlap/2;
        a.y -= ny * overlap/2;
        b.x += nx * overlap/2;
        b.y += ny * overlap/2;
        // spin change
        a.spin += rand(-0.05, 0.05);
        b.spin += rand(-0.05, 0.05);
      }
    }
  }

  // Sword hits
  for (let i = 0; i < soldiers.length; i++) {
    const attacker = soldiers[i];
    if (!attacker.alive) continue;
    const tip = attacker.swordTip();
    for (let j = 0; j < soldiers.length; j++) {
      if (i === j) continue;
      const victim = soldiers[j];
      if (!victim.alive || victim.team === attacker.team) continue;
      const hit = lineCircleIntersect(
        {x: attacker.x, y: attacker.y},
        tip,
        victim.x, victim.y,
        victim.radius
      );
      if (hit) {
        victim.alive = false;
        victim.vx = victim.vy = 0;
        victim.spin = 0;
        teamCounts[victim.team] -= 1;
      }
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  soldiers.forEach(s => s.draw(ctx));

  // scoreboard
  ctx.fillStyle = '#000';
  ctx.font = '20px sans-serif';
  ctx.fillText(`Green: ${teamCounts.green}`, 10, 20);
  ctx.fillText(`Yellow: ${teamCounts.yellow}`, 10, 40);

  if (teamCounts.green === 0 || teamCounts.yellow === 0) {
    ctx.fillText('Game Over!', canvas.width/2 - 50, 30);
  }
}

let last = null;
function loop(timestamp) {
  if (!last) last = timestamp;
  const dt = (timestamp - last) / 16; // ~60fps
  last = timestamp;
  if (teamCounts.green > 0 && teamCounts.yellow > 0) {
    update(dt);
  }
  draw();
  requestAnimationFrame(loop);
}

init();
requestAnimationFrame(loop);
