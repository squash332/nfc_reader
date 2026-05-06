import { showMessage } from './utils.js';

async function handleLogin() {
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showMessage('Email and password required.', true);
        return;
    }

    const res  = await fetch('/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (data.status === 'ok') {
        window.location.href = data.role === 'admin' ? '/' : `/user/${data.user_id}`;
    } else {
        showMessage('Invalid email or password.', true);
    }
}

window.onload = () => {
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    ['email', 'password'].forEach(id => {
        document.getElementById(id).addEventListener('keydown', e => {
            if (e.key === 'Enter') handleLogin();
        });
    });
};
