export function attachCustomSelect(btn, hiddenInput, options, onChange) {
    let dropdown = null;
    const valueEl = btn.querySelector('.custom-select-value');

    function closeDropdown() {
        if (!dropdown) return;
        dropdown.remove();
        dropdown = null;
        btn.classList.remove('open');
    }

    function openDropdown() {
        closeDropdown();
        dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';

        const rect = btn.getBoundingClientRect();
        dropdown.style.top   = `${rect.bottom}px`;
        dropdown.style.left  = `${rect.left}px`;
        dropdown.style.width = `${rect.width}px`;

        options.forEach(opt => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            if (hiddenInput.value === opt.value) item.classList.add('autocomplete-item-selected');
            item.innerHTML = `
                <div class="autocomplete-email">${opt.label}</div>
                ${opt.meta ? `<div class="autocomplete-meta">${opt.meta}</div>` : ''}
            `;
            item.addEventListener('mousedown', e => {
                e.preventDefault();
                hiddenInput.value  = opt.value;
                valueEl.textContent = opt.label;
                btn.classList.add('has-value');
                closeDropdown();
                onChange(opt.value);
            });
            dropdown.appendChild(item);
        });

        document.body.appendChild(dropdown);
        btn.classList.add('open');
    }

    btn.addEventListener('click', () => { if (dropdown) closeDropdown(); else openDropdown(); });
    btn.addEventListener('blur',  closeDropdown);
}


export function attachAutocomplete(input, getUsers, {
    display  = u => ({ top: u.email, bottom: [u.full_name, u.position].filter(Boolean).join(' · ') }),
    filter   = (u, q) => u.email?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q),
    onSelect = u => { input.value = u.email; },
} = {}) {
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
            const { top, bottom } = display(user);
            item.innerHTML = `
                <div class="autocomplete-email">${top}</div>
                ${bottom ? `<div class="autocomplete-meta">${bottom}</div>` : ''}
            `;
            item.addEventListener('mousedown', e => {
                e.preventDefault();
                onSelect(user);
                closeDropdown();
            });
            dropdown.appendChild(item);
        });

        document.body.appendChild(dropdown);
    }

    input.addEventListener('input', () => {
        const q = input.value.toLowerCase();
        if (!q) { closeDropdown(); return; }
        const matches = getUsers().filter(u => filter(u, q)).slice(0, 6);
        openDropdown(matches);
    });

    input.addEventListener('focus', () => {
        if (input.value) input.dispatchEvent(new Event('input'));
    });

    input.addEventListener('blur', closeDropdown);
}
