import { showMessage } from "./utils.js";
import { initAuth } from "./auth_guard.js";
import { attachAutocomplete } from "./autocomplete.js";
const apiUrl = 'http://127.0.0.1:8000/tag';

let allTags = [];
let allUsers = [];

// ── PRESENCE PANEL ────────────────────────────────────────────────────────────

async function fetchPresent() {
    const res = await fetch('/present');
    return res.json();
}

function renderPresence(users) {
    const list  = document.getElementById('presence-list');
    const empty = document.getElementById('presence-empty');
    const count = document.getElementById('presence-count');
    list.innerHTML = '';

    if (!users || users.length === 0) {
        count.textContent = 'building empty';
        empty.style.display = 'flex';
        return;
    }

    empty.style.display = 'none';
    count.textContent = `${users.length} inside`;
    users.forEach(u => {
        const li = document.createElement('li');
        li.className = 'presence-item';
        const time = u.entered_at ? u.entered_at.slice(11, 16) : '—';
        const meta = [u.position, u.email].filter(Boolean).join(' · ');
        li.innerHTML = `
            <div class="presence-info">
                <a href="/user/${u.id}" class="presence-name">${u.full_name}</a>
                ${meta ? `<div class="presence-meta">${meta}</div>` : ''}
            </div>
            <div class="presence-time">▲ ${time}</div>
        `;
        list.appendChild(li);
    });
}

async function loadPresence() {
    try {
        const data = await fetchPresent();
        renderPresence(data.users || []);
    } catch {
        document.getElementById('presence-count').textContent = 'error loading';
    }
}

// ── API ───────────────────────────────────────────────────────────────────────

export async function fetchTags() {
    const res = await fetch(apiUrl);
    return res.json();
}

async function createTag(card_uid, description, email) {
    return fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_uid, description, email: email || null })
    });
}

async function deleteTag(card_uid) {
    return fetch(`${apiUrl}/${card_uid}`, { method: 'DELETE' });
}

async function updateTag(card_uid, description, is_active, email) {
    return fetch(`${apiUrl}/${card_uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, is_active, email: email || null })
    });
}


// ── UI HELPERS ────────────────────────────────────────────────────────────────

function updateCardCount(tags) {
    const el = document.getElementById('card-count');
    const active = tags.filter(t => t.is_active).length;
    el.textContent = `${tags.length} card${tags.length !== 1 ? 's' : ''} registered — ${active} active`;
}

// ── EMAIL AUTOCOMPLETE ────────────────────────────────────────────────────────

// ── SEARCH FILTER ─────────────────────────────────────────────────────────────

function applySearch(query) {
    const q = query.toLowerCase();
    const filtered = q
        ? allTags.filter(t =>
            t.card_uid.toLowerCase().includes(q) ||
            (t.full_name && t.full_name.toLowerCase().includes(q))
        )
        : allTags;
    renderTags(filtered, false); // false = don't re-cache allTags
}



// ── RENDER ────────────────────────────────────────────────────────────────────

function createCardElement(tag, index) {
    const li = document.createElement('li');
    li.id = `tag-${tag.card_uid}`;
    li.className = `card-item ${tag.is_active ? 'is-active' : 'is-inactive'}`;
    li.style.animationDelay = `${Math.min(index * 30, 300)}ms`;

    const isActive = Boolean(tag.is_active);

    const userLabel = tag.full_name
        ? `<a href="/user/${tag.user_id}" class="user-link">${tag.full_name}</a>`
        : '—';
    const userClass = tag.full_name ? 'card-desc' : 'card-desc unassigned';

    const emailLabel = tag.email ?? '—';

    li.innerHTML = `
        <div class="card-uid" title="${tag.card_uid}">${tag.card_uid}</div>
        <div class="${userClass}">${userLabel}</div>
        <div class="card-email" title="${tag.email ?? ''}">${emailLabel}</div>
        <div class="card-desc" title="${tag.description ?? ''}">${tag.description ?? '—'}</div>
        <div>
            <span class="card-status-badge ${isActive ? 'badge-active' : 'badge-inactive'}">
                <span class="badge-dot"></span>
                ${isActive ? 'VALID' : 'INVALID'}
            </span>
        </div>
        <div class="card-actions">
            <button class="action-btn edit">EDIT</button>
            <button class="action-btn remove">REMOVE</button>
        </div>
    `;

    li.querySelector('.remove').onclick = () => handleRemove(tag.card_uid);
    li.querySelector('.edit').onclick = () => enterEditMode(tag);

    return li;
}

function renderTags(tags, updateCache = true) {
    if (updateCache) allTags = tags;
    document.querySelectorAll('.autocomplete-dropdown').forEach(d => d.remove());
    const list = document.getElementById('card-list');
    const emptyState = document.getElementById('empty-state');
    list.innerHTML = '';

    if (!tags || tags.length === 0) {
        emptyState.style.display = 'flex';
        updateCardCount([]);
        return;
    }

    emptyState.style.display = 'none';
    updateCardCount(tags);
    tags.forEach((tag, i) => list.appendChild(createCardElement(tag, i)));
}

function handleQueryParam() {
    const params  = new URLSearchParams(window.location.search);
    const cardUid = params.get('card');
    if (!cardUid) return;

    const searchEl = document.getElementById('registry-search');
    searchEl.value = cardUid;
    applySearch(cardUid);

    setTimeout(() => {
        const el = document.getElementById(`tag-${cardUid}`);
        if (!el) return;
        el.classList.add('highlighted');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    window.history.replaceState({}, '', '/');
}


// ── ACTIONS ───────────────────────────────────────────────────────────────────

async function loadTags() {
    try {
        const data = await fetchTags();
        renderTags(data.tags);
        handleQueryParam();
    } catch (err) {
        console.error(err);
        showMessage('Failed to load cards.', true);
    }
}

// ── MODAL ─────────────────────────────────────────────────────────────────────

function openModal() {
    document.getElementById('register-modal').style.display = 'flex';
    document.getElementById('card-form').style.display = 'block';
    document.getElementById('code-result').style.display = 'none';
    document.getElementById('card-uid').focus();
}

function closeModal() {
    document.getElementById('register-modal').style.display = 'none';
    document.getElementById('card-uid').value = '';
    document.getElementById('card-description').value = '';
    document.getElementById('card-user').value = '';
    document.getElementById('code-result').style.display = 'none';
    document.getElementById('card-form').style.display = 'block';
    const msg = document.getElementById('message');
    msg.className = 'message';
    msg.textContent = '';
}

function showCodeResult(code) {
    document.getElementById('card-form').style.display = 'none';
    const resultEl = document.getElementById('code-result');
    resultEl.style.display = 'block';
    document.getElementById('code-display').textContent = code;
    document.getElementById('code-copy-btn').onclick = () => {
        navigator.clipboard.writeText(code);
        document.getElementById('code-copy-btn').textContent = 'COPIED ✓';
    };
    document.getElementById('code-done-btn').onclick = closeModal;
}

async function handleAdd() {
    const card_uid = document.getElementById('card-uid').value.trim();
    const desc     = document.getElementById('card-description').value.trim();
    const email    = document.getElementById('card-user').value.trim();
    const phoneFlow = !card_uid;

    if (!desc) { showMessage('Description is required.', true); return; }
    if (phoneFlow && !email) { showMessage('Email is required when auto-generating a card.', true); return; }

    const res  = await createTag(card_uid || null, desc, email);
    const data = await res.json();

    if (data.status === 'ok') {
        loadTags();
        if (data.claim_code) {
            showCodeResult(data.claim_code);
        } else {
            showMessage(`Card '${data.added_tag}' registered${email ? ` — assigned to ${email}` : ''}.`);
            setTimeout(closeModal, 1200);
        }
    } else if (data.status === 'duplicate') {
        showMessage(`UID '${card_uid}' already exists.`, true);
    } else if (data.status === 'user_not_found') {
        showMessage(`No user with email '${data.email}'.`, true);
    } else {
        showMessage(data.message || 'Unknown error.', true);
    }
}

async function handleRemove(card_uid) {
    const res = await deleteTag(card_uid);
    const data = await res.json();

    if (data.status === 'removed') {
        showMessage(`Card '${card_uid}' removed.`);
    } else {
        showMessage(data.message || 'Error removing card.', true);
    }

    loadTags();
}


// ── EDIT MODE ─────────────────────────────────────────────────────────────────

function enterEditMode(tag) {
    const li = document.getElementById(`tag-${tag.card_uid}`);
    li.className = 'card-item editing';
    li.innerHTML = `
        <div class="edit-form">
            <span class="edit-uid-label">${tag.card_uid}</span>
            <input class="edit-input edit-desc" type="text" placeholder="Description" value="${tag.description ?? ''}">
            <input class="edit-input edit-user" type="email" placeholder="Assign by email" value="${tag.email ?? ''}">
            <select class="edit-select">
                <option value="1" ${tag.is_active ? 'selected' : ''}>VALID</option>
                <option value="0" ${!tag.is_active ? 'selected' : ''}>INVALID</option>
            </select>
            <button class="edit-save">SAVE</button>
            <button class="edit-cancel">CANCEL</button>
        </div>
    `;


    li.querySelector('.edit-save').onclick = () => {
        const desc = li.querySelector('.edit-input.edit-desc').value.trim();
        const email = li.querySelector('.edit-input.edit-user').value.trim();
        const active = parseInt(li.querySelector('.edit-select').value, 10);
        handleSave(tag.card_uid, desc, active, email);
    };

    li.querySelector('.edit-cancel').onclick = () => loadTags();
    const emailInput = li.querySelector('.edit-user');
    attachEmailAutocomplete(emailInput);
    li.querySelector('.edit-input').focus();
}

async function handleSave(card_uid, description, is_active, email) {
    const res = await updateTag(card_uid, description, is_active, email);
    const data = await res.json();

    if (data.status === 'ok') {
        showMessage(`Card '${card_uid}' updated.`);
    } else if (data.status === 'user_not_found') {
        showMessage(`No user with email '${data.email}'.`, true);
    } else {
        showMessage(data.message || 'Error updating card.', true);
    }

    loadTags();
}


// ── INIT ──────────────────────────────────────────────────────────────────────

window.onload = async () => {
    await initAuth();
    loadTags();
    loadPresence();
    setInterval(loadPresence, 30000);

    fetch('http://127.0.0.1:8000/user').then(r => r.json()).then(d => { allUsers = d.users || []; });

    attachAutocomplete(document.getElementById('card-user'), () => allUsers);

    document.getElementById('open-register').addEventListener('click', openModal);
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('register-modal').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeModal();
    });
    document.getElementById('add-btn').addEventListener('click', handleAdd);
    ['card-uid', 'card-description', 'card-user'].forEach(id => {
        document.getElementById(id).addEventListener('keydown', e => {
            if (e.key === 'Enter') handleAdd();
            if (e.key === 'Escape') closeModal();
        });
    });

    document.getElementById('registry-search').addEventListener('input', e => {
        applySearch(e.target.value);
    });
};