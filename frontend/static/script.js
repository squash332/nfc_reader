import { showMessage } from "./utils.js";
const apiUrl = 'http://127.0.0.1:8000/tag';

let allTags = [];

// ── API ───────────────────────────────────────────────────────────────────────

export async function fetchTags() {
    const res = await fetch(apiUrl);
    return res.json();
}

async function createTag(card_uid, description, full_name) {
    return fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_uid, description, full_name })
    });
}

async function deleteTag(card_uid) {
    return fetch(`${apiUrl}/${card_uid}`, { method: 'DELETE' });
}

async function updateTag(card_uid, description, is_active, full_name) {
    return fetch(`${apiUrl}/${card_uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, is_active, full_name: full_name || null})
    });
}


// ── UI HELPERS ────────────────────────────────────────────────────────────────

function setScanZone(state, label) {
    // state: '' | 'success' | 'error'
    const zone = document.getElementById('scan-zone');
    const labelEl = zone.querySelector('.scan-label');
    zone.className = 'scan-zone' + (state ? ' ' + state : '');
    labelEl.textContent = label;
    if (state) {
        clearTimeout(zone._timeout);
        zone._timeout = setTimeout(() => {
            zone.className = 'scan-zone';
            labelEl.textContent = 'RFID READY';
        }, 2000);
    }
}

function updateCardCount(tags) {
    const el = document.getElementById('card-count');
    const active = tags.filter(t => t.is_active).length;
    el.textContent = `${tags.length} card${tags.length !== 1 ? 's' : ''} registered — ${active} active`;
}

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

    const userLabel = tag.full_name ?? '—';
    const userClass = tag.full_name ? 'card-desc' : 'card-desc unassigned';

    li.innerHTML = `
        <div class="card-uid" title="${tag.card_uid}">${tag.card_uid}</div>
        <div class="${userClass}" title="${tag.full_name ?? 'Unassigned'}">${userLabel}</div>
        <div>
            <span class="card-status-badge ${isActive ? 'badge-active' : 'badge-inactive'}">
                <span class="badge-dot"></span>
                ${isActive ? 'ACTIVE' : 'INACTIVE'}
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

async function handleAdd() {
    const uidInput = document.getElementById('card-uid');
    const descInput = document.getElementById('card-description');
    const userInput = document.getElementById('card-user');
    const card_uid = uidInput.value.trim();
    const desc = descInput.value.trim();
    const full_name = userInput.value.trim();

    if (!card_uid || !desc) {
        showMessage('Both UID and description are required.', true);
        setScanZone('error', 'MISSING DATA');
        return;
    }

    const res = await createTag(card_uid, desc, full_name);
    const data = await res.json();

    if (data.status === 'ok') {
        showMessage(`Card '${card_uid}' registered${full_name ? ` — assigned to ${full_name}` : ''}.`);
        setScanZone('success', 'REGISTERED');
        uidInput.value = '';
        descInput.value = '';
        userInput.value = '';

    } else if (data.status === 'duplicate') {
        showMessage(`UID '${card_uid}' already exists.`, true);
        setScanZone('error', 'DUPLICATE UID');
    } else if (data.status === 'user_not_found') {
        showMessage(`User '${data.full_name}' not found in the system.`, true);
        setScanZone('error', 'USER NOT FOUND');
    } else {
        showMessage(data.message || 'Unknown error.', true);
        setScanZone('error', 'ERROR');
    }


    loadTags();
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
            <input class="edit-input edit-user" type="text" placeholder="Assign user" value="${tag.full_name ?? ''}">
            <select class="edit-select">
                <option value="1" ${tag.is_active ? 'selected' : ''}>ACTIVE</option>
                <option value="0" ${!tag.is_active ? 'selected' : ''}>INACTIVE</option>
            </select>
            <button class="edit-save">SAVE</button>
            <button class="edit-cancel">CANCEL</button>
        </div>
    `;


    li.querySelector('.edit-save').onclick = () => {
        const desc = li.querySelector('.edit-input.edit-desc').value.trim();
        const full_name = li.querySelector('.edit-input.edit-user').value.trim();
        const active = parseInt(li.querySelector('.edit-select').value, 10);
        handleSave(tag.card_uid, desc, active, full_name);
    };

    li.querySelector('.edit-cancel').onclick = () => loadTags();
    li.querySelector('.edit-input').focus();
}

async function handleSave(card_uid, description, is_active, full_name) {
    const res = await updateTag(card_uid, description, is_active, full_name);
    const data = await res.json();

    if (data.status === 'ok') {
        showMessage(`Card '${card_uid}' updated.`);
    } else if (data.status === 'user_not_found') {
        showMessage(`User '${data.full_name}' not found in the system.`, true);
    } else {
        showMessage(data.message || 'Error updating card.', true);
    }

    loadTags();
}


// ── INIT ──────────────────────────────────────────────────────────────────────

window.onload = () => {
    loadTags();
    document.getElementById('add-btn').addEventListener('click', handleAdd);

    // also allow Enter key from either input field
    ['card-uid', 'card-description', 'card-user'].forEach(id => {
        document.getElementById(id).addEventListener('keydown', e => {
            if (e.key === 'Enter') handleAdd();
        });
    });

    // live client-side search
    document.getElementById('registry-search').addEventListener('input', e => {
        applySearch(e.target.value);
    });

};