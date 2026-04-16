/* ════════════════════════════════════════════════════════════
   script.js  —  Main Application Controller (Pulse UI Version)
   Handles Dynamic Screen Loading & Logic Binding
════════════════════════════════════════════════════════════ */
'use strict';

/* ─── Global State ───────────────────────────────────────── */
const appContainer = document.getElementById('app-container');
let currentScreen  = '';
let localStream     = null;
let isSearchActive  = false;

/* ─── Screen Manager ─────────────────────────────────────── */
async function loadScreen(screenName) {
    if (currentScreen === screenName) return;
    
    // Smooth transition
    appContainer.classList.add('screen-fade-out');
    
    try {
        const response = await fetch(`/screens/${screenName}.html`);
        let html = await response.text();
        
        // Strip <html>, <head>, <body> tags if present in the partial
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        // Extract content from body or take the whole thing if no body
        const content = doc.body ? doc.body.innerHTML : html;
        
        setTimeout(() => {
            appContainer.innerHTML = content;
            appContainer.classList.remove('screen-fade-out');
            currentScreen = screenName;
            bindScreenLogic(screenName);
        }, 300);
        
    } catch (err) {
        console.error('Error loading screen:', err);
    }
}

/* ─── Logic Binding ──────────────────────────────────────── */
function bindScreenLogic(name) {
    console.log(`[Pulse] Binding logic for: ${name}`);
    
    if (name === 'splash') {
        const startBtn = appContainer.querySelector('button'); 
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                loadScreen('connecting');
                socket.emit('start-search');
            });
        }
    }

    if (name === 'connecting') {
        // Bind Stop Search Button (More specific selector to avoid settings button)
        const buttons = Array.from(appContainer.querySelectorAll('button'));
        const stopBtn = buttons.find(b => b.innerText.includes('Aramayı Durdur'));
        
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                socket.emit('next');
                loadScreen('splash');
            });
        }
        
        bindNav();
    }
    
    if (name === 'chat') {
        // Find existing video elements in the template or use our logic ones
        const remoteVidEl = appContainer.querySelector('img[alt="Remote User"]'); // Placeholder
        const localVidEl  = appContainer.querySelector('img[alt="Self Preview"]'); // Placeholder
        
        // Replace placeholders with real video elements
        if (remoteVidEl) {
            const v = document.createElement('video');
            v.id = 'remote-video';
            v.className = remoteVidEl.className;
            v.autoplay = true;
            v.playsinline = true;
            remoteVidEl.parentNode.replaceChild(v, remoteVidEl);
        }
        if (localVidEl) {
            const v = document.createElement('video');
            v.id = 'local-video';
            v.className = localVidEl.className;
            v.autoplay = true;
            v.playsinline = true;
            v.muted = true;
            localVidEl.parentNode.replaceChild(v, localVidEl);
            if (localStream) v.srcObject = localStream;
        }

        // Bind Buttons
        const nextBtn = Array.from(appContainer.querySelectorAll('button')).find(b => b.innerText.includes('NEXT'));
        if (nextBtn) {
            nextBtn.addEventListener('click', () => socket.emit('next'));
        }

        const endCallBtn = appContainer.querySelector('.bg-error-container');
        if (endCallBtn) {
            endCallBtn.addEventListener('click', () => {
                socket.emit('next'); // For now, just find next
                loadScreen('splash');
            });
        }

        // Nav Buttons
        bindNav();
    }

    if (name === 'profile') {
        const saveBtn = Array.from(appContainer.querySelectorAll('button')).find(b => b.innerText.includes('Save'));
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                // Collect dummy preferences for now
                socket.emit('set-preferences', { gender: 'male', pref: 'both' });
                loadScreen('chat');
            });
        }
        
        const backBtn = appContainer.querySelector('button .material-symbols-outlined[data-icon="arrow_back"]')?.parentNode;
        if (backBtn) backBtn.addEventListener('click', () => loadScreen('chat'));

        bindNav();
    }

    if (name === 'discover') {
        const buttons = Array.from(appContainer.querySelectorAll('button'));
        
        // Like / Dislike effects
        const heartBtn = buttons.find(b => b.innerText.includes('favorite') || b.querySelector('[data-icon="favorite"]'));
        const closeBtn = buttons.find(b => b.innerText.includes('close') || b.querySelector('[data-icon="close"]'));
        
        if (heartBtn) heartBtn.addEventListener('click', () => {
            heartBtn.classList.add('scale-125', 'brightness-125');
            setTimeout(() => heartBtn.classList.remove('scale-125', 'brightness-125'), 200);
            console.log('Pulse: Liked Elena!');
        });
        
        if (closeBtn) closeBtn.addEventListener('click', () => {
            closeBtn.classList.add('scale-75', 'opacity-50');
            setTimeout(() => closeBtn.classList.remove('scale-75', 'opacity-50'), 200);
            console.log('Pulse: Skipped Elena');
        });

        // Header Settings
        const settingsBtn = appContainer.querySelector('button.material-symbols-outlined');
        if (settingsBtn && settingsBtn.innerText.includes('settings')) {
            settingsBtn.addEventListener('click', () => loadScreen('profile'));
        }

        bindNav();
    }

    if (name === 'inbox') {
        const headerProfile = appContainer.querySelector('header img');
        if (headerProfile) {
            headerProfile.addEventListener('click', () => loadScreen('profile'));
        }

        const chatItems = appContainer.querySelectorAll('.glass-card, .bg-surface-container');
        chatItems.forEach(item => {
            item.addEventListener('click', () => {
                alert('Sohbet detayı yakında eklenecek! (Mesajlaşma Ekranı)');
            });
        });

        const settingsBtn = appContainer.querySelector('button .material-symbols-outlined[data-icon="settings"]')?.parentNode;
        if (settingsBtn) settingsBtn.addEventListener('click', () => loadScreen('profile'));

        bindNav();
    }
}

function bindNav() {
    const nav = appContainer.querySelector('nav');
    if (!nav) return;

    const homeBtn    = nav.querySelector('[data-icon="home"]')?.parentNode;
    const discBtn    = nav.querySelector('[data-icon="style"]')?.parentNode;
    const liveBtn    = nav.querySelector('[data-icon="videocam"]')?.parentNode;
    const profileBtn = nav.querySelector('[data-icon="chat_bubble"]')?.parentNode || nav.querySelector('[data-icon="person"]')?.parentNode;

    if (homeBtn)    homeBtn.addEventListener('click',    () => loadScreen('splash'));
    if (discBtn)    discBtn.addEventListener('click',    () => loadScreen('discover'));
    if (liveBtn)    liveBtn.addEventListener('click',    () => loadScreen('chat'));
    if (profileBtn) profileBtn.addEventListener('click', () => loadScreen('profile'));
}

/* ─── Media ──────────────────────────────────────────────── */
async function initMedia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        // After media is ready, load splash
        loadScreen('splash');
    } catch (err) {
        console.error('Camera Access Denied:', err);
        loadScreen('splash'); // Still load splash but maybe show error
    }
}

/* ─── Socket Events ──────────────────────────────────────── */
socket.on('matched', async ({ partnerAnonId, isInitiator }) => {
    console.log(`Connected with: ${partnerAnonId} | Initiator: ${isInitiator}`);
    
    // Ensure we are on chat screen
    if (currentScreen !== 'chat') await loadScreen('chat');
    
    const rv = document.getElementById('remote-video');
    const lv = document.getElementById('local-video');
    
    if (lv && localStream) lv.srcObject = localStream;

    setupPeerConnection(localStream, rv, (sig) => socket.emit('webrtc-signal', sig));
    
    if (isInitiator) {
        // Wait a small bit for the other peer to be ready
        setTimeout(async () => {
            await createOffer((sig) => socket.emit('webrtc-signal', sig));
        }, 1000);
    }
});

socket.on('searching', () => {
    console.log('Searching...');
    if (currentScreen !== 'connecting') loadScreen('connecting');
});

/* ─── Boot ───────────────────────────────────────────────── */
initMedia();
