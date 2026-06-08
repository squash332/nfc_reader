import { initAuth } from './auth_guard.js';

initAuth();

const feed      = document.getElementById('cam-feed');
const dot       = document.getElementById('status-dot');
const label     = document.getElementById('status-label');
const noSignal  = document.getElementById('cam-no-signal');
const toggleBtn = document.getElementById('cam-toggle-btn');

let camEnabled = true;

function setStatus(state) {
    dot.className   = 'cam-status-dot ' + state;
    label.className = 'cam-status-label ' + state;

    if (state === 'live') {
        label.textContent      = 'LIVE';
        noSignal.style.display = 'none';
        feed.style.display     = 'block';
    } else if (state === 'offline') {
        label.textContent      = 'OFFLINE';
        noSignal.style.display = 'flex';
        feed.style.display     = 'none';
    } else {
        label.textContent = 'CONNECTING';
    }
}

function setToggleBtn(enabled) {
    camEnabled              = enabled;
    toggleBtn.textContent   = enabled ? 'DISABLE CAMERA' : 'ENABLE CAMERA';
    toggleBtn.className     = 'cam-toggle-btn ' + (enabled ? 'on' : 'off');
}

async function toggleCamera() {
    const next = !camEnabled;
    setToggleBtn(next);
    if (!next) setStatus('offline');
    await fetch('/camera/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
    });
}

window.toggleCamera = toggleCamera;

fetch('/camera/enabled')
    .then(r => r.json())
    .then(d => setToggleBtn(d.enabled))
    .catch(() => setToggleBtn(true));

const timeout = setTimeout(() => setStatus('offline'), 6000);

feed.onload = () => {
    clearTimeout(timeout);
    setStatus('live');
};

feed.onerror = () => {
    clearTimeout(timeout);
    setStatus('offline');
};
