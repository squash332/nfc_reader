export async function initAuth() {
    const res = await fetch('/auth/me');
    if (!res.ok) {
        window.location.href = '/login';
        return null;
    }
    const user = await res.json();

    const emailEl = document.getElementById('topbar-email');
    if (emailEl) emailEl.textContent = user.email;

    document.getElementById('topbar-logout')?.addEventListener('click', async () => {
        await fetch('/auth/logout', { method: 'POST' });
        window.location.href = '/login';
    });

    if (user.role === 'user') {
        document.querySelectorAll('.nav-admin').forEach(el => {
            el.style.display = 'none';
        });
    }

    return user;
}
