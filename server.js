'use strict';

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');
const crypto     = require('crypto');

// ─── App Setup ────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD  = NODE_ENV === 'production';
const PORT     = parseInt(process.env.PORT || '3000', 10);
const HOST     = process.env.HOST || '0.0.0.0';

if (IS_PROD) app.set('trust proxy', 1);

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

// ─── Socket.IO ────────────────────────────────────────────────
const io = new Server(server, {
    pingTimeout:  20000,
    pingInterval: 10000,
    cors: {
        origin : IS_PROD ? ALLOWED_ORIGINS : '*',
        methods : ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
});

// ─── Static Files ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ─── Health Check ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({
        status  : 'ok',
        env     : NODE_ENV,
        uptime  : Math.floor(process.uptime()),
        memory  : process.memoryUsage().heapUsed,
        waiting : waitingQueue.size,
        online  : io.sockets.sockets.size,
    });
});

app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ═══════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════

/** @type {Set<string>} socket IDs waiting for a match */
const waitingQueue = new Set();

/** @type {Map<string, string>} roomId → partnerSocketId for quick cleanup */
const roomMap = new Map();

// ─── Ban Records ──────────────────────────────────────────────
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** @type {Map<string, {banUntil:number, penaltyPhase:number, reports:number}>} */
const ipRecords = new Map();

function getIPRecord(ip) {
    if (!ipRecords.has(ip)) {
        ipRecords.set(ip, { banUntil: 0, penaltyPhase: 0, reports: 0 });
    }
    return ipRecords.get(ip);
}

// ─── Memory Leak Guard ────────────────────────────────────────
// Purge stale IP records once every 6 hours
setInterval(() => {
    const now = Date.now();
    for (const [ip, rec] of ipRecords) {
        if (rec.banUntil < now && rec.reports === 0) ipRecords.delete(ip);
    }
    // Remove ghost sockets from queue
    for (const id of waitingQueue) {
        if (!io.sockets.sockets.has(id)) waitingQueue.delete(id);
    }
}, 6 * 60 * 60 * 1000);

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Fixed-window rate limiter stored on the socket object.
 * Returns true if the limit is exceeded.
 */
function rateLimit(socket, key, maxCalls, windowMs) {
    const now = Date.now();
    if (!socket._rl) socket._rl = {};
    if (!socket._rl[key] || now > socket._rl[key].reset) {
        socket._rl[key] = { count: 0, reset: now + windowMs };
    }
    socket._rl[key].count++;
    return socket._rl[key].count > maxCalls;
}

/** Generate a short readable anonymous ID */
function genAnonId() {
    const adjectives = ['Cool','Fast','Dark','Bold','Neon','Wild','Soft','Calm','Brave','Sharp'];
    const nouns      = ['Fox','Wolf','Hawk','Bear','Lion','Puma','Lynx','Crow','Owl','Tiger'];
    const adj  = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num  = Math.floor(100 + Math.random() * 900);
    return `${adj}${noun}${num}`;
}

/** Remove a socket from the waiting queue */
function dequeue(socketId) {
    waitingQueue.delete(socketId);
}

/**
 * Handle room teardown when one peer leaves.
 * Notifies the remaining peer and requeues them.
 */
function handleLeave(leavingSocket) {
    const room = leavingSocket.currentRoom;
    if (!room) return;

    leavingSocket.leave(room);
    leavingSocket.currentRoom = null;

    // Find and notify the partner
    const sockets = io.sockets.adapter.rooms.get(room);
    if (sockets) {
        for (const partnerId of sockets) {
            const partner = io.sockets.sockets.get(partnerId);
            if (partner && partner.connected) {
                partner.leave(room);
                partner.currentRoom = null;
                partner.emit('partner-disconnected');

                // Auto-requeue the lonely partner
                console.log(`[↩  Requeue] ${partner.anonId} sent back to queue`);
                enqueue(partner);
            }
        }
    }

    roomMap.delete(room);
}

/**
 * Add a socket to the waiting queue and attempt an immediate match.
 * Guarantees: no duplicate entries, no self-match, no ghost matches.
 */
function enqueue(userSocket) {
    // Already matched → tear down first
    if (userSocket.currentRoom) handleLeave(userSocket);

    // Remove stale entry just in case
    dequeue(userSocket.id);

    // Tell the client to show Searching UI
    userSocket.emit('searching');

    // Try to match immediately
    for (const candidateId of waitingQueue) {
        if (candidateId === userSocket.id) continue;

        const partner = io.sockets.sockets.get(candidateId);
        if (!partner || !partner.connected) {
            waitingQueue.delete(candidateId); // purge ghost
            continue;
        }

        // Found a live partner → create room
        waitingQueue.delete(candidateId);
        const roomId = `room_${crypto.randomBytes(6).toString('hex')}`;

        userSocket.join(roomId);
        partner.join(roomId);
        userSocket.currentRoom = roomId;
        partner.currentRoom    = roomId;
        roomMap.set(roomId, candidateId);

        io.to(userSocket.id).emit('matched', {
            partnerAnonId : partner.anonId,
            isInitiator   : true,
        });
        io.to(candidateId).emit('matched', {
            partnerAnonId : userSocket.anonId,
            isInitiator   : false,
        });

        console.log(`[✓ Matched] ${userSocket.anonId} ↔ ${partner.anonId}  (${roomId})`);
        return;
    }

    // No partner available → wait in queue
    waitingQueue.add(userSocket.id);
    console.log(`[⏳ Queue]  ${userSocket.anonId} waiting  (queue=${waitingQueue.size})`);
}

// ═══════════════════════════════════════════════════════════════
//  SOCKET EVENTS
// ═══════════════════════════════════════════════════════════════

io.on('connection', (socket) => {
    const userIP = (socket.handshake.headers['x-forwarded-for'] || socket.handshake.address || '').split(',')[0].trim();
    const rec    = getIPRecord(userIP);

    // ── Ban check ────────────────────────────────────────────
    if (rec.banUntil > Date.now()) {
        console.log(`[🚫 Banned] ${userIP} tried to connect`);
        socket.emit('banned', { unbanDate: rec.banUntil });
        socket.disconnect(true);
        return;
    }

    // ── Assign identity ───────────────────────────────────────
    socket.anonId      = genAnonId();
    socket.currentRoom = null;
    socket._rl         = {};

    console.log(`[+ Connect] ${socket.id}  →  ${socket.anonId}`);
    socket.emit('your-id', socket.anonId);

    // ── start-search ──────────────────────────────────────────
    socket.on('start-search', () => {
        enqueue(socket);
    });

    // ── chat-message ──────────────────────────────────────────
    socket.on('chat-message', (msg) => {
        if (typeof msg !== 'string') return;
        const text = msg.trim().slice(0, 500);
        if (!text) return;

        // Rate limit: 6 messages / 4 seconds
        if (rateLimit(socket, 'chat', 6, 4000)) {
            socket.emit('system-warning', 'Slow down — you are sending messages too fast.');
            return;
        }

        if (socket.currentRoom) {
            socket.to(socket.currentRoom).emit('chat-message', text);
        }
    });

    // ── webrtc-signal ─────────────────────────────────────────
    socket.on('webrtc-signal', (data) => {
        if (!socket.currentRoom || !data) return;
        socket.to(socket.currentRoom).emit('webrtc-signal', data);
    });

    // ── next ──────────────────────────────────────────────────
    socket.on('next', () => {
        // Rate limit: 5 skips / 15 seconds
        if (rateLimit(socket, 'next', 5, 15000)) {
            socket.emit('system-warning', 'You are skipping too fast. Please wait a moment.');
            return;
        }
        handleLeave(socket);
        enqueue(socket);
    });

    // ── report-partner ────────────────────────────────────────
    socket.on('report-partner', () => {
        if (!socket.currentRoom) return;

        const sockets = io.sockets.adapter.rooms.get(socket.currentRoom);
        if (!sockets) return;

        for (const partnerId of sockets) {
            if (partnerId === socket.id) continue;
            const partner = io.sockets.sockets.get(partnerId);
            if (!partner) continue;

            const pIP  = (partner.handshake.headers['x-forwarded-for'] || partner.handshake.address || '').split(',')[0].trim();
            const pRec = getIPRecord(pIP);

            pRec.reports++;

            const threshold = pRec.penaltyPhase === 0 ? 3
                            : pRec.penaltyPhase === 1 ? 2
                            : 1;

            console.log(`[⚑ Report] ${pIP}  reports=${pRec.reports}/${threshold}  phase=${pRec.penaltyPhase}`);

            if (pRec.reports >= threshold) {
                pRec.banUntil     = Date.now() + ONE_DAY_MS;
                pRec.penaltyPhase++;
                pRec.reports      = 0;
                console.log(`[🚫 Ban]   ${pIP}  phase=${pRec.penaltyPhase}`);
                partner.emit('banned', { unbanDate: pRec.banUntil });
                handleLeave(partner);
                partner.disconnect(true);
            }
        }
    });

    // ── disconnect ────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
        console.log(`[- Disconnect] ${socket.anonId}  reason=${reason}`);
        handleLeave(socket);
        dequeue(socket.id);
    });
});

// ═══════════════════════════════════════════════════════════════
//  START
// ═══════════════════════════════════════════════════════════════

server.listen(PORT, HOST, () => {
    console.log(`\n🚀  Luminous Chat  [${NODE_ENV}]`);
    console.log(`    http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}\n`);
});
