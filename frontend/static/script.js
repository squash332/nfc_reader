import { showMessage } from "./utils.js";
const apiUrl = 'http://127.0.0.1:8000/tag';

let allTags = [];
let allUsers = [];

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

// ── EMAIL AUTOCOMPLETE ────────────────────────────────────────────────────────

function attachEmailAutocomplete(input) {
    let dropdown = null;

    function closeDropdown() {
        if (dropdown) { dropdown.remove(); dropdown = null; }
    }

    function openDropdown(matches) {
        closeDropdown();
        if (!matches.length) return;

        dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';

        const rect = input.getBoundingClientRect();
        dropdown.style.top   = `${rect.bottom}px`;
        dropdown.style.left  = `${rect.left}px`;
        dropdown.style.width = `${rect.width}px`;

        matches.forEach(user => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            const meta = [user.full_name, user.position].filter(Boolean).join(' · ');
            item.innerHTML = `
                <div class="autocomplete-email">${user.email}</div>
                ${meta ? `<div class="autocomplete-meta">${meta}</div>` : ''}
            `;
            item.addEventListener('mousedown', e => {
                e.preventDefault();
                input.value = user.email;
                closeDropdown();
            });
            dropdown.appendChild(item);
        });

        document.body.appendChild(dropdown);
    }

    input.addEventListener('input', () => {
        const q = input.value.toLowerCase();
        if (!q) { closeDropdown(); return; }
        const matches = allUsers
            .filter(u => u.email && u.email.toLowerCase().includes(q))
            .slice(0, 6);
        openDropdown(matches);
    });

    input.addEventListener('focus', () => {
        if (input.value) input.dispatchEvent(new Event('input'));
    });

    input.addEventListener('blur', closeDropdown);
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

    const userLabel = tag.full_name
        ? `<a href="/user/${tag.user_id}" class="user-link">${tag.full_name}</a>`
        : '—';
    const userClass = tag.full_name ? 'card-desc' : 'card-desc unassigned';

    const emailLabel = tag.email ?? '—';

    li.innerHTML = `
        <div class="card-uid" title="${tag.card_uid}">${tag.card_uid}</div>
        <div class="${userClass}">${userLabel}</div>
        <div class="card-email" title="${tag.email ?? ''}">${emailLabel}</div>
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

async function handleAdd() {
    const uidInput = document.getElementById('card-uid');
    const descInput = document.getElementById('card-description');
    const userInput = document.getElementById('card-user');
    const card_uid = uidInput.value.trim();
    const desc = descInput.value.trim();
    const email = userInput.value.trim();

    if (!card_uid || !desc) {
        showMessage('Both UID and description are required.', true);
        setScanZone('error', 'MISSING DATA');
        return;
    }

    const res = await createTag(card_uid, desc, email);
    const data = await res.json();

    if (data.status === 'ok') {
        showMessage(`Card '${card_uid}' registered${email ? ` — assigned to ${email}` : ''}.`);
        setScanZone('success', 'REGISTERED');
        uidInput.value = '';
        descInput.value = '';
        userInput.value = '';

    } else if (data.status === 'duplicate') {
        showMessage(`UID '${card_uid}' already exists.`, true);
        setScanZone('error', 'DUPLICATE UID');
    } else if (data.status === 'user_not_found') {
        showMessage(`No user with email '${data.email}'.`, true);
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
            <input class="edit-input edit-user" type="email" placeholder="Assign by email" value="${tag.email ?? ''}">
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
    loadTags();
    fetch('http://127.0.0.1:8000/user').then(r => r.json()).then(d => { allUsers = d.users || []; });

    attachEmailAutocomplete(document.getElementById('card-user'));
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