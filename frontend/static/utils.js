export function showMessage(text, isError = false) {
    const el = document.getElementById('message');
    el.textContent = text;
    el.className = 'message ' + (isError ? 'error' : 'success');
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => {
        el.className = 'message';
        el.textContent = '';
    }, 3500);
}
