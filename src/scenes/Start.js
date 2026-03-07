const ARENA = {
    x: 160,
    y: 80,
    width: 960,
    height: 560,
};

const PLAYER_SIZE = 28;
const MOVE_SPEED = 240;
const WS_PATH = '/ws';
const SELF_COLOR = 0xffffff;

export class Start extends Phaser.Scene {
    constructor() {
        super('Start');
        this.socket = null;
        this.playerId = null;
        this.players = new Map();
        this.cursors = null;
        this.wasd = null;
        this.lastSentInput = { x: 0, y: 0 };
    }

    create() {
        this.add.rectangle(640, 360, 1280, 720, 0x130f12).setOrigin(0.5);

        this.add
            .rectangle(
                ARENA.x + ARENA.width / 2,
                ARENA.y + ARENA.height / 2,
                ARENA.width,
                ARENA.height,
                0xcc2020
            )
            .setStrokeStyle(3, 0xffb3b3);

        this.statusText = this.add
            .text(20, 20, 'Connecting...', {
                fontFamily: 'monospace',
                fontSize: '18px',
                color: '#ffffff',
            })
            .setDepth(10);

        this.helpText = this.add.text(20, 50, 'Move: WASD or Arrow Keys', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#ffd7d7',
        });

        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,A,S,D');

        this.connectSocket();
    }

    connectSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Connect to the dedicated websocket endpoint on the same host as the page.
        this.socket = new WebSocket(`${protocol}//${window.location.host}${WS_PATH}`);

        this.socket.addEventListener('open', () => {
            this.statusText.setText('Connected - waiting for spawn...');
        });

        this.socket.addEventListener('message', (event) => {
            const msg = JSON.parse(event.data);

            if (msg.type === 'welcome') {
                this.playerId = msg.id;
                this.statusText.setText(`Connected as ${msg.id.slice(0, 6)}`);
                this.ensureLocalPlayerVisible();
            }

            if (msg.type === 'state') {
                // State snapshots are authoritative positions for every connected player.
                this.syncPlayers(msg.players);
            }
        });

        this.socket.addEventListener('close', () => {
            this.statusText.setText('Disconnected from server');
        });
    }

    syncPlayers(serverPlayers) {
        const incomingIds = new Set(serverPlayers.map((p) => p.id));

        for (const player of serverPlayers) {
            let sprite = this.players.get(player.id);
            if (!sprite) {
                sprite = this.add
                    .rectangle(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE, this.getPlayerColor(player))
                    .setStrokeStyle(player.id === this.playerId ? 3 : 2, player.id === this.playerId ? 0xfff08a : 0xffffff);
                this.players.set(player.id, sprite);
            }

            sprite.setFillStyle(this.getPlayerColor(player));
            sprite.setPosition(player.x, player.y);
        }

        for (const [id, sprite] of this.players) {
            if (!incomingIds.has(id)) {
                sprite.destroy();
                this.players.delete(id);
            }
        }
    }

    getInputVector() {
        const left = this.cursors.left.isDown || this.wasd.A.isDown;
        const right = this.cursors.right.isDown || this.wasd.D.isDown;
        const up = this.cursors.up.isDown || this.wasd.W.isDown;
        const down = this.cursors.down.isDown || this.wasd.S.isDown;

        let x = 0;
        let y = 0;

        if (left) x -= 1;
        if (right) x += 1;
        if (up) y -= 1;
        if (down) y += 1;

        return { x, y };
    }

    getPlayerColor(player) {
        if (player.id === this.playerId) {
            return SELF_COLOR;
        }
        return Number.isFinite(player.color) ? player.color : 0x66ccff;
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    ensureLocalPlayerVisible() {
        if (!this.playerId || this.players.has(this.playerId)) {
            return;
        }

        // Immediate local spawn so the player always sees their own block.
        const local = this.add
            .rectangle(
                ARENA.x + ARENA.width / 2,
                ARENA.y + ARENA.height / 2,
                PLAYER_SIZE,
                PLAYER_SIZE,
                SELF_COLOR
            )
            .setStrokeStyle(3, 0xfff08a);
        this.players.set(this.playerId, local);
    }

    predictLocalMovement(delta, input) {
        if (!this.playerId) {
            return;
        }

        const local = this.players.get(this.playerId);
        if (!local) {
            return;
        }

        const len = Math.hypot(input.x, input.y) || 1;
        const nx = input.x / len;
        const ny = input.y / len;
        const dt = delta / 1000;

        const nextX = local.x + nx * MOVE_SPEED * dt;
        const nextY = local.y + ny * MOVE_SPEED * dt;
        local.setPosition(
            this.clamp(nextX, ARENA.x + PLAYER_SIZE / 2, ARENA.x + ARENA.width - PLAYER_SIZE / 2),
            this.clamp(nextY, ARENA.y + PLAYER_SIZE / 2, ARENA.y + ARENA.height - PLAYER_SIZE / 2)
        );
    }

    update(_time, delta) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return;
        }

        const input = this.getInputVector();
        this.predictLocalMovement(delta, input);

        // Send input only when it changes to reduce network spam.
        if (input.x !== this.lastSentInput.x || input.y !== this.lastSentInput.y) {
            this.socket.send(
                JSON.stringify({
                    type: 'input',
                    moveX: input.x,
                    moveY: input.y,
                    speed: MOVE_SPEED,
                })
            );
            this.lastSentInput = input;
        }
    }
}
