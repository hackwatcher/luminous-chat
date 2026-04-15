/* ════════════════════════════════════════════════════════════
   script.js  —  Main application controller
   Orchestrates: Socket.IO  ·  WebRTC  ·  Chat  ·  UI State
════════════════════════════════════════════════════════════ */

'use strict';

/* ─── DOM References ──────────────────────────────────────── */
const localVideo       = document.getElementById('local-video');
const remoteVideo      = document.getElementById('remote-video');
const searchingOverlay = document.getElementById('searching-overlay');
const startBtn         = document.getElementById('start-btn');
const overlayText      = document.getElementById('overlay-text');
const overlaySub       = document.getElementById('overlay-sub');
const liveTag          = document.getElementById('live-tag');
const nextBtn          = document.getElementById('next-btn');
const reportBtn        = document.getElementById('report-btn');
const bannedOverlay    = document.getElementById('banned-overlay');
const banTimeText      = document.getElementById('ban-time');
const chatMessages     = document.getElementById('chat-messages');
const chatForm         = document.getElementById('chat-form');
const chatInput        = document.getElementById('chat-input');
const chatSubmit       = document.getElementById('chat-submit');
const connStatus       = document.getElementById('connection-status');
const connDot          = document.getElementById('conn-dot');
const chatStatusDot    = document.getElementById('chat-status-dot');
const chatPartnerName  = document.getElementById('chat-partner-name');
const partnerIdTag     = document.getElementById('partner-id-tag');
const partnerIdText    = document.getElementById('partner-id-text');
const myAnonLabel      = document.getElementById('my-anon-id');

/* ─── Application State ───────────────────────────────────── */
let localStream          = null;
let isConnected          = false;
let myAnonId             = '';
let currentPartnerAnonId = '';
let chatPlaceholderEl    = document.getElementById('chat-placeholder');

/* ─── Duplicate-message guard ─────────────────────────────── */
const sentMessages = new Set();

/* ═══════════════════════════════════════════════════════════
   1. MEDIA
═══════════════════════════════════════════════════════════ */

async function initMedia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video : { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio : true,
        });
        localVideo.srcObject = localStream;
        setOverlay('Camera ready', 'Click START to find a stranger');
        startBtn.classList.remove('hidden');
        setConnStatus(myAnonId || 'Online', 'green');
    } catch (err) {
        console.error('[Media]', err);
        setOverlay('Camera access denied', 'Please allow camera & microphone and refresh');
        setConnStatus('Error', 'red');
    }
}

/* ═══════════════════════════════════════════════════════════
   2. CONNECTION STATUS HELPERS
═══════════════════════════════════════════════════════════ */

function setConnStatus(label, color) {
    if (connStatus) connStatus.innerText = label;
    if (connDot) {
        const colors = { green: '#22c55e', yellow: '#facc15', red: '#ef4444', gray: '#6b7280' };
        connDot.style.background = colors[color] || colors.gray;
    }
}

function setOverlay(title, sub) {
    if (overlayText) overlayText.innerText = title;
    if (overlaySub)  overlaySub.innerText  = sub  || '';
}

/* ═══════════════════════════════════════════════════════════
   3. SOCKET — global window.socket injected by services/socket.js
═══════════════════════════════════════════════════════════ */

window.addEventListener('socket:connect',     ()  => setConnStatus(myAnonId || 'Connecting…', 'yellow'));
window.addEventListener('socket:disconnect',  (e) => {
    setConnStatus('Disconnected — reconnecting…', 'red');
    resetChatUI();
});
window.addEventListener('socket:reconnecting', () => setConnStatus('Reconnecting…', 'yellow'));
window.addEventListener('socket:reconnect',    () => setConnStatus(myAnonId || 'Reconnected', 'green'));
window.addEventListener('socket:error',       (e) => setConnStatus('Connection error', 'red'));

/* ─── Your anonymous ID ────────────────────────────────────── */
socket.on('your-id', (id) => {
    myAnonId = id;
    if (myAnonLabel) myAnonLabel.innerText = id;
    setConnStatus(id, 'green');
});

/* ─── Searching ────────────────────────────────────────────── */
socket.on('searching', () => {
    isConnected          = false;
    currentPartnerAnonId = '';

    // Tear down WebRTC
    teardown();
    if (remoteVideo.srcObject) {
        remoteVideo.srcObject = null;
    }

    // UI reset
    searchingOverlay.classList.remove('hidden');
    liveTag.classList.add('hidden');
    remoteVideo.classList.add('hidden');
    if (partnerIdTag)   partnerIdTag.classList.add('hidden');
    if (reportBtn)      reportBtn.classList.add('hidden');
    if (chatStatusDot)  chatStatusDot.style.background = '#4b5563';
    if (chatPartnerName) chatPartnerName.innerText = 'Offline';

    setOverlay('Searching for a stranger…', 'Looking for someone to connect with');
    setConnStatus(myAnonId, 'yellow');

    resetChatUI();
    appendSystemMessage('Searching for a stranger…');
    disableChat();
});

/* ─── Matched ──────────────────────────────────────────────── */
socket.on('matched', async ({ partnerAnonId, isInitiator }) => {
    isConnected          = true;
    currentPartnerAnonId = partnerAnonId;

    searchingOverlay.classList.add('hidden');
    liveTag.classList.remove('hidden');
    remoteVideo.classList.remove('hidden');
    if (partnerIdTag)    { partnerIdTag.classList.remove('hidden'); }
    if (partnerIdText)   partnerIdText.innerText = partnerAnonId;
    if (chatStatusDot)   chatStatusDot.style.background = '#22c55e';
    if (chatPartnerName) chatPartnerName.innerText = partnerAnonId;
    if (reportBtn)       reportBtn.classList.remove('hidden');

    setConnStatus(myAnonId, 'green');
    appendSystemMessage(`Connected with ${partnerAnonId} 🌟`);
    enableChat();

    // WebRTC handshake
    setupPeerConnection(localStream, remoteVideo, (signal) => {
        socket.emit('webrtc-signal', signal);
    });

    if (isInitiator) {
        await createOffer((signal) => socket.emit('webrtc-signal', signal));
    }
});

/* ─── WebRTC Signal relay ──────────────────────────────────── */
socket.on('webrtc-signal', (data) => {
    handleSignal(data, (signal) => socket.emit('webrtc-signal', signal));
});

/* ─── Partner disconnected ─────────────────────────────────── */
socket.on('partner-disconnected', () => {
    if (isConnected) appendSystemMessage('Stranger disconnected.');
    isConnected = false;
});

/* ─── Banned ───────────────────────────────────────────────── */
socket.on('banned', ({ unbanDate }) => {
    bannedOverlay.classList.remove('hidden');
    bannedOverlay.classList.add('flex');
    if (banTimeText && unbanDate) {
        banTimeText.innerText = `Ban expires: ${new Date(unbanDate).toLocaleString()}`;
    }
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    teardown();
});

/* ─── System warning ───────────────────────────────────────── */
socket.on('system-warning', (msg) => appendSystemMessage('⚠️ ' + msg));

/* ─── Incoming chat message ────────────────────────────────── */
socket.on('chat-message', (text) => {
    if (typeof text !== 'string') return;
    appendRemoteMessage(text.trim().slice(0, 500));
});

/* ═══════════════════════════════════════════════════════════
   4. UI CONTROLS
═══════════════════════════════════════════════════════════ */

startBtn.addEventListener('click', () => {
    socket.emit('start-search');
});

nextBtn.addEventListener('click', () => {
    socket.emit('next');
});

reportBtn.addEventListener('click', () => {
    if (!isConnected) return;
    socket.emit('report-partner');
    appendSystemMessage('⚠️ Report submitted.');
    reportBtn.classList.add('hidden');
});

/* ─── Chat form ─────────────────────────────────────────────── */
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim().slice(0, 500);
    if (!text || !isConnected) return;

    // Deduplicate (prevent double-send on fast re-renders)
    const msgKey = Date.now() + ':' + text;
    if (sentMessages.has(msgKey)) return;
    sentMessages.add(msgKey);
    setTimeout(() => sentMessages.delete(msgKey), 3000);

    appendLocalMessage(text);
    socket.emit('chat-message', text);
    chatInput.value = '';
});

/* ─── Mic / Cam toggles ────────────────────────────────────── */
document.getElementById('toggle-mic').addEventListener('click', function () {
    if (!localStream) return;
    const track = localStream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    this.classList.toggle('active');
});

document.getElementById('toggle-video').addEventListener('click', function () {
    if (!localStream) return;
    const track = localStream.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    this.classList.toggle('active');
});

/* ═══════════════════════════════════════════════════════════
   5. CHAT UI HELPERS
═══════════════════════════════════════════════════════════ */

function removePlaceholder() {
    if (chatPlaceholderEl && chatPlaceholderEl.parentNode === chatMessages) {
        chatMessages.removeChild(chatPlaceholderEl);
        chatPlaceholderEl = null;
    }
}

function scrollChat() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendLocalMessage(text) {
    removePlaceholder();
    const wrap = document.createElement('div');
    wrap.className = 'msg-row-local';
    const name = document.createElement('div');
    name.className = 'msg-name';
    name.innerText = 'You';
    const bubble = document.createElement('div');
    bubble.className = 'local-msg';
    bubble.innerText = text;
    wrap.append(name, bubble);
    chatMessages.appendChild(wrap);
    scrollChat();
}

function appendRemoteMessage(text) {
    removePlaceholder();
    const wrap = document.createElement('div');
    wrap.className = 'msg-row-remote';
    const name = document.createElement('div');
    name.className = 'msg-name';
    name.innerText = currentPartnerAnonId || 'Stranger';
    const bubble = document.createElement('div');
    bubble.className = 'remote-msg';
    bubble.innerText = text;
    wrap.append(name, bubble);
    chatMessages.appendChild(wrap);
    scrollChat();
}

function appendSystemMessage(text) {
    removePlaceholder();
    const el = document.createElement('div');
    el.className = 'system-msg';
    el.innerText = text;
    chatMessages.appendChild(el);
    scrollChat();
}

function enableChat() {
    chatInput.disabled  = false;
    chatSubmit.disabled = false;
    chatInput.focus();
}

function disableChat() {
    chatInput.disabled  = true;
    chatSubmit.disabled = true;
}

function resetChatUI() {
    chatMessages.innerHTML = '';
    chatPlaceholderEl = document.createElement('div');
    chatPlaceholderEl.id        = 'chat-placeholder';
    chatPlaceholderEl.className = 'text-center text-xs text-white/25 my-4 font-body';
    chatPlaceholderEl.innerText = 'Chat starts when you are matched.';
    chatMessages.appendChild(chatPlaceholderEl);
    sentMessages.clear();
}

/* ═══════════════════════════════════════════════════════════
   6. BOOT
═══════════════════════════════════════════════════════════ */

initMedia();
