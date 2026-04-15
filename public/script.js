/* ════════════════════════════════════════════════════════════
   script.js  —  Main Application Controller (Mobile-First)
════════════════════════════════════════════════════════════ */
'use strict';

/* ─── DOM References ───────────────────────────────────── */
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
const chatStatusDotD   = document.getElementById('chat-status-dot-desk');
const chatPartnerName  = document.getElementById('chat-partner-name');
const chatPartnerNameD = document.getElementById('chat-partner-name-desk');
const partnerIdTag     = document.getElementById('partner-id-tag');
const partnerIdText    = document.getElementById('partner-id-text');
const myAnonLabel      = document.getElementById('my-anon-id');
const chatSheet        = document.getElementById('chat-sheet');
const chatHandle       = document.getElementById('chat-handle');
const chatToggleBtn    = document.getElementById('chat-toggle-btn');
const chatBadge        = document.getElementById('chat-badge');
const pipContainer     = document.getElementById('pip-container');
const reportSep        = document.querySelectorAll('.report-sep');

/* ─── App State ────────────────────────────────────────── */
let localStream          = null;
let isConnected          = false;
let myAnonId             = '';
let currentPartnerAnonId = '';
let chatPlaceholderEl    = document.getElementById('chat-placeholder');
const sentMessages       = new Set();

/* ─── Chat Sheet State ─────────────────────────────────── */
let chatOpen       = false;
let unreadCount    = 0;

/* ════════════════════════════════════════════════════════
   CHAT BOTTOM SHEET (mobile swipe-up)
════════════════════════════════════════════════════════ */
function openChat() {
    chatOpen = true;
    chatSheet.classList.add('open');
    chatSheet.style.transform = 'translateY(0)';
    unreadCount = 0;
    chatBadge.classList.add('hidden');
    chatBadge.innerText = '!';
    // Scroll to bottom
    setTimeout(() => { chatMessages.scrollTop = chatMessages.scrollHeight; }, 50);
}

function closeChat() {
    chatOpen = false;
    chatSheet.classList.remove('open');
    chatSheet.style.transform = '';
}

function toggleChat() {
    chatOpen ? closeChat() : openChat();
}

if (chatToggleBtn) chatToggleBtn.addEventListener('click', toggleChat);

/* ── Touch / Drag on handle ── */
let dragStartY = 0;
let dragging   = false;

if (chatHandle) {
    chatHandle.addEventListener('touchstart', (e) => {
        dragStartY = e.touches[0].clientY;
        dragging   = true;
        chatSheet.style.transition = 'none';
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!dragging) return;
        const dy = e.touches[0].clientY - dragStartY;
        if (chatOpen && dy > 0) {
            chatSheet.style.transform = `translateY(${dy}px)`;
        } else if (!chatOpen && dy < 0) {
            const pct = Math.max(0, 1 - Math.abs(dy) / 200);
            const peek = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--chat-open-height'));
            chatSheet.style.transform = `translateY(calc(100% - var(--chat-peek) - ${Math.abs(dy)}px))`;
        }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        if (!dragging) return;
        dragging = false;
        chatSheet.style.transition = '';
        const dy = e.changedTouches[0].clientY - dragStartY;
        if (chatOpen) {
            dy > 60 ? closeChat() : openChat();
        } else {
            dy < -60 ? openChat() : closeChat();
        }
    }, { passive: true });
}

/* ════════════════════════════════════════════════════════
   PiP LOCAL VIDEO — draggable on mobile
════════════════════════════════════════════════════════ */
if (pipContainer) {
    let pipDragging = false, pipStartX = 0, pipStartY = 0, pipOrigLeft = 0, pipOrigBottom = 0;

    pipContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        pipDragging = true;
        pipStartX   = e.touches[0].clientX;
        pipStartY   = e.touches[0].clientY;
        const rect  = pipContainer.getBoundingClientRect();
        pipOrigLeft   = rect.left;
        pipOrigBottom = window.innerHeight - rect.bottom;
        pipContainer.style.transition = 'none';
        pipContainer.style.right = 'auto';
        pipContainer.style.bottom = 'auto';
        pipContainer.style.left   = pipOrigLeft + 'px';
        pipContainer.style.top    = rect.top + 'px';
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!pipDragging) return;
        const dx = e.touches[0].clientX - pipStartX;
        const dy = e.touches[0].clientY - pipStartY;
        pipContainer.style.left = (pipOrigLeft + dx) + 'px';
        pipContainer.style.top  = (parseFloat(pipContainer.style.top) + dy - (e.touches[0].clientY - e.touches[0].clientY)) + 'px';
        pipStartX = e.touches[0].clientX;
        pipStartY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', () => {
        if (!pipDragging) return;
        pipDragging = false;
        pipContainer.style.transition = '';
        // Snap to nearest corner
        const rect = pipContainer.getBoundingClientRect();
        const midX = window.innerWidth  / 2;
        const midY = window.innerHeight / 2;
        pipContainer.style.left = pipContainer.style.top = pipContainer.style.right = pipContainer.style.bottom = '';
        if (rect.left < midX) {
            pipContainer.style.left = '16px';
        } else {
            pipContainer.style.right = '16px';
        }
        if (rect.top < midY) {
            pipContainer.style.top = '80px';
        } else {
            pipContainer.style.bottom = '200px';
        }
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
        console.error('[Media]', err);
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

function setChatStatus(online, partnerName) {
    const color = online ? '#22c55e' : '#4b5563';
    const name  = online ? (partnerName || 'Connected') : 'Offline';
    [chatStatusDot, chatStatusDotD].forEach(el => { if (el) el.style.background = color; });
    [chatPartnerName, chatPartnerNameD].forEach(el => { if (el) el.innerText = name; });
}

function showReport(show) {
    if (show) {
        reportBtn.classList.remove('hidden');
        reportSep.forEach(el => el.classList.remove('hidden'));
    } else {
        reportBtn.classList.add('hidden');
        reportSep.forEach(el => el.classList.add('hidden'));
    }
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

    searchingOverlay.classList.remove('hidden');
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

    searchingOverlay.classList.add('hidden');
    liveTag.classList.remove('hidden');
    if (partnerIdTag)  { partnerIdTag.classList.remove('hidden'); }
    if (partnerIdText) partnerIdText.innerText = partnerAnonId;
    showReport(true);
    setChatStatus(true, partnerAnonId);
    setConnStatus(myAnonId, 'green');

    appendSystemMessage(`Connected with ${partnerAnonId} 🌟`);
    enableChat();

    // Auto-open chat on match (mobile UX)
    if (window.innerWidth < 768) {
        setTimeout(openChat, 600);
    }

    setupPeerConnection(localStream, remoteVideo, (signal) => {
        socket.emit('webrtc-signal', signal);
    });
    if (isInitiator) {
        await createOffer((signal) => socket.emit('webrtc-signal', signal));
    }
});

socket.on('webrtc-signal', (data) => {
    handleSignal(data, (signal) => socket.emit('webrtc-signal', signal));
});

socket.on('partner-disconnected', () => {
    if (isConnected) appendSystemMessage('Stranger disconnected.');
    isConnected = false;
    setChatStatus(false);
});

socket.on('banned', ({ unbanDate }) => {
    bannedOverlay.classList.remove('hidden');
    bannedOverlay.classList.add('flex');
    if (banTimeText && unbanDate) {
        banTimeText.innerText = `Ban expires: ${new Date(unbanDate).toLocaleString()}`;
    }
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    teardown();
});

socket.on('system-warning', (msg) => appendSystemMessage('⚠️ ' + msg));

socket.on('chat-message', (text) => {
    if (typeof text !== 'string') return;
    appendRemoteMessage(text.trim().slice(0, 500));
    // Show unread badge when chat is closed
    if (!chatOpen && window.innerWidth < 768) {
        unreadCount++;
        chatBadge.classList.remove('hidden');
        chatBadge.innerText = unreadCount > 9 ? '9+' : String(unreadCount);
    }
});

/* ════════════════════════════════════════════════════════
   UI CONTROLS
════════════════════════════════════════════════════════ */
startBtn.addEventListener('click', () => socket.emit('start-search'));

nextBtn.addEventListener('click', () => {
    closeChat();
    socket.emit('next');
});

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

    const msgKey = Date.now() + ':' + text;
    if (sentMessages.has(msgKey)) return;
    sentMessages.add(msgKey);
    setTimeout(() => sentMessages.delete(msgKey), 3000);

    appendLocalMessage(text);
    socket.emit('chat-message', text);
    chatInput.value = '';
});

// Mic / Cam
document.getElementById('toggle-mic').addEventListener('click', function () {
    if (!localStream) return;
    const t = localStream.getAudioTracks()[0];
    if (!t) return;
    t.enabled = !t.enabled;
    this.classList.toggle('active');
});

document.getElementById('toggle-video').addEventListener('click', function () {
    if (!localStream) return;
    const t = localStream.getVideoTracks()[0];
    if (!t) return;
    t.enabled = !t.enabled;
    this.classList.toggle('active');
});

// Close chat when tapping on video area
document.addEventListener('click', (e) => {
    if (!chatOpen) return;
    if (chatSheet.contains(e.target)) return;
    if (chatToggleBtn && chatToggleBtn.contains(e.target)) return;
    if (window.innerWidth < 768) closeChat();
});

/* ════════════════════════════════════════════════════════
   CHAT UI HELPERS
════════════════════════════════════════════════════════ */
function removePlaceholder() {
    if (chatPlaceholderEl && chatPlaceholderEl.parentNode === chatMessages) {
        chatMessages.removeChild(chatPlaceholderEl);
        chatPlaceholderEl = null;
    }
}

function scrollChat() { chatMessages.scrollTop = chatMessages.scrollHeight; }

function appendLocalMessage(text) {
    removePlaceholder();
    const wrap   = document.createElement('div');
    wrap.className = 'msg-row-local';
    const name   = document.createElement('div');
    name.className = 'msg-name'; name.innerText = 'You';
    const bubble = document.createElement('div');
    bubble.className = 'local-msg'; bubble.innerText = text;
    wrap.append(name, bubble);
    chatMessages.appendChild(wrap);
    scrollChat();
}

function appendRemoteMessage(text) {
    removePlaceholder();
    const wrap   = document.createElement('div');
    wrap.className = 'msg-row-remote';
    const name   = document.createElement('div');
    name.className = 'msg-name'; name.innerText = currentPartnerAnonId || 'Stranger';
    const bubble = document.createElement('div');
    bubble.className = 'remote-msg'; bubble.innerText = text;
    wrap.append(name, bubble);
    chatMessages.appendChild(wrap);
    scrollChat();
}

function appendSystemMessage(text) {
    removePlaceholder();
    const el = document.createElement('div');
    el.className = 'system-msg'; el.innerText = text;
    chatMessages.appendChild(el);
    scrollChat();
}

function enableChat()  { chatInput.disabled = false; chatSubmit.disabled = false; chatInput.focus(); }
function disableChat() { chatInput.disabled = true;  chatSubmit.disabled = true; }

function resetChatUI() {
    chatMessages.innerHTML = '';
    chatPlaceholderEl = document.createElement('div');
    chatPlaceholderEl.id        = 'chat-placeholder';
    chatPlaceholderEl.className = 'text-center text-xs text-white/20 my-4';
    chatPlaceholderEl.innerText = 'Chat starts when you are matched.';
    chatMessages.appendChild(chatPlaceholderEl);
    sentMessages.clear();
    unreadCount = 0;
    if (chatBadge) chatBadge.classList.add('hidden');
}

/* ════════════════════════════════════════════════════════
   KEYBOARD: scroll chat input into view on mobile
════════════════════════════════════════════════════════ */
chatInput.addEventListener('focus', () => {
    if (window.innerWidth < 768) {
        openChat();
        setTimeout(() => chatInput.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }
});

/* ════════════════════════════════════════════════════════
   BOOT
════════════════════════════════════════════════════════ */
initMedia();
