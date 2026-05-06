import { showMessage } from './utils.js';

async function loadUsers() {
    const res  = await fetch('/user');
    const data = await res.json();
    const sel  = document.getElementById('user-select');
    (data.users || []).forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = `${u.full_name}${u.email ? '  ·  ' + u.email : ''}`;
        sel.appendChild(opt);
    });
}

async function handleRegister() {
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const role     = document.getElementById('role').value;
    const rawUid   = document.getElementById('user-select').value;
    const userId   = rawUid ? parseInt(rawUid) : null;

    if (!email || !password) {
        showMessage('Email and password required.', true);
        return;
    }
    if (role === 'user' && !userId) {
        showMessage('User accounts must be linked to a profile.', true);
        return;
    }

    const res  = await fetch('/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password, role, user_id: userId }),
    });
    const data = await res.json();

    if (data.status === 'ok') {
        showMessage('Account created successfully.', false);
        document.getElementById('email').value    = '';
        document.getElementById('password').value = '';
    } else if (data.status === 'duplicate') {
        showMessage(`An account with email '${email}' already exists.`, true);
    } else if (data.status === 'forbidden') {
        showMessage('Admin access required to create accounts.', true);
    } else {
        showMessage(data.message || 'Error creating account.', true);
    }
}

window.onload = async () => {
    await loadUsers();

    const roleSelect   = document.getElementById('role');
    const userLinkGroup = document.getElementById('user-link-group');

    roleSelect.addEventListener('change', () => {
        userLinkGroup.style.display = roleSelect.value === 'user' ? 'flex' : 'none';
    });

    document.getElementById('register-btn').addEventListener('click', handleRegister);
};
