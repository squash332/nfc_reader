import { showMessage } from "./utils.js";
const apiUrl = 'http://127.0.0.1:8000/user';

let allUsers = [];

// ── API ───────────────────────────────────────────────────────────────────────

async function fetchUsers() {
    const res = await fetch(apiUrl);
    return res.json();
}

async function createUser(full_name, email, position) {
    return fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name, email, position: position || null })
    });
}

async function updateUser(id, full_name, email, position) {
    return fetch(`${apiUrl}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name, email, position: position || null })
    });
}

async function deleteUser(id) {
    return fetch(`${apiUrl}/${id}`, { method: 'DELETE' });
}


// ── UI HELPERS ────────────────────────────────────────────────────────────────

function updateUserCount(users) {
    const el = document.getElementById('user-count');
    el.textContent = `${users.length} user${users.length !== 1 ? 's' : ''} registered`;
}


// ── SEARCH FILTER ─────────────────────────────────────────────────────────────

function applySearch(query) {
    const q = query.toLowerCase();
    const filtered = q
        ? allUsers.filter(u =>
            u.full_name.toLowerCase().includes(q) ||
            (u.email && u.email.toLowerCase().includes(q)) ||
            (u.position && u.position.toLowerCase().includes(q))
        )
        : allUsers;
    renderUsers(filtered, false);
}


// ── RENDER ────────────────────────────────────────────────────────────────────

function createUserElement(user, index) {
    const li = document.createElement('li');
    li.id = `user-${user.id}`;
    li.className = 'card-item users-item';
    li.style.animationDelay = `${Math.min(index * 30, 300)}ms`;

    const email = user.email ?? '—';
    const emailClass = user.email ? 'card-desc user-email' : 'card-desc user-email unassigned';
    const position = user.position ?? '—';
    const posClass = user.position ? 'card-desc' : 'card-desc unassigned';

    li.innerHTML = `
        <div class="card-uid user-name" title="${user.full_name}">${user.full_name}</div>
        <div class="${emailClass}" title="${user.email ?? ''}">${email}</div>
        <div class="${posClass}" title="${user.position ?? ''}">${position}</div>
        <div class="user-card-count">${user.card_count}</div>
        <div class="card-actions">
            <button class="action-btn edit">EDIT</button>
            <button class="action-btn remove">REMOVE</button>
        </div>
    `;

    li.querySelector('.edit').onclick = () => enterEditMode(user);
    li.querySelector('.remove').onclick = () => handleRemove(user.id, user.full_name);

    return li;
}

function renderUsers(users, updateCache = true) {
    if (updateCache) allUsers = users;
    const list = document.getElementById('user-list');
    const emptyState = document.getElementById('empty-state');
    list.innerHTML = '';

    if (!users || users.length === 0) {
        emptyState.style.display = 'flex';
        updateUserCount([]);
        return;
    }

    emptyState.style.display = 'none';
    updateUserCount(users);
    users.forEach((u, i) => list.appendChild(createUserElement(u, i)));
}



// ── ACTIONS ───────────────────────────────────────────────────────────────────

async function loadUsers() {
    try {
        const data = await fetchUsers();
        renderUsers(data.users);
    } catch (err) {
        console.error(err);
        showMessage('Failed to load users.', true);
    }
}

async function handleAdd() {
    const nameInput = document.getElementById('user-name');
    const emailInput = document.getElementById('user-email');
    const posInput = document.getElementById('user-position');
    const full_name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const position = posInput.value.trim();

    if (!full_name || !email) {
        showMessage('Full name and email are required.', true);
        return;
    }

    const res = await createUser(full_name, email, position);
    const data = await res.json();

    if (data.status === 'ok') {
        showMessage(`User '${full_name}' added.`);
        nameInput.value = '';
        emailInput.value = '';
        posInput.value = '';
    } else if (data.status === 'duplicate') {
        showMessage(`Email '${data.email}' is already registered.`, true);
    } else {
        showMessage('Unknown error.', true);
    }

    loadUsers();
}

async function handleRemove(id, full_name) {
    const res = await deleteUser(id);
    const data = await res.json();

    if (data.status === 'removed') {
        showMessage(`User '${data.full_name}' removed. Their cards have been unassigned.`);
    } else {
        showMessage('Error removing user.', true);
    }

    loadUsers();
}


// ── EDIT MODE ─────────────────────────────────────────────────────────────────

function enterEditMode(user) {
    const li = document.getElementById(`user-${user.id}`);
    li.className = 'card-item editing';
    li.innerHTML = `
        <div class="edit-form">
            <input class="edit-input edit-name" type="text" placeholder="Full name" value="${user.full_name}">
            <input class="edit-input edit-email" type="email" placeholder="Email" value="${user.email ?? ''}">
            <input class="edit-input edit-pos" type="text" placeholder="Position" value="${user.position ?? ''}">
            <button class="edit-save">SAVE</button>
            <button class="edit-cancel">CANCEL</button>
        </div>
    `;

    li.querySelector('.edit-save').onclick = () => {
        const full_name = li.querySelector('.edit-name').value.trim();
        const email = li.querySelector('.edit-email').value.trim();
        const position = li.querySelector('.edit-pos').value.trim();
        handleSave(user.id, full_name, email, position);
    };

    li.querySelector('.edit-cancel').onclick = () => loadUsers();
    li.querySelector('.edit-input').focus();
}

async function handleSave(id, full_name, email, position) {
    if (!full_name || !email) {
        showMessage('Full name and email are required.', true);
        return;
    }

    const res = await updateUser(id, full_name, email, position);
    const data = await res.json();

    if (data.status === 'ok') {
        showMessage(`User updated.`);
    } else if (data.status === 'duplicate') {
        showMessage(`Email '${data.email}' is already registered.`, true);
    } else if (data.status === 'not_found') {
        showMessage('User not found.', true);
    } else {
        showMessage('Error updating user.', true);
    }

    loadUsers();
}


// ── INIT ──────────────────────────────────────────────────────────────────────

window.onload = () => {
    loadUsers();

    document.getElementById('add-btn').addEventListener('click', handleAdd);

    ['user-name', 'user-email', 'user-position'].forEach(id => {
        document.getElementById(id).addEventListener('keydown', e => {
            if (e.key === 'Enter') handleAdd();
        });
    });

    document.getElementById('registry-search').addEventListener('input', e => {
        applySearch(e.target.value);
    });
};
