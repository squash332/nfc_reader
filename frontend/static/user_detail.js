const userId = parseInt(window.location.pathname.split('/').pop(), 10);

let currentYear, currentMonth;

// ── API ───────────────────────────────────────────────────────────────────────

async function fetchUserInfo() {
    const res = await fetch(`/user/${userId}/info`);
    return res.json();
}

async function fetchUserEvents(year, month) {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const res = await fetch(`/user/${userId}/events?month=${monthStr}`);
    return res.json();
}


// ── USER INFO ─────────────────────────────────────────────────────────────────

async function loadUserInfo() {
    const data = await fetchUserInfo();
    if (data.status === 'not_found') {
        document.getElementById('ud-name').textContent = 'User not found';
        return;
    }
    const u = data.user;
    document.title = `SENTINEL — ${u.full_name}`;
    document.getElementById('ud-name').textContent = u.full_name;
    document.getElementById('ud-meta').textContent = [u.email, u.position].filter(Boolean).join(' · ');
    document.getElementById('ud-cards').textContent = `${u.card_count} card${u.card_count !== 1 ? 's' : ''}`;
}


// ── CALENDAR ─────────────────────────────────────────────────────────────────

function groupByDate(events) {
    const map = {};
    events.forEach(e => {
        const date = e.event_time.slice(0, 10);
        const time = e.event_time.slice(11, 16);
        if (!map[date]) map[date] = {};

        if (e.event_type === 'in' && !map[date].in)   map[date].in  = time;
        if (e.event_type === 'out')                    map[date].out = time;
        if (e.event_type === 'rejected')               map[date].rejected = true;
    });
    return map;
}

function buildCalendar(year, month, byDate) {
    const grid = document.getElementById('cal-grid');
    grid.innerHTML = '';

    const firstDay  = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();

    // Monday-based offset (0 = Mon … 6 = Sun)
    let offset = firstDay.getDay() - 1;
    if (offset < 0) offset = 6;

    const totalCells = offset + daysInMonth;
    const rows = Math.ceil(totalCells / 7);

    for (let i = 0; i < rows * 7; i++) {
        const dayNum = i - offset + 1;
        const cell = document.createElement('div');

        if (dayNum < 1 || dayNum > daysInMonth) {
            cell.className = 'cal-day other-month';
            grid.appendChild(cell);
            continue;
        }

        const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
        const d = byDate[dateStr];
        const isToday = year === today.getFullYear() && month === today.getMonth() + 1 && dayNum === today.getDate();

        cell.className = 'cal-day';
        if (isToday)          cell.classList.add('is-today');
        if (d?.in && d?.out)  cell.classList.add('has-full');
        else if (d?.in)       cell.classList.add('has-in-only');
        if (d?.rejected)      cell.classList.add('has-rejected');

        cell.innerHTML = `
            <span class="cal-day-num">${dayNum}</span>
            ${d?.in  ? `<div class="cal-time cal-time-in">▲ ${d.in}</div>`  : ''}
            ${d?.out ? `<div class="cal-time cal-time-out">▼ ${d.out}</div>` : ''}
            ${d?.in && !d?.out ? `<div class="cal-still-in">INSIDE</div>` : ''}
            ${d?.rejected ? `<div class="cal-rejected">✕ REJECTED</div>` : ''}
        `;

        grid.appendChild(cell);
    }
}

function updateSummary(byDate, year, month) {
    const days = Object.keys(byDate).filter(d => d.startsWith(`${year}-${String(month).padStart(2,'0')}`));
    const present = days.filter(d => byDate[d].in).length;

    if (present === 0) {
        document.getElementById('cal-summary').textContent = 'No activity this month';
        return;
    }

    const inTimes  = days.map(d => byDate[d].in).filter(Boolean).map(t => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    });
    const outTimes = days.map(d => byDate[d].out).filter(Boolean).map(t => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    });

    const avgIn  = Math.round(inTimes.reduce((a, b) => a + b, 0) / inTimes.length);
    const avgOut = outTimes.length ? Math.round(outTimes.reduce((a, b) => a + b, 0) / outTimes.length) : null;
    const fmt = mins => `${String(Math.floor(mins / 60)).padStart(2,'0')}:${String(mins % 60).padStart(2,'0')}`;

    const parts = [`${present} day${present !== 1 ? 's' : ''} present`, `avg in ${fmt(avgIn)}`];
    if (avgOut) parts.push(`avg out ${fmt(avgOut)}`);
    document.getElementById('cal-summary').textContent = parts.join(' · ');
}

function updateMonthLabel(year, month) {
    const label = new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    document.getElementById('cal-month-label').textContent = label.toUpperCase();
}

async function loadMonth(year, month) {
    currentYear  = year;
    currentMonth = month;
    updateMonthLabel(year, month);

    const data = await fetchUserEvents(year, month);
    const byDate = groupByDate(data.events || []);
    buildCalendar(year, month, byDate);
    updateSummary(byDate, year, month);
}


// ── INIT ──────────────────────────────────────────────────────────────────────

window.onload = async () => {
    await loadUserInfo();

    const now = new Date();
    await loadMonth(now.getFullYear(), now.getMonth() + 1);

    document.getElementById('prev-month').addEventListener('click', () => {
        let m = currentMonth - 1, y = currentYear;
        if (m < 1) { m = 12; y--; }
        loadMonth(y, m);
    });

    document.getElementById('next-month').addEventListener('click', () => {
        let m = currentMonth + 1, y = currentYear;
        if (m > 12) { m = 1; y++; }
        loadMonth(y, m);
    });
};
