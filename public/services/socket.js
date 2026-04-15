/* ─── Services / socket.js ────────────────────────────────────
   Single Socket.IO instance shared across all modules.
   The socket auto-reconnects; callers just import this file.
──────────────────────────────────────────────────────────────── */

// Socket.IO instance automatically connects to the host that served the page
const socket = io(window.location.origin, {
    transports   : ['websocket', 'polling'],
    reconnection : true,
    reconnectionAttempts : Infinity,
    reconnectionDelay    : 1000,
    reconnectionDelayMax : 8000,
    timeout              : 20000,
});

// Surface connection state changes to the top-level UI handler
socket.on('connect',         () => window.dispatchEvent(new CustomEvent('socket:connect')));
socket.on('disconnect',      (r) => window.dispatchEvent(new CustomEvent('socket:disconnect', { detail: r })));
socket.on('connect_error',   (e) => window.dispatchEvent(new CustomEvent('socket:error',      { detail: e.message })));
socket.on('reconnect',       (n) => window.dispatchEvent(new CustomEvent('socket:reconnect',  { detail: n })));
socket.on('reconnect_attempt', () => window.dispatchEvent(new CustomEvent('socket:reconnecting')));
