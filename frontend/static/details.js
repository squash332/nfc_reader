import { initAuth } from './auth_guard.js';
initAuth();

const apiUrl = 'http://127.0.0.1:8000/details/data';
const tagApiUrl = 'http://127.0.0.1:8000/tag';

let cachedEvents = [];
let activeRange = 'month';
let activeEventType = '';
let activeUserFilter = '';

// ── HELPERS ──────────────────────────────────────────────────────────────────

function formatTimestamp(raw) {
    // Handles both "2025-01-15T14:32:00" and "2025-01-15 14:32:00"
    const dt = new Date(raw.replace(' ', 'T'));
    if (isNaN(dt)) return { date: '', time: raw };
    const date = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return { date, time };
}

function setRangeLabel(label) {
    const el = document.getElementById('log-range-label');
    if (el) el.textContent = label;
}

function updateCounts(events) {
    const total = events.length;
    const inCount = events.filter(e => e.event_type === 'in').length;
    const outCount = events.filter(e => e.event_type === 'out').length;

    document.getElementById('count-total').textContent = total;
    document.getElementById('count-in').textContent = inCount;
    document.getElementById('count-out').textContent = outCount;
}


// ── RENDER LOG ROWS ───────────────────────────────────────────────────────────

function renderDetails(events) {
    const container = document.getElementById('content');
    container.innerHTML = '';

    if (!events || events.length === 0) {
        container.innerHTML = `<div class="empty-state"><span>◌</span><span>No records found for this range.</span></div>`;
        updateCounts([]);
        return;
    }

    updateCounts(events);

    events.forEach((e, i) => {
        const { date, time } = formatTimestamp(e.event_time);
        const isIn = e.event_type === 'in';
        const isRejected = e.event_type === 'rejected'; 
        const badgeClass = isIn ? 'badge-in' : isRejected ? 'badge-rejected' : 'badge-out';
        const badgeLabel = isIn ? 'ENTRY' : isRejected ? 'REJECTED' : 'EXIT';


        const row = document.createElement('div');
        row.className = `log-row event-${e.event_type}`;
        row.style.animationDelay = `${Math.min(i * 20, 400)}ms`;

                row.innerHTML = `
            <div class="log-timestamp">
                <span class="date-part">${date}</span>${time}
            </div>
            <div class="log-user">${e.user_id && e.full_name ? `<a href="/user/${e.user_id}" class="user-link">${e.full_name}</a>` : (e.full_name ?? '—')}</div>
            <div class="log-email">${e.email ?? '—'}</div>
            <div class="log-card" title="${e.card_uid ?? ''}">${e.description ?? e.card_uid ?? '—'}</div>
            <div>
                <span class="log-badge ${badgeClass}">
                    <span class="badge-dot"></span>
                    ${badgeLabel}
                </span>
            </div>
        `;


        container.appendChild(row);
    });
}


// ── RENDER USER CARD LOOKUP ───────────────────────────────────────────────────

function renderUserCards(cards) {
    const container = document.getElementById('user-cards-container');
    container.innerHTML = '';

    if (!cards || cards.length === 0) {
        container.innerHTML = `<div class="inline-error">No cards found for this user.</div>`;
        return;
    }

    // group by user
    const grouped = {};
    cards.forEach(card => {
        if (!grouped[card.user_id]) {
            grouped[card.user_id] = { full_name: card.full_name, cards: [] };
        }
        grouped[card.user_id].cards.push(card);
    });

    Object.values(grouped).forEach(group => {
        const wrapper = document.createElement('div');
        wrapper.className = 'user-group';

        const nameHeader = document.createElement('h2');
        nameHeader.textContent = group.full_name;
        wrapper.appendChild(nameHeader);

        group.cards.forEach(card => {
            const item = document.createElement('div');
            item.className = 'user-card-item';
            const status = card.is_active ? 'VALID' : 'INVALID';
            item.innerHTML = `
                <span class="card-uid">${card.card_uid}</span>
                <span class="card-lookup-meta">${card.description ?? '—'} · ${status}</span>
                <a href="/?card=${encodeURIComponent(card.card_uid)}" class="card-manage-link">MANAGE →</a>
            `;
            wrapper.appendChild(item);
        });

        container.appendChild(wrapper);
    });

}


// ── DATA LOADING ──────────────────────────────────────────────────────────────

async function loadDetails(range, startDate = null, endDate = null) {
    const container = document.getElementById('content');
    container.innerHTML = `<div class="loading-state"><span class="loading-spinner">◌</span><span>Querying records…</span></div>`;

    try {
        const params = new URLSearchParams({ time_range: range });
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (activeEventType) params.append('event_type', activeEventType);
        if (activeUserFilter) params.append('full_name', activeUserFilter);

        const res = await fetch(`${apiUrl}?${params}`);
        const data = await res.json();

        if (data.error) {
            container.innerHTML = `<div class="empty-state"><span class="inline-error">${data.error}</span></div>`;
            return;
        }

        cachedEvents = data.events || [];
        renderDetails(cachedEvents);

    } catch (err) {
        console.error('Error loading details:', err);
        container.innerHTML = `<div class="empty-state"><span class="inline-error">Failed to connect to server.</span></div>`;
    }
}

async function searchByUser(full_name) {
    try {
        const res = await fetch(`${tagApiUrl}/${encodeURIComponent(full_name)}`);
        const data = await res.json();
        renderUserCards(data.tags);
    } catch (err) {
        console.error('Error searching by user:', err);
    }
}


// ── RANGE BUTTON STATE ────────────────────────────────────────────────────────

function setActiveRange(id, labelText) {
    document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(id);
    if (btn) btn.classList.add('active');
    setRangeLabel(labelText);
}


// ── FILTER TABS STATE ─────────────────────────────────────────────────────────

function applyEventFilter(type) {
    activeEventType = type;

    // re-filter cached events for instant response; re-fetch respects filter too
    const filtered = type ? cachedEvents.filter(e => e.event_type === type) : cachedEvents;
    renderDetails(filtered);
}



// ── INIT ──────────────────────────────────────────────────────────────────────
// type="module" scripts are deferred — DOM is ready and flatpickr (regular script) has
// already executed by the time this runs, so no wrapper needed.

const fpConfig = {
    enableTime: true,
    dateFormat: 'Y-m-d H:i',
    altInput: true,
    altFormat: 'F j, Y (h:i K)',
    time_24hr: false,
};
flatpickr('.date-control-from', fpConfig);
flatpickr('.date-control-to', fpConfig);

loadDetails('month');
setRangeLabel('Last 30 days');

document.getElementById('day-btn').addEventListener('click', () => {
    activeRange = 'day';
    setActiveRange('day-btn', 'Last 24 hours');
    loadDetails('day');
});

document.getElementById('week-btn').addEventListener('click', () => {
    activeRange = 'week';
    setActiveRange('week-btn', 'Last 7 days');
    loadDetails('week');
});

document.getElementById('month-btn').addEventListener('click', () => {
    activeRange = 'month';
    setActiveRange('month-btn', 'Last 30 days');
    loadDetails('month');
});

document.getElementById('get-data-btn').addEventListener('click', () => {
    const from = document.querySelector('.date-control-from').value;
    const to = document.querySelector('.date-control-to').value;

    if (!from || !to) {
        ['.date-control-from', '.date-control-to'].forEach(sel => {
            const altEl = document.querySelector(`${sel} + input`);
            const target = altEl || document.querySelector(sel);
            target.style.borderColor = 'var(--red)';
            setTimeout(() => target.style.borderColor = '', 1500);
        });
        return;
    }

    activeEventType = '';
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.filter-tab[data-type=""]').classList.add('active');

    activeRange = 'custom';
    const [fromDate, toDate] = [new Date(from), new Date(to)];
    const opts = { day: 'numeric', month: 'short', year: 'numeric' };
    setRangeLabel(`${fromDate.toLocaleDateString(undefined, opts)} → ${toDate.toLocaleDateString(undefined, opts)}`);
    loadDetails('custom', from, to);

    document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
});

document.getElementById('clear-date-btn').addEventListener('click', () => {
    document.querySelector('.date-control-from')._flatpickr.clear();
    document.querySelector('.date-control-to')._flatpickr.clear();

    activeRange = 'month';
    activeEventType = '';
    setActiveRange('month-btn', 'Last 30 days');
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.filter-tab[data-type=""]').classList.add('active');

    loadDetails('month');
});

document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        applyEventFilter(tab.dataset.type);
    });
});

document.getElementById('search-user-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        const name = e.target.value.trim();
        if (name) {
            searchByUser(name);
            e.target.value = '';
        }
    }
});

document.getElementById('filter-user-input').addEventListener('input', e => {
    if (e.target.value === '') {
        activeUserFilter = '';
        loadDetails(activeRange);
    }
});

document.getElementById('filter-user-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        activeUserFilter = e.target.value.trim();
        loadDetails(activeRange);
    }
});