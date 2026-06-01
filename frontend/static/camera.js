import { initAuth } from './auth_guard.js';

initAuth();

const feed      = document.getElementById('cam-feed');
const dot       = document.getElementById('status-dot');
const label     = document.getElementById('status-label');
const noSignal  = document.getElementById('cam-no-signal');

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

const timeout = setTimeout(() => setStatus('offline'), 6000);

feed.onload = () => {
    clearTimeout(timeout);
    setStatus('live');
};

feed.onerror = () => {
    clearTimeout(timeout);
    setStatus('offline');
};
