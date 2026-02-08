const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const WORLD_WIDTH = 2200;
const WORLD_HEIGHT = 540;
const gravity = 1800;
const moveSpeed = 290;
const jumpSpeed = 700;

const keys = new Set();
const touchInput = { left: false, right: false, jump: false };

const levelPlatforms = [
  { x: 0, y: 490, w: 420, h: 80 },
  { x: 510, y: 430, w: 220, h: 26 },
  { x: 820, y: 370, w: 220, h: 24 },
  { x: 1110, y: 320, w: 200, h: 22 },
  { x: 1400, y: 370, w: 230, h: 24 },
  { x: 1710, y: 430, w: 260, h: 24 },
  { x: 2000, y: 490, w: 200, h: 80 },
  { x: 690, y: 260, w: 100, h: 18 },
  { x: 1500, y: 250, w: 100, h: 18 },
];

const stars = [
  { x: 590, y: 385, r: 11, collected: false },
  { x: 910, y: 325, r: 11, collected: false },
  { x: 1185, y: 275, r: 11, collected: false },
  { x: 1455, y: 325, r: 11, collected: false },
  { x: 1775, y: 385, r: 11, collected: false },
  { x: 740, y: 215, r: 11, collected: false },
  { x: 1550, y: 205, r: 11, collected: false },
];

const slimes = [
  { x: 930, y: 340, w: 36, h: 28, dir: 1, min: 830, max: 1020, speed: 80 },
  { x: 1740, y: 400, w: 36, h: 28, dir: -1, min: 1710, max: 1930, speed: 90 },
];

const portal = { x: 2090, y: 418, w: 48, h: 72 };

const player = {
  x: 90,
  y: 420,
  w: 62,
  h: 70,
  vx: 0,
  vy: 0,
  facing: 1,
  onGround: false,
  canDoubleJump: true,
  jumpConsumed: false,
};

let cameraX = 0;
let score = 0;
let gameState = 'playing';

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys.add(key);
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
    event.preventDefault();
  }
  if (gameState !== 'playing' && key === 'r') {
    resetGame();
  }
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.key.toLowerCase());
});

function bindTouchButton(id, inputName) {
  const button = document.getElementById(id);
  if (!button) return;

  const start = (event) => {
    event.preventDefault();
    touchInput[inputName] = true;
    button.classList.add('active');
    if (gameState !== 'playing' && inputName === 'jump') {
      resetGame();
    }
  };

  const end = (event) => {
    event.preventDefault();
    touchInput[inputName] = false;
    button.classList.remove('active');
  };

  button.addEventListener('pointerdown', start);
  button.addEventListener('pointerup', end);
  button.addEventListener('pointercancel', end);
  button.addEventListener('pointerleave', end);
}

bindTouchButton('btn-left', 'left');
bindTouchButton('btn-right', 'right');
bindTouchButton('btn-jump', 'jump');

function resetGame() {
  player.x = 90;
  player.y = 420;
  player.vx = 0;
  player.vy = 0;
  player.facing = 1;
  player.onGround = false;
  player.canDoubleJump = true;
  player.jumpConsumed = false;
  cameraX = 0;
  score = 0;
  gameState = 'playing';

  stars.forEach((star) => {
    star.collected = false;
  });
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function roundedRectPath(x, y, width, height, radius) {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function update(dt) {
  if (gameState !== 'playing') return;

  const left = keys.has('a') || keys.has('arrowleft') || touchInput.left;
  const right = keys.has('d') || keys.has('arrowright') || touchInput.right;
  const jumpPressed = keys.has('w') || keys.has('arrowup') || keys.has(' ') || touchInput.jump;

  player.vx = 0;
  if (left && !right) {
    player.vx = -moveSpeed;
    player.facing = -1;
  } else if (right && !left) {
    player.vx = moveSpeed;
    player.facing = 1;
  }

  if (jumpPressed && !player.jumpConsumed) {
    if (player.onGround) {
      player.vy = -jumpSpeed;
      player.onGround = false;
      player.canDoubleJump = true;
    } else if (player.canDoubleJump) {
      player.vy = -jumpSpeed * 0.85;
      player.canDoubleJump = false;
    }
    player.jumpConsumed = true;
  }

  if (!jumpPressed) {
    player.jumpConsumed = false;
  }

  player.vy += gravity * dt;

  player.x += player.vx * dt;
  player.x = Math.max(0, Math.min(WORLD_WIDTH - player.w, player.x));

  player.y += player.vy * dt;
  player.onGround = false;

  for (const platform of levelPlatforms) {
    if (!intersects(player, platform)) continue;

    const previousY = player.y - player.vy * dt;
    if (previousY + player.h <= platform.y + 2) {
      player.y = platform.y - player.h;
      player.vy = 0;
      player.onGround = true;
    } else if (previousY >= platform.y + platform.h - 2) {
      player.y = platform.y + platform.h;
      player.vy = 20;
    } else if (player.x + player.w * 0.5 < platform.x + platform.w * 0.5) {
      player.x = platform.x - player.w;
    } else {
      player.x = platform.x + platform.w;
    }
  }

  if (player.y > WORLD_HEIGHT + 200) {
    gameState = 'lost';
  }

  for (const slime of slimes) {
    slime.x += slime.dir * slime.speed * dt;
    if (slime.x < slime.min || slime.x > slime.max) {
      slime.dir *= -1;
    }
    if (intersects(player, slime)) {
      gameState = 'lost';
    }
  }

  for (const star of stars) {
    if (star.collected) continue;
    const hit =
      player.x < star.x + star.r &&
      player.x + player.w > star.x - star.r &&
      player.y < star.y + star.r &&
      player.y + player.h > star.y - star.r;

    if (hit) {
      star.collected = true;
      score += 1;
    }
  }

  if (score === stars.length && intersects(player, portal)) {
    gameState = 'won';
  }

  cameraX = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, player.x - canvas.width * 0.35));
}

function drawSky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#76b5eb');
  gradient.addColorStop(1, '#d8f1ff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let index = 0; index < 5; index += 1) {
    const cloudX = ((index * 240 - cameraX * 0.3) % (canvas.width + 220)) - 110;
    const cloudY = 85 + (index % 2) * 45;

    ctx.beginPath();
    ctx.ellipse(cloudX, cloudY, 54, 24, 0, 0, Math.PI * 2);
    ctx.ellipse(cloudX + 36, cloudY + 8, 50, 20, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlatforms() {
  for (const platform of levelPlatforms) {
    const x = platform.x - cameraX;
    ctx.fillStyle = '#4f7f36';
    ctx.fillRect(x, platform.y, platform.w, platform.h);
    ctx.fillStyle = '#8ecf63';
    ctx.fillRect(x, platform.y, platform.w, 10);
  }
}

function drawStar(star, timeSec) {
  if (star.collected) return;

  const x = star.x - cameraX;
  const bob = Math.sin(timeSec * 6 + star.x) * 2;

  ctx.save();
  ctx.translate(x, star.y + bob);
  ctx.fillStyle = '#ffe780';
  ctx.strokeStyle = '#f4b700';
  ctx.lineWidth = 2;
  ctx.beginPath();

  for (let i = 0; i < 5; i += 1) {
    const outer = (i * Math.PI * 2) / 5 - Math.PI / 2;
    const inner = outer + Math.PI / 5;
    ctx.lineTo(Math.cos(outer) * star.r, Math.sin(outer) * star.r);
    ctx.lineTo(Math.cos(inner) * star.r * 0.45, Math.sin(inner) * star.r * 0.45);
  }

  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawSlime(slime) {
  const x = slime.x - cameraX;

  ctx.fillStyle = '#d23f52';
  roundedRectPath(x, slime.y, slime.w, slime.h, 10);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + 10, slime.y + 12, 4, 0, Math.PI * 2);
  ctx.arc(x + 26, slime.y + 12, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawPortal() {
  const x = portal.x - cameraX;
  const gradient = ctx.createLinearGradient(x, portal.y, x + portal.w, portal.y);
  gradient.addColorStop(0, '#7d32ff');
  gradient.addColorStop(1, '#3cf4ff');

  ctx.fillStyle = gradient;
  ctx.fillRect(x, portal.y, portal.w, portal.h);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 2, portal.y - 2, portal.w + 4, portal.h + 4);
}

function drawFluffyCharacter(px, py, facing) {
  ctx.save();
  ctx.translate(px + player.w * 0.5, py + player.h * 0.5);
  ctx.scale(facing, 1);

  const fur = ctx.createRadialGradient(0, 12, 6, 0, 10, 42);
  fur.addColorStop(0, '#fff');
  fur.addColorStop(1, '#d8e5f2');

  ctx.fillStyle = fur;
  ctx.beginPath();
  for (let i = 0; i < 24; i += 1) {
    const angle = (i / 24) * Math.PI * 2;
    const spike = i % 2 === 0 ? 36 : 30;
    const sx = Math.cos(angle) * spike;
    const sy = Math.sin(angle) * (spike + 7);

    if (i === 0) {
      ctx.moveTo(sx, sy);
    } else {
      ctx.lineTo(sx, sy);
    }
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#eef6ff';
  ctx.beginPath();
  ctx.ellipse(-10, -4, 11, 14, 0, 0, Math.PI * 2);
  ctx.ellipse(10, -4, 11, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2f83c9';
  ctx.beginPath();
  ctx.arc(-10, -2, 5.5, 0, Math.PI * 2);
  ctx.arc(10, -2, 5.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(-10, -2, 2.8, 0, Math.PI * 2);
  ctx.arc(10, -2, 2.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#9097aa';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 11, 9, 0.25, Math.PI - 0.25);
  ctx.stroke();

  ctx.fillStyle = '#d0dcea';
  roundedRectPath(-17, 26, 12, 13, 6);
  ctx.fill();
  roundedRectPath(5, 26, 12, 13, 6);
  ctx.fill();

  ctx.restore();
}

function drawUI() {
  ctx.fillStyle = 'rgba(8, 25, 43, 0.68)';
  ctx.fillRect(12, 12, 250, 62);

  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText(`Stars: ${score}/${stars.length}`, 24, 38);
  ctx.font = '16px sans-serif';
  ctx.fillText(gameState === 'playing' ? 'Reach portal after stars' : 'Tap jump or R to restart', 24, 60);

  if (gameState === 'won' || gameState === 'lost') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText(gameState === 'won' ? 'You Win! ✨' : 'You Lost 💥', canvas.width * 0.5, canvas.height * 0.5 - 8);
    ctx.font = '24px sans-serif';
    ctx.fillText('Tap jump or press R to play again', canvas.width * 0.5, canvas.height * 0.5 + 34);
    ctx.textAlign = 'left';
  }
}

let previous = 0;
function frame(timestamp) {
  const dt = Math.min(0.033, (timestamp - previous) / 1000 || 0);
  previous = timestamp;

  update(dt);
  drawSky();
  drawPlatforms();
  stars.forEach((star) => drawStar(star, timestamp / 1000));
  slimes.forEach(drawSlime);
  drawPortal();
  drawFluffyCharacter(player.x - cameraX, player.y, player.facing);
  drawUI();

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
