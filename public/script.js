/* ════════════════════════════════════════════════════════════
   script.js  —  Main Application Controller
════════════════════════════════════════════════════════════ */
'use strict';

/* ─── DOM ──────────────────────────────────────────────── */
const localVideo        = document.getElementById('local-video');
const remoteVideo       = document.getElementById('remote-video');
const searchingOverlay  = document.getElementById('searching-overlay');
const startBtn          = document.getElementById('start-btn');
const overlayText       = document.getElementById('overlay-text');
const overlaySub        = document.getElementById('overlay-sub');
const liveTag           = document.getElementById('live-tag');
const nextBtn           = document.getElementById('next-btn');
const reportBtn         = document.getElementById('report-btn');
const bannedOverlay     = document.getElementById('banned-overlay');
const banTimeText       = document.getElementById('ban-time');
const chatMessages      = document.getElementById('chat-messages');
const chatForm          = document.getElementById('chat-form');
const chatInput         = document.getElementById('chat-input');
const chatSubmit        = document.getElementById('chat-submit');
const connStatus        = document.getElementById('connection-status');
const connDot           = document.getElementById('conn-dot');
const chatStatusDot     = document.getElementById('chat-status-dot');
const chatStatusDotD    = document.getElementById('chat-status-dot-desk');
const chatPartnerName   = document.getElementById('chat-partner-name');
const chatPartnerNameD  = document.getElementById('chat-partner-name-desk');
const partnerIdTag      = document.getElementById('partner-id-tag');
const partnerIdText     = document.getElementById('partner-id-text');
const myAnonLabel       = document.getElementById('my-anon-id');
const chatPanel         = document.getElementById('chat-panel');
const chatHandle        = document.getElementById('chat-handle');
const chatToggleBtn     = document.getElementById('chat-toggle-btn');
const chatBadge         = document.getElementById('chat-badge');
const pipContainer      = document.getElementById('pip-container');
const reportSeps        = document.querySelectorAll('.report-sep');

/* ─── State ────────────────────────────────────────────── */
let localStream          = null;
let isConnected          = false;
let myAnonId             = '';
let currentPartnerAnonId = '';
let chatPlaceholderEl    = document.getElementById('chat-placeholder');
const sentMessages       = new Set();

/* ─── Is mobile? ───────────────────────────────────────── */
const isMobile = () => window.innerWidth < 768;

/* ════════════════════════════════════════════════════════
   CHAT PANEL  (collapsible on mobile, always open on desktop)
════════════════════════════════════════════════════════ */
let chatOpen = false;
let unreadCount = 0;

function openChat() {
    if (!isMobile()) return; // desktop: always open
    chatOpen = true;
    chatPanel.classList.add('open');
    unreadCount = 0;
    if (chatBadge) { chatBadge.classList.add('hidden'); chatBadge.innerText = '!'; }
    setTimeout(() => { chatMessages.scrollTop = chatMessages.scrollHeight; }, 60);
}

function closeChat() {
    if (!isMobile()) return;
    chatOpen = false;
    chatPanel.classList.remove('open');
}

function toggleChat() { chatOpen ? closeChat() : openChat(); }

if (chatToggleBtn) chatToggleBtn.addEventListener('click', toggleChat);

/* ── Touch drag on handle ── */
let dragStartY   = 0;
let dragWasDragging = false;

if (chatHandle) {
    chatHandle.addEventListener('touchstart', (e) => {
        dragStartY = e.touches[0].clientY;
        dragWasDragging = false;
        chatPanel.style.transition = 'none';
    }, { passive: true });

    chatHandle.addEventListener('touchmove', (e) => {
        dragWasDragging = true;
        const dy = e.touches[0].clientY - dragStartY;
        // Drag down to close (when open), drag up to open (when closed)
        if (chatOpen && dy > 0) {
            chatPanel.style.height = `calc(var(--chat-open, 52vh) - ${dy}px)`;
        }
    }, { passive: true });

    chatHandle.addEventListener('touchend', (e) => {
        chatPanel.style.transition = '';
        chatPanel.style.height = '';
        if (!dragWasDragging) { toggleChat(); return; }
        const dy = e.changedTouches[0].clientY - dragStartY;
        if (chatOpen && dy > 70) { closeChat(); }
        else if (!chatOpen && dy < -70) { openChat(); }
        else { chatOpen ? openChat() : closeChat(); }
    }, { passive: true });
}

/* ── Tap video to close chat ── */
document.getElementById('video-stage')?.addEventListener('click', () => {
    if (chatOpen && isMobile()) closeChat();
});

/* ════════════════════════════════════════════════════════
   PiP DRAG  (touch only, snaps to nearest corner)
════════════════════════════════════════════════════════ */
if (pipContainer) {
    let pip = { dragging: false, startX: 0, startY: 0 };

    pipContainer.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        const t = e.touches[0];
        const r = pipContainer.getBoundingClientRect();
        pip = { dragging: true, startX: t.clientX - r.left, startY: t.clientY - r.top };
        pipContainer.style.transition = 'none';
        // Switch from bottom/right to top/left for free movement
        pipContainer.style.bottom = pipContainer.style.right = '';
        pipContainer.style.left = r.left + 'px';
        pipContainer.style.top  = r.top  + 'px';
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!pip.dragging) return;
        const t   = e.touches[0];
        const stage = document.getElementById('video-stage').getBoundingClientRect();
        const pw  = pipContainer.offsetWidth;
        const ph  = pipContainer.offsetHeight;
        let x = t.clientX - pip.startX - stage.left;
        let y = t.clientY - pip.startY - stage.top;
        x = Math.max(8, Math.min(stage.width  - pw - 8, x));
        y = Math.max(8, Math.min(stage.height - ph - 8, y));
        pipContainer.style.left = x + 'px';
        pipContainer.style.top  = y + 'px';
    }, { passive: true });

    document.addEventListener('touchend', () => {
        if (!pip.dragging) return;
        pip.dragging = false;
        pipContainer.style.transition = 'box-shadow .2s';
        // Snap to nearest corner
        const stage = document.getElementById('video-stage').getBoundingClientRect();
        const r     = pipContainer.getBoundingClientRect();
        const cx    = r.left + r.width  / 2 - stage.left;
        const cy    = r.top  + r.height / 2 - stage.top;
        pipContainer.style.top = pipContainer.style.left = pipContainer.style.right = pipContainer.style.bottom = '';
        if (cx < stage.width / 2)  { pipContainer.style.left  = '12px'; }
        else                        { pipContainer.style.right = '12px'; }
        if (cy < stage.height / 2) { pipContainer.style.top    = '12px'; }
        else                        { pipContainer.style.bottom = '90px'; }
    }, { passive: true });
}

/* ════════════════════════════════════════════════════════
   MEDIA
════════════════════════════════════════════════════════ */
async function initMedia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            audio: true,
        });
        localVideo.srcObject = localStream;
        setOverlay('Camera ready', 'Tap START to find a stranger');
        startBtn.classList.remove('hidden');
        setConnStatus(myAnonId || 'Online', 'green');
    } catch (err) {
        console.error('[Media]', err.name, err.message);
        setOverlay('Camera access denied', 'Please allow camera & microphone, then refresh');
        setConnStatus('Error', 'red');
    }
}

/* ════════════════════════════════════════════════════════
   UI HELPERS
════════════════════════════════════════════════════════ */
function setConnStatus(label, color) {
    if (connStatus) connStatus.innerText = label;
    if (connDot) {
        const c = { green:'#22c55e', yellow:'#facc15', red:'#ef4444', gray:'#6b7280' };
        connDot.style.background = c[color] || c.gray;
    }
}

function setOverlay(title, sub) {
    if (overlayText) overlayText.innerText = title;
    if (overlaySub)  overlaySub.innerText  = sub || '';
}

function setChatStatus(online, name) {
    const color = online ? '#22c55e' : '#4b5563';
    const label = online ? (name || 'Connected') : 'Offline';
    [chatStatusDot, chatStatusDotD].forEach(el => { if (el) el.style.background = color; });
    [chatPartnerName, chatPartnerNameD].forEach(el => { if (el) el.innerText = label; });
}

function showReport(show) {
    reportBtn.classList.toggle('hidden', !show);
    reportSeps.forEach(el => el.classList.toggle('hidden', !show));
}

/* ════════════════════════════════════════════════════════
   SOCKET EVENTS
════════════════════════════════════════════════════════ */
window.addEventListener('socket:connect',      () => setConnStatus(myAnonId || 'Connecting…', 'yellow'));
window.addEventListener('socket:disconnect',   () => { setConnStatus('Reconnecting…', 'red'); resetChatUI(); });
window.addEventListener('socket:reconnecting', () => setConnStatus('Reconnecting…', 'yellow'));
window.addEventListener('socket:reconnect',    () => setConnStatus(myAnonId || 'Reconnected', 'green'));

socket.on('your-id', (id) => {
    myAnonId = id;
    if (myAnonLabel) myAnonLabel.innerText = id;
    setConnStatus(id, 'green');
});

socket.on('searching', () => {
    isConnected          = false;
    currentPartnerAnonId = '';
    teardown();
    remoteVideo.srcObject = null;

    searchingOverlay.style.display = '';  // show overlay
    liveTag.classList.add('hidden');
    if (partnerIdTag) partnerIdTag.classList.add('hidden');
    showReport(false);
    setChatStatus(false);
    closeChat();

    setOverlay('Searching for a stranger…', 'Looking for someone to connect with');
    setConnStatus(myAnonId, 'yellow');
    resetChatUI();
    appendSystemMessage('Searching for a stranger…');
    disableChat();
});

socket.on('matched', async ({ partnerAnonId, isInitiator }) => {
    isConnected          = true;
    currentPartnerAnonId = partnerAnonId;

    searchingOverlay.style.display = 'none';  // hide overlay
    liveTag.classList.remove('hidden');
    if (partnerIdTag)  partnerIdTag.classList.remove('hidden');
    if (partnerIdText) partnerIdText.innerText = partnerAnonId;
    showReport(true);
    setChatStatus(true, partnerAnonId);
    setConnStatus(myAnonId, 'green');

    appendSystemMessage(`Connected with ${partnerAnonId} 🌟`);
    enableChat();

    // Auto-open chat on mobile when matched
    if (isMobile()) setTimeout(openChat, 700);

    setupPeerConnection(localStream, remoteVideo, (sig) => socket.emit('webrtc-signal', sig));
    if (isInitiator) await createOffer((sig) => socket.emit('webrtc-signal', sig));
});

socket.on('webrtc-signal', (data) => {
    handleSignal(data, (sig) => socket.emit('webrtc-signal', sig));
});

socket.on('partner-disconnected', () => {
    if (isConnected) appendSystemMessage('Stranger disconnected.');
    isConnected = false;
    setChatStatus(false);
});

socket.on('banned', ({ unbanDate }) => {
    bannedOverlay.classList.remove('hidden');
    bannedOverlay.style.display = 'flex';
    if (banTimeText && unbanDate)
        banTimeText.innerText = `Ban expires: ${new Date(unbanDate).toLocaleString()}`;
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    teardown();
});

socket.on('system-warning', (msg) => appendSystemMessage('⚠️ ' + msg));

socket.on('chat-message', (text) => {
    if (typeof text !== 'string') return;
    appendRemoteMessage(text.trim().slice(0, 500));
    if (isMobile() && !chatOpen) {
        unreadCount++;
        if (chatBadge) {
            chatBadge.classList.remove('hidden');
            chatBadge.innerText = unreadCount > 9 ? '9+' : String(unreadCount);
        }
    }
});

/* ════════════════════════════════════════════════════════
   CONTROLS
════════════════════════════════════════════════════════ */
startBtn.addEventListener('click', () => socket.emit('start-search'));
nextBtn.addEventListener('click',  () => { closeChat(); socket.emit('next'); });

reportBtn.addEventListener('click', () => {
    if (!isConnected) return;
    socket.emit('report-partner');
    appendSystemMessage('⚠️ Report submitted.');
    showReport(false);
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim().slice(0, 500);
    if (!text || !isConnected) return;
    const key = Date.now() + text;
    if (sentMessages.has(key)) return;
    sentMessages.add(key);
    setTimeout(() => sentMessages.delete(key), 3000);
    appendLocalMessage(text);
    socket.emit('chat-message', text);
    chatInput.value = '';
});

document.getElementById('toggle-mic').addEventListener('click', function () {
    if (!localStream) return;
    const t = localStream.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; this.classList.toggle('active'); }
});

document.getElementById('toggle-video-btn').addEventListener('click', function () {
    if (!localStream) return;
    const t = localStream.getVideoTracks()[0];
    if (t) { t.enabled = !t.enabled; this.classList.toggle('active'); }
});

chatInput.addEventListener('focus', () => {
    if (isMobile()) { openChat(); setTimeout(() => chatInput.scrollIntoView({ behavior:'smooth', block:'center' }), 300); }
});

/* ════════════════════════════════════════════════════════
   CHAT UI
════════════════════════════════════════════════════════ */
function removePlaceholder() {
    if (chatPlaceholderEl?.parentNode === chatMessages) {
        chatMessages.removeChild(chatPlaceholderEl);
        chatPlaceholderEl = null;
    }
}
const scrollChat = () => { chatMessages.scrollTop = chatMessages.scrollHeight; };

function appendLocalMessage(text) {
    removePlaceholder();
    const wrap = document.createElement('div'); wrap.className = 'msg-row-local';
    const name = document.createElement('div'); name.className = 'msg-name'; name.innerText = 'You';
    const b    = document.createElement('div'); b.className = 'local-msg';   b.innerText = text;
    wrap.append(name, b); chatMessages.appendChild(wrap); scrollChat();
}

function appendRemoteMessage(text) {
    removePlaceholder();
    const wrap = document.createElement('div'); wrap.className = 'msg-row-remote';
    const name = document.createElement('div'); name.className = 'msg-name'; name.innerText = currentPartnerAnonId || 'Stranger';
    const b    = document.createElement('div'); b.className = 'remote-msg';  b.innerText = text;
    wrap.append(name, b); chatMessages.appendChild(wrap); scrollChat();
}

function appendSystemMessage(text) {
    removePlaceholder();
    const el = document.createElement('div'); el.className = 'system-msg'; el.innerText = text;
    chatMessages.appendChild(el); scrollChat();
}

function enableChat()  { chatInput.disabled = false; chatSubmit.disabled = false; chatInput.focus(); }
function disableChat() { chatInput.disabled = true;  chatSubmit.disabled = true; }

function resetChatUI() {
    chatMessages.innerHTML = '';
    chatPlaceholderEl = document.createElement('div');
    chatPlaceholderEl.id = 'chat-placeholder';
    chatPlaceholderEl.className = 'chat-placeholder';
    chatPlaceholderEl.innerText = 'Chat starts when you are matched.';
    chatMessages.appendChild(chatPlaceholderEl);
    sentMessages.clear();
    unreadCount = 0;
    if (chatBadge) chatBadge.classList.add('hidden');
}

/* ════════════════════════════════════════════════════════
   BOOT
════════════════════════════════════════════════════════ */
initMedia();
