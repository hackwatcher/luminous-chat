/* ─── Services / webrtc.js ────────────────────────────────────
   Encapsulates all WebRTC peer-connection logic.
   Exposes setup(), teardown(), and handles ICE queuing.
──────────────────────────────────────────────────────────────── */

const RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302'  },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 10,
};

let pc   = null;   // RTCPeerConnection
let _iceQ = [];    // ICE candidates received before remoteDescription is set

/**
 * Flush any queued ICE candidates after remote description is applied.
 */
async function flushICEQueue() {
    while (_iceQ.length && pc) {
        try { await pc.addIceCandidate(_iceQ.shift()); } catch (_) {}
    }
}

/**
 * Initialise a new RTCPeerConnection.
 * @param {MediaStream}  localStream  - local camera / mic stream
 * @param {HTMLVideoElement} remoteEl - <video> element to pipe remote stream into
 * @param {function} onSignal        - called with each signal to send via socket
 */
function setupPeerConnection(localStream, remoteEl, onSignal) {
    teardown(); // clean any previous connection

    pc   = new RTCPeerConnection(RTC_CONFIG);
    _iceQ = [];

    // Add local tracks
    if (localStream) {
        localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    }

    // Pipe remote stream to video element
    pc.ontrack = ({ streams }) => {
        if (streams[0]) remoteEl.srcObject = streams[0];
    };

    // Forward ICE candidates through socket
    pc.onicecandidate = ({ candidate }) => {
        if (candidate) onSignal({ type: 'candidate', candidate });
    };

    pc.oniceconnectionstatechange = () => {
        if (['failed', 'disconnected', 'closed'].includes(pc?.iceConnectionState)) {
            window.dispatchEvent(new CustomEvent('webrtc:failed'));
        }
    };

    return pc;
}

/**
 * Tear down the current RTCPeerConnection cleanly.
 */
function teardown() {
    if (!pc) return;
    try {
        pc.ontrack         = null;
        pc.onicecandidate  = null;
        pc.oniceconnectionstatechange = null;
        pc.close();
    } catch (_) {}
    pc   = null;
    _iceQ = [];
}

/**
 * Handle an incoming WebRTC signal.
 * @param {object} data     - signal payload from socket
 * @param {function} onSignal - called with answer / candidates to send back
 */
async function handleSignal(data, onSignal) {
    if (!pc) return;

    try {
        if (data.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            await flushICEQueue();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            onSignal({ type: 'answer', answer });

        } else if (data.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            await flushICEQueue();

        } else if (data.type === 'candidate') {
            const candidate = new RTCIceCandidate(data.candidate);
            if (pc.remoteDescription?.type) {
                await pc.addIceCandidate(candidate);
            } else {
                _iceQ.push(candidate);
            }
        }
    } catch (err) {
        console.warn('[WebRTC] signal error:', err.message);
    }
}

/**
 * Create and send an offer (called by the initiator).
 * @param {function} onSignal
 */
async function createOffer(onSignal) {
    if (!pc) return;
    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        onSignal({ type: 'offer', offer });
    } catch (err) {
        console.warn('[WebRTC] createOffer error:', err.message);
    }
}
