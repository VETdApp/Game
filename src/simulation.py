# Simulation of two teams of soldiers battling
import pygame
import random
import math

WIDTH, HEIGHT = 800, 600
NUM_SOLDIERS = 10
RADIUS = 15
SWORD_LENGTH = 25
TEAM_COLORS = [(200, 30, 30), (30, 30, 200)]
GREY = (120, 120, 120)


class Soldier:
    def __init__(self, pos, team):
        self.x, self.y = pos
        angle = random.uniform(0, 2 * math.pi)
        speed = random.uniform(50, 100)
        self.vx = math.cos(angle) * speed
        self.vy = math.sin(angle) * speed
        self.angle = random.uniform(0, 2 * math.pi)
        self.ang_vel = random.uniform(-2, 2)
        self.team = team
        self.color = TEAM_COLORS[team]
        self.alive = True
        self.fade = 255

    def position(self):
        return (self.x, self.y)

    def update(self, dt):
        if not self.alive:
            if self.fade > 0:
                self.fade = max(0, self.fade - 100 * dt)
            return
        self.x += self.vx * dt
        self.y += self.vy * dt
        self.angle += self.ang_vel * dt
        self.handle_wall_collision()

    def handle_wall_collision(self):
        if self.x - RADIUS < 0:
            self.x = RADIUS
            self.vx = -self.vx
        if self.x + RADIUS > WIDTH:
            self.x = WIDTH - RADIUS
            self.vx = -self.vx
        if self.y - RADIUS < 0:
            self.y = RADIUS
            self.vy = -self.vy
        if self.y + RADIUS > HEIGHT:
            self.y = HEIGHT - RADIUS
            self.vy = -self.vy

    def draw(self, screen):
        c = self.color
        if not self.alive:
            c = (
                int(GREY[0] * (self.fade / 255)),
                int(GREY[1] * (self.fade / 255)),
                int(GREY[2] * (self.fade / 255)),
            )
        pygame.draw.circle(screen, c, (int(self.x), int(self.y)), RADIUS)
        # sword
        tip_x = self.x + math.cos(self.angle) * SWORD_LENGTH
        tip_y = self.y + math.sin(self.angle) * SWORD_LENGTH
        pygame.draw.line(screen, c, (self.x, self.y), (tip_x, tip_y), 3)


def distance(a, b):
    return math.hypot(a.x - b.x, a.y - b.y)


def handle_collision(a, b):
    if not a.alive or not b.alive:
        return
    dx = b.x - a.x
    dy = b.y - a.y
    dist = math.hypot(dx, dy)
    if dist == 0 or dist > RADIUS * 2:
        return
    # normal vector
    nx = dx / dist
    ny = dy / dist
    # relative velocity
    rvx = b.vx - a.vx
    rvy = b.vy - a.vy
    vel_along_normal = rvx * nx + rvy * ny
    if vel_along_normal > 0:
        return
    restitution = 0.9
    j = -(1 + restitution) * vel_along_normal
    j /= 2  # mass =1 for both
    impulse_x = j * nx
    impulse_y = j * ny
    a.vx -= impulse_x
    a.vy -= impulse_y
    b.vx += impulse_x
    b.vy += impulse_y
    # adjust angular velocity
    a.ang_vel += (b.ang_vel - a.ang_vel) * 0.1
    b.ang_vel += (a.ang_vel - b.ang_vel) * 0.1
    # positional correction to avoid sinking
    percent = 0.8
    slop = 0.01
    correction = max(dist - 2 * RADIUS, 0) / 2
    a.x -= correction * nx
    a.y -= correction * ny
    b.x += correction * nx
    b.y += correction * ny


def sword_hit(attacker, target):
    if not attacker.alive or not target.alive:
        return False
    ax, ay = attacker.x, attacker.y
    tip_x = ax + math.cos(attacker.angle) * SWORD_LENGTH
    tip_y = ay + math.sin(attacker.angle) * SWORD_LENGTH
    # vector from attacker to target
    tx = target.x - ax
    ty = target.y - ay
    # check if target in front of attacker
    dir_x = math.cos(attacker.angle)
    dir_y = math.sin(attacker.angle)
    if tx * dir_x + ty * dir_y <= 0:
        return False
    # distance from line to circle
    dx = tx
    dy = ty
    len_sq = SWORD_LENGTH**2
    t = max(0, min(1, (dx * dir_x + dy * dir_y) / len_sq))
    proj_x = ax + dir_x * SWORD_LENGTH * t
    proj_y = ay + dir_y * SWORD_LENGTH * t
    dist = math.hypot(target.x - proj_x, target.y - proj_y)
    return dist <= RADIUS


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    clock = pygame.time.Clock()

    soldiers = []
    margin = 50
    for i in range(NUM_SOLDIERS):
        x = random.uniform(margin, WIDTH / 2 - margin)
        y = random.uniform(margin, HEIGHT - margin)
        soldiers.append(Soldier((x, y), team=0))
    for i in range(NUM_SOLDIERS):
        x = random.uniform(WIDTH / 2 + margin, WIDTH - margin)
        y = random.uniform(margin, HEIGHT - margin)
        soldiers.append(Soldier((x, y), team=1))

    running = True
    winner = None
    while running:
        dt = clock.tick(60) / 1000.0
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
        screen.fill((240, 240, 240))
        # update soldiers
        for s in soldiers:
            s.update(dt)
        # handle collisions
        for i in range(len(soldiers)):
            for j in range(i + 1, len(soldiers)):
                handle_collision(soldiers[i], soldiers[j])
                if sword_hit(soldiers[i], soldiers[j]):
                    soldiers[j].alive = False
                if sword_hit(soldiers[j], soldiers[i]):
                    soldiers[i].alive = False
        # draw soldiers
        for s in soldiers:
            s.draw(screen)
        # check for winner
        alive_team0 = any(s.alive for s in soldiers if s.team == 0)
        alive_team1 = any(s.alive for s in soldiers if s.team == 1)
        if winner is None and (not alive_team0 or not alive_team1):
            if alive_team0:
                winner = "Team A wins!"
            elif alive_team1:
                winner = "Team B wins!"
            else:
                winner = "Draw"
        if winner:
            font = pygame.font.SysFont(None, 48)
            text = font.render(winner, True, (0, 0, 0))
            screen.blit(
                text,
                (WIDTH / 2 - text.get_width() / 2, HEIGHT / 2 - text.get_height() / 2),
            )
        pygame.display.flip()
    pygame.quit()


if __name__ == "__main__":
    main()
