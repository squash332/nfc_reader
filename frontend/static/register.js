import { showMessage } from './utils.js';

async function loadUsers() {
    const res  = await fetch('/user');
    const data = await res.json();
    const sel  = document.getElementById('user-select');
    (data.users || []).forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.dataset.email = u.email || '';
        opt.textContent = u.full_name + (u.email ? `  ·  ${u.email}` : '');
        sel.appendChild(opt);
    });
}

async function handleRegister() {
    const role     = document.getElementById('role').value;
    const password = document.getElementById('password').value;

    let email, userId;

    if (role === 'user') {
        const sel = document.getElementById('user-select');
        const selectedOpt = sel.options[sel.selectedIndex];
        userId = sel.value ? parseInt(sel.value) : null;
        email  = selectedOpt?.dataset.email || '';

        if (!userId) {
            showMessage('Select a profile to link this account to.', true);
            return;
        }
        if (!email) {
            showMessage('The selected profile has no email address.', true);
            return;
        }
    } else {
        userId = null;
        email  = document.getElementById('email').value.trim();
        if (!email) {
            showMessage('Email is required for admin accounts.', true);
            return;
        }
    }

    if (!password) {
        showMessage('Password is required.', true);
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
        document.getElementById('password').value = '';
        document.getElementById('user-select').value = '';
        document.getElementById('email').value = '';
    } else if (data.status === 'duplicate') {
        showMessage(`An account with that email already exists.`, true);
    } else if (data.status === 'user_taken') {
        showMessage('This profile already has an account linked to it.', true);
    } else if (data.status === 'forbidden') {
        showMessage('Admin access required to create accounts.', true);
    } else {
        showMessage(data.message || 'Error creating account.', true);
    }
}

window.onload = async () => {
    await loadUsers();

    const roleSelect     = document.getElementById('role');
    const userLinkGroup  = document.getElementById('user-link-group');
    const adminEmailGroup = document.getElementById('admin-email-group');

    roleSelect.addEventListener('change', () => {
        const isUser = roleSelect.value === 'user';
        userLinkGroup.style.display  = isUser ? 'flex' : 'none';
        adminEmailGroup.style.display = isUser ? 'none' : 'flex';
    });

    document.getElementById('register-btn').addEventListener('click', handleRegister);
};
