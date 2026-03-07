const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');
const { WebSocketServer } = require('ws');


const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const WS_PATH = '/ws';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=UTF-8',
};

const ARENA = {
  xMin: 160 + 14,
  xMax: 160 + 960 - 14,
  yMin: 80 + 14,
  yMax: 80 + 560 - 14,
};

const TICK_MS = 50;

const players = new Map();

function randomColor() {
  // Return an integer RGB color (0xRRGGBB), which Phaser consumes directly.
  return Math.floor(Math.random() * 0xffffff);
}

function randomSpawn() {
  return {
    x: Math.random() * (ARENA.xMax - ARENA.xMin) + ARENA.xMin,
    y: Math.random() * (ARENA.yMax - ARENA.yMin) + ARENA.yMin,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function send(ws, payload) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastState(wss) {
  const state = {
    type: 'state',
    players: Array.from(players.values()).map((p) => ({
      id: p.id,
      x: p.x,
      y: p.y,
      color: p.color,
    })),
  };

  for (const client of wss.clients) {
    send(client, state);
  }
}

function createHttpServer() {
  return http.createServer((req, res) => {
    // Parse URL so query strings never affect static file lookup.
    const parsed = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const reqPath = parsed.pathname === '/' ? '/index.html' : parsed.pathname;
    const safePath = path
      .normalize(reqPath)
      .replace(/^(\.\.(\/|\\|$))+/, '')
      .replace(/^[/\\]+/, '');
    const filePath = path.join(ROOT, safePath);

    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
}

const server = createHttpServer();
// Use manual upgrade handling so websocket handshakes are explicit and debuggable.
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const parsed = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (parsed.pathname !== WS_PATH) {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

wss.on('connection', (ws) => {
  const id = crypto.randomUUID();
  const spawn = randomSpawn();
  players.set(id, {
    id,
    x: spawn.x,
    y: spawn.y,
    color: randomColor(),
    inputX: 0,
    inputY: 0,
    speed: 240,
  });

  send(ws, { type: 'welcome', id });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type !== 'input') {
      return;
    }

    const player = players.get(id);
    if (!player) {
      return;
    }

    const ix = Number(msg.moveX);
    const iy = Number(msg.moveY);
    const speed = Number(msg.speed);

    player.inputX = Number.isFinite(ix) ? clamp(ix, -1, 1) : 0;
    player.inputY = Number.isFinite(iy) ? clamp(iy, -1, 1) : 0;
    player.speed = Number.isFinite(speed) ? clamp(speed, 100, 300) : player.speed;
  });

  ws.on('close', () => {
    players.delete(id);
  });
});

setInterval(() => {
  const dt = TICK_MS / 1000;

  // Server-authoritative movement simulation to keep all clients in sync.
  for (const player of players.values()) {
    const len = Math.hypot(player.inputX, player.inputY) || 1;
    const vx = (player.inputX / len) * player.speed;
    const vy = (player.inputY / len) * player.speed;

    player.x = clamp(player.x + vx * dt, ARENA.xMin, ARENA.xMax);
    player.y = clamp(player.y + vy * dt, ARENA.yMin, ARENA.yMax);
  }

  broadcastState(wss);
}, TICK_MS);

server.listen(PORT, () => {
  console.log(`Multiplayer game running on http://localhost:${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}${WS_PATH}`);
});
