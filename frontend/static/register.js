import { initAuth } from './auth_guard.js';
import { showMessage } from './utils.js';
import { attachAutocomplete, attachCustomSelect } from './autocomplete.js';

let selfEmail = '';
const userIdFilter = new URLSearchParams(window.location.search).get('user_id');

// ── API ───────────────────────────────────────────────────────────────────────

async function fetchAccounts() {
    const res = await fetch('/auth/accounts');
    return res.json();
}

async function fetchUsers() {
    const res = await fetch('/user');
    return res.json();
}

async function createAccount(email, password, role, user_id) {
    return fetch('/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password, role, user_id }),
    });
}

async function deleteAccount(id) {
    return fetch(`/auth/accounts/${id}`, { method: 'DELETE' });
}

async function patchAccount(id, payload) {
    return fetch(`/auth/accounts/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
    });
}


// ── RENDER ────────────────────────────────────────────────────────────────────

function createAccountElement(account, index) {
    const li = document.createElement('li');
    li.id = `account-${account.id}`;
    li.className = 'card-item account-item';
    li.style.animationDelay = `${Math.min(index * 30, 300)}ms`;

    const roleClass = account.role === 'admin' ? 'acct-role-admin' : 'acct-role-user';
    const profileCell = account.full_name
        ? `<a href="/user/${account.user_id}" class="user-link">${account.full_name}</a>`
        : `<span class="unassigned">Admin</span>`;
    const roleToggleLabel = account.role === 'admin' ? 'MAKE USER' : 'MAKE ADMIN';

    li.innerHTML = `
        <div class="card-uid">${account.email}</div>
        <span class="acct-role ${roleClass}">${account.role.toUpperCase()}</span>
        <div class="card-desc">${profileCell}</div>
        <div class="card-actions">
            <button class="action-btn pw-btn">CHANGE PW</button>
            ${account.user_id !== null ? `<button class="action-btn role-btn">${roleToggleLabel}</button>` : ''}
            <button class="action-btn remove">REMOVE</button>
        </div>
    `;

    li.querySelector('.pw-btn').onclick = () => enterPasswordEdit(account, li);
    li.querySelector('.remove').onclick  = () => handleDelete(account.id, account.email);
    if (account.user_id !== null) {
        li.querySelector('.role-btn').onclick = () => handleRoleToggle(account.id, account.role);
    }

    return li;
}

function renderAccounts(accounts) {
    const list       = document.getElementById('account-list');
    const emptyState = document.getElementById('empty-state');
    const countEl    = document.getElementById('account-count');
    list.innerHTML   = '';

    const visible = accounts.filter(a => {
        if (a.email === selfEmail) return false;
        if (userIdFilter) return String(a.user_id) === userIdFilter;
        return true;
    });
    countEl.textContent = `${visible.length} account${visible.length !== 1 ? 's' : ''}`;

    if (!visible || visible.length === 0) {
        emptyState.style.display = 'flex';
        return;
    }
    emptyState.style.display = 'none';
    visible.forEach((a, i) => list.appendChild(createAccountElement(a, i)));
}


// ── INLINE PASSWORD EDIT ──────────────────────────────────────────────────────

function enterPasswordEdit(account, li) {
    const actionsEl = li.querySelector('.card-actions');
    actionsEl.innerHTML = `
        <input class="edit-input pw-input" type="password" placeholder="New password" style="width:120px">
        <button class="edit-save">SAVE</button>
        <button class="edit-cancel">CANCEL</button>
    `;
    const pwInput = actionsEl.querySelector('.pw-input');
    pwInput.focus();

    actionsEl.querySelector('.edit-save').onclick = () => handlePasswordSave(account.id, pwInput.value);
    actionsEl.querySelector('.edit-cancel').onclick = () => loadAccounts();
}


// ── HANDLERS ─────────────────────────────────────────────────────────────────

async function loadAccounts() {
    try {
        const data = await fetchAccounts();
        renderAccounts(data.accounts || []);
    } catch (err) {
        console.error(err);
        showMessage('Failed to load accounts.', true);
    }
}

async function handleDelete(id, email) {
    const res  = await deleteAccount(id);
    const data = await res.json();

    if (data.status === 'removed') {
        showMessage(`Account '${data.email}' removed.`);
    } else if (data.status === 'last_admin') {
        showMessage('Cannot remove the last admin account.', true);
    } else {
        showMessage('Error removing account.', true);
    }
    loadAccounts();
}

async function handlePasswordSave(id, password) {
    if (!password) {
        showMessage('Password cannot be empty.', true);
        return;
    }
    const res  = await patchAccount(id, { password });
    const data = await res.json();

    if (data.status === 'ok') {
        showMessage('Password updated.');
    } else {
        showMessage('Error updating password.', true);
    }
    loadAccounts();
}

async function handleRoleToggle(id, currentRole) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const res  = await patchAccount(id, { role: newRole });
    const data = await res.json();

    if (data.status === 'ok') {
        showMessage(`Role changed to ${newRole.toUpperCase()}.`);
    } else if (data.status === 'last_admin') {
        showMessage('Cannot demote the last admin account.', true);
    } else if (data.status === 'no_profile') {
        showMessage('Cannot set USER role without a linked profile.', true);
    } else {
        showMessage('Error updating role.', true);
    }
    loadAccounts();
}

async function handleCreate() {
    const role     = document.getElementById('role').value;
    const password = document.getElementById('password').value;

    let email, userId;

    if (role === 'user') {
        const idVal = document.getElementById('user-id').value;
        userId = idVal ? parseInt(idVal) : null;
        email  = document.getElementById('user-email').value;
        if (!userId) { showMessage('Select a profile.', true); return; }
        if (!email)  { showMessage('Selected profile has no email.', true); return; }
    } else {
        userId = null;
        email  = document.getElementById('email').value.trim();
        if (!email) { showMessage('Email is required for admin accounts.', true); return; }
    }

    if (!password) { showMessage('Password is required.', true); return; }

    const res  = await createAccount(email, password, role, userId);
    const data = await res.json();

    if (data.status === 'ok') {
        showMessage('Account created.');
        document.getElementById('password').value    = '';
        document.getElementById('user-search').value = '';
        document.getElementById('user-id').value     = '';
        document.getElementById('user-email').value  = '';
        document.getElementById('email').value       = '';
        loadAccounts();
    } else if (data.status === 'duplicate') {
        showMessage('An account with that email already exists.', true);
    } else if (data.status === 'user_taken') {
        showMessage('This profile already has an account.', true);
    } else if (data.status === 'forbidden') {
        showMessage('Admin access required.', true);
    } else {
        showMessage('Error creating account.', true);
    }
}


// ── INIT ──────────────────────────────────────────────────────────────────────

window.onload = async () => {
    const authUser = await initAuth();
    selfEmail = authUser?.email || '';

    const userData = await fetchUsers();
    const users = userData.users || [];

    if (userIdFilter) {
        const match = users.find(u => String(u.id) === userIdFilter);
        const label = match ? match.full_name : `USER ${userIdFilter}`;
        document.getElementById('filter-label').textContent = label;
        document.getElementById('filter-badge').style.display = 'flex';
    }

    const userSearchInput = document.getElementById('user-search');
    const userIdInput     = document.getElementById('user-id');
    const userEmailInput  = document.getElementById('user-email');
    const emailInput      = document.getElementById('email');

    attachAutocomplete(userSearchInput, () => users, {
        display:  u => ({ top: u.full_name, bottom: u.email + (u.position ? ` · ${u.position}` : '') }),
        onSelect: u => {
            userSearchInput.value = u.full_name;
            userIdInput.value     = u.id;
            userEmailInput.value  = u.email || '';
        },
    });

    attachAutocomplete(emailInput, () => users);

    const roleHidden      = document.getElementById('role');
    const userLinkGroup   = document.getElementById('user-link-group');
    const adminEmailGroup = document.getElementById('admin-email-group');

    attachCustomSelect(
        document.getElementById('role-btn'),
        roleHidden,
        [
            { value: 'user',  label: 'USER'},
            { value: 'admin', label: 'ADMIN'},
        ],
        value => {
            const isUser = value === 'user';
            userLinkGroup.style.display   = isUser ? 'flex' : 'none';
            adminEmailGroup.style.display = isUser ? 'none' : 'flex';
        }
    );

    document.getElementById('add-btn').addEventListener('click', handleCreate);

    loadAccounts();
};
