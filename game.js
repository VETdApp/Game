class Soldier {
    constructor(x, y, teamColor) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.angle = Math.random() * Math.PI * 2;
        this.angularVelocity = (Math.random() - 0.5) * 0.1;
        this.radius = 10;
        this.swordLength = 20;
        this.teamColor = teamColor;
        this.alive = true;
        this.deadFade = 0; // 0..1
        this.swordOffset = 0; // current offset from angle
        this.targetSwordOffset = (Math.random() - 0.5) * Math.PI / 2;
    }

    update(dt) {
        if (!this.alive) {
            this.deadFade = Math.min(1, this.deadFade + dt * 0.2);
            return;
        }
        // random acceleration
        this.vx += (Math.random() - 0.5) * 0.2;
        this.vy += (Math.random() - 0.5) * 0.2;
        // limit speed
        const speed = Math.hypot(this.vx, this.vy);
        const maxSpeed = 2.5;
        if (speed > maxSpeed) {
            this.vx = (this.vx / speed) * maxSpeed;
            this.vy = (this.vy / speed) * maxSpeed;
        }
        // update position
        this.x += this.vx;
        this.y += this.vy;

        // random angular acceleration
        this.angularVelocity += (Math.random() - 0.5) * 0.02;
        const maxAng = 0.1;
        if (Math.abs(this.angularVelocity) > maxAng) {
            this.angularVelocity = Math.sign(this.angularVelocity) * maxAng;
        }
        this.angle += this.angularVelocity;

        // sword swing
        if (Math.abs(this.swordOffset - this.targetSwordOffset) < 0.1) {
            this.targetSwordOffset = (Math.random() - 0.5) * Math.PI;
        }
        this.swordOffset += (this.targetSwordOffset - this.swordOffset) * 0.1;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        const outline = this.alive ? this.teamColor : `rgba(80,80,80,${1 - this.deadFade})`;
        ctx.fillStyle = `rgba(${50 + this.deadFade*50}, ${50 + this.deadFade*50}, ${50 + this.deadFade*50})`;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // sword
        ctx.rotate(this.swordOffset);
        ctx.strokeStyle = this.alive ? '#ccc' : `rgba(150,150,150,${1 - this.deadFade})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this.swordLength, 0);
        ctx.stroke();

        ctx.restore();
    }
}

function lineIntersectsCircle(x1, y1, x2, y2, cx, cy, r) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l2 = dx*dx + dy*dy;
    if (l2 === 0) return false;
    let t = ((cx - x1) * dx + (cy - y1) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    const px = x1 + t * dx;
    const py = y1 + t * dy;
    const dist2 = (px - cx)*(px - cx) + (py - cy)*(py - cy);
    return dist2 <= r*r;
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.soldiers = [];
        this.messageDiv = document.getElementById('message');

        const margin = 50;
        for (let i = 0; i < 10; i++) {
            this.soldiers.push(new Soldier(margin + Math.random()*100, margin + Math.random()*(this.height-2*margin), 'green'));
            this.soldiers.push(new Soldier(this.width - margin - Math.random()*100, margin + Math.random()*(this.height-2*margin), 'yellow'));
        }

        requestAnimationFrame((t)=>this.loop(t));
    }

    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        this.update(dt);
        this.draw();
        if (!this.gameOver) {
            requestAnimationFrame((t)=>this.loop(t));
        }
    }

    update(dt) {
        for (const s of this.soldiers) {
            s.update(dt);
        }

        // handle collisions between soldiers
        for (let i = 0; i < this.soldiers.length; i++) {
            const a = this.soldiers[i];
            if (!a.alive) continue;
            for (let j = i+1; j < this.soldiers.length; j++) {
                const b = this.soldiers[j];
                if (!b.alive) continue;
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.hypot(dx, dy);
                const minDist = a.radius + b.radius;
                if (dist < minDist && dist > 0) {
                    // resolve collision
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const dvx = b.vx - a.vx;
                    const dvy = b.vy - a.vy;
                    const impact = dvx * nx + dvy * ny;
                    if (impact < 0) {
                        const impulse = impact * -1;
                        a.vx -= impulse * nx;
                        a.vy -= impulse * ny;
                        b.vx += impulse * nx;
                        b.vy += impulse * ny;
                        // add spin
                        a.angularVelocity -= 0.05 * (Math.random()-0.5);
                        b.angularVelocity -= 0.05 * (Math.random()-0.5);
                    }
                    // push apart
                    const overlap = minDist - dist;
                    a.x -= nx * overlap/2;
                    a.y -= ny * overlap/2;
                    b.x += nx * overlap/2;
                    b.y += ny * overlap/2;
                }
            }
        }

        // wall collisions
        for (const s of this.soldiers) {
            if (!s.alive) continue;
            if (s.x - s.radius < 0) { s.x = s.radius; s.vx *= -1; s.angularVelocity *= -1; }
            if (s.x + s.radius > this.width) { s.x = this.width - s.radius; s.vx *= -1; s.angularVelocity *= -1; }
            if (s.y - s.radius < 0) { s.y = s.radius; s.vy *= -1; s.angularVelocity *= -1; }
            if (s.y + s.radius > this.height) { s.y = this.height - s.radius; s.vy *= -1; s.angularVelocity *= -1; }
        }

        // sword hits
        for (const attacker of this.soldiers) {
            if (!attacker.alive) continue;
            const swordAngle = attacker.angle + attacker.swordOffset;
            const tipX = attacker.x + Math.cos(swordAngle) * attacker.swordLength;
            const tipY = attacker.y + Math.sin(swordAngle) * attacker.swordLength;

            for (const target of this.soldiers) {
                if (!target.alive) continue;
                if (target.teamColor === attacker.teamColor) continue;
                // ignore if target already dead or if behind attacker
                const dx = target.x - attacker.x;
                const dy = target.y - attacker.y;
                const dist = Math.hypot(dx, dy);
                if (dist > attacker.swordLength + target.radius) continue;
                const angleToTarget = Math.atan2(dy, dx);
                let diff = angleToTarget - swordAngle;
                diff = Math.atan2(Math.sin(diff), Math.cos(diff));
                if (Math.abs(diff) > Math.PI/4) continue;
                if (lineIntersectsCircle(attacker.x, attacker.y, tipX, tipY, target.x, target.y, target.radius)) {
                    target.alive = false;
                }
            }
        }

        // check game over
        const aliveGreen = this.soldiers.filter(s => s.teamColor==='green' && s.alive).length;
        const aliveYellow = this.soldiers.filter(s => s.teamColor==='yellow' && s.alive).length;
        if (!this.gameOver && (aliveGreen === 0 || aliveYellow === 0)) {
            this.gameOver = true;
            const winner = aliveGreen > 0 ? 'Green' : 'Yellow';
            this.messageDiv.textContent = `${winner} wins!`;
        }
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);
        for (const s of this.soldiers) {
            s.draw(ctx);
        }
    }
}

window.onload = () => {
    new Game();
};
