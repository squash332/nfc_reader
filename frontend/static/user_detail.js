import { initAuth } from './auth_guard.js';

const userId = parseInt(window.location.pathname.split('/').pop(), 10);
let authUser = null;

let currentYear, currentMonth;
let currentWeekMonday;
let viewMode = 'month';

// ── ISO WEEK HELPERS ──────────────────────────────────────────────────────────

function getISOWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function getMondayOf(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return d;
}

// ── API ───────────────────────────────────────────────────────────────────────

async function fetchUserInfo() {
    const res = await fetch(`/user/${userId}/info`);
    return res.json();
}

async function fetchUserStats() {
    const res = await fetch(`/user/${userId}/stats`);
    return res.json();
}

async function fetchUserCards() {
    const res = await fetch(`/user/${userId}/cards`);
    return res.json();
}

async function fetchMonthEvents(year, month) {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const res = await fetch(`/user/${userId}/events?month=${monthStr}`);
    return res.json();
}

async function fetchWeekEvents(monday) {
    const year = monday.getFullYear();
    const week = getISOWeek(monday);
    const res = await fetch(`/user/${userId}/events?week=${year}-W${String(week).padStart(2, '0')}`);
    return res.json();
}


// ── SIDEBAR LOADERS ───────────────────────────────────────────────────────────

function fmtMins(mins) {
    if (!mins) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
}

async function loadUserInfo() {
    const data = await fetchUserInfo();
    if (data.status === 'not_found') {
        document.getElementById('ud-name').textContent = 'User not found';
        return;
    }
    const u = data.user;
    document.title = `SENTINEL — ${u.full_name}`;

    const initials = u.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('ud-avatar').textContent = initials;
    document.getElementById('ud-name').textContent = u.full_name;
    if (u.position) document.getElementById('ud-position').textContent = u.position;
    if (u.email)    document.getElementById('ud-email').textContent = u.email;
    if (u.created_at) {
        const since = new Date(u.created_at.replace(' ', 'T'))
            .toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
        document.getElementById('ud-since').textContent = `SINCE ${since.toUpperCase()}`;
    }
}

async function loadStats() {
    const data = await fetchUserStats();
    document.getElementById('stat-days').textContent  = data.days_present ?? '—';
    document.getElementById('stat-avg').textContent   = fmtMins(data.avg_minutes);
    document.getElementById('stat-total').textContent = fmtMins(data.total_minutes);

    if (data.last_seen) {
        const d = new Date(data.last_seen.replace(' ', 'T'));
        const isToday = d.toDateString() === new Date().toDateString();
        document.getElementById('stat-last').textContent = isToday
            ? `TODAY ${data.last_seen.slice(11, 16)}`
            : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase();
    }
}

async function loadCards() {
    const data = await fetchUserCards();
    const cards = data.cards || [];
    document.getElementById('ud-card-count').textContent = `(${cards.length})`;

    const container = document.getElementById('ud-cards-list');
    container.innerHTML = '';

    if (cards.length === 0) {
        container.innerHTML = '<div class="ud-no-cards">No cards assigned</div>';
        return;
    }

    cards.forEach(c => {
        const item = document.createElement('div');
        item.className = 'ud-card-item';
        item.innerHTML = `
            <div>
                <div class="ud-card-uid">${c.card_uid}</div>
                ${c.description ? `<div class="ud-card-desc">${c.description}</div>` : ''}
                ${authUser?.role !== 'user' ? `<a href="/?card=${encodeURIComponent(c.card_uid)}" class="ud-card-manage">MANAGE →</a>` : ''}
            </div>
            <span class="card-status-badge ${c.is_active ? 'badge-active' : 'badge-inactive'}">
                <span class="badge-dot"></span>
                ${c.is_active ? 'VALID' : 'INVALID'}
            </span>
        `;
        container.appendChild(item);
    });
}


// ── EVENT GROUPING ────────────────────────────────────────────────────────────

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

function calcDuration(inTime, outTime) {
    const [ih, im] = inTime.split(':').map(Number);
    const [oh, om] = outTime.split(':').map(Number);
    const mins = (oh * 60 + om) - (ih * 60 + im);
    if (mins <= 0) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
}


// ── CALENDAR CELLS ────────────────────────────────────────────────────────────

function buildDayCell(dayNum, d, isToday, isOtherMonth = false) {
    const cell = document.createElement('div');
    cell.className = 'cal-day';
    if (isOtherMonth)     cell.classList.add('other-month');
    if (isToday)          cell.classList.add('is-today');
    if (d?.in && d?.out)  cell.classList.add('has-full');
    else if (d?.in)       cell.classList.add('has-in-only');
    if (d?.rejected)      cell.classList.add('has-rejected');

    const duration = (d?.in && d?.out) ? calcDuration(d.in, d.out) : '';

    cell.innerHTML = `
        <span class="cal-day-num">${dayNum}</span>
        ${d?.in  ? `<div class="cal-time cal-time-in">▲ ${d.in}</div>`  : ''}
        ${d?.out ? `<div class="cal-time cal-time-out">▼ ${d.out}</div>` : ''}
        ${duration ? `<div class="cal-duration">${duration}</div>` : ''}
        ${d?.in && !d?.out ? `<div class="cal-still-in">INSIDE</div>` : ''}
        ${d?.rejected ? `<div class="cal-rejected">✕ REJECTED</div>` : ''}
    `;
    return cell;
}


// ── MONTH VIEW ────────────────────────────────────────────────────────────────

function buildCalendar(year, month, byDate) {
    const grid = document.getElementById('cal-grid');
    grid.innerHTML = '';
    grid.classList.remove('cal-grid-week');

    const firstDay    = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const today       = new Date();

    let offset = firstDay.getDay() - 1;
    if (offset < 0) offset = 6;

    const rows = Math.ceil((offset + daysInMonth) / 7);

    for (let i = 0; i < rows * 7; i++) {
        const dayNum = i - offset + 1;
        if (dayNum < 1 || dayNum > daysInMonth) {
            const blank = document.createElement('div');
            blank.className = 'cal-day other-month';
            grid.appendChild(blank);
            continue;
        }
        const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
        const isToday = year === today.getFullYear() && month === today.getMonth() + 1 && dayNum === today.getDate();
        grid.appendChild(buildDayCell(dayNum, byDate[dateStr], isToday));
    }
}


// ── WEEK VIEW ─────────────────────────────────────────────────────────────────

function buildWeekCalendar(monday, byDate) {
    const grid = document.getElementById('cal-grid');
    grid.innerHTML = '';
    grid.classList.add('cal-grid-week');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const isToday = d.getTime() === today.getTime();
        grid.appendChild(buildDayCell(d.getDate(), byDate[dateStr], isToday));
    }
}


// ── LABELS ────────────────────────────────────────────────────────────────────

function updateMonthLabel(year, month) {
    const label = new Date(year, month - 1, 1)
        .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    document.getElementById('cal-label').textContent = label.toUpperCase();
}

function updateWeekLabel(monday) {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase();
    document.getElementById('cal-label').textContent =
        `${fmt(monday)} – ${fmt(sunday)} ${sunday.getFullYear()}`;
}


// ── SUMMARY ───────────────────────────────────────────────────────────────────

function updateSummary(byDate, datePrefix = '') {
    const days = datePrefix
        ? Object.keys(byDate).filter(d => d.startsWith(datePrefix))
        : Object.keys(byDate);
    const present = days.filter(d => byDate[d].in).length;

    if (present === 0) {
        document.getElementById('cal-summary').textContent = 'No activity';
        return;
    }

    const inTimes = days.map(d => byDate[d].in).filter(Boolean).map(t => {
        const [h, m] = t.split(':').map(Number); return h * 60 + m;
    });
    const outTimes = days.map(d => byDate[d].out).filter(Boolean).map(t => {
        const [h, m] = t.split(':').map(Number); return h * 60 + m;
    });

    const avgIn  = Math.round(inTimes.reduce((a, b) => a + b, 0) / inTimes.length);
    const avgOut = outTimes.length
        ? Math.round(outTimes.reduce((a, b) => a + b, 0) / outTimes.length)
        : null;
    const fmt = mins => `${String(Math.floor(mins / 60)).padStart(2,'0')}:${String(mins % 60).padStart(2,'0')}`;

    const parts = [`${present} day${present !== 1 ? 's' : ''} present`, `avg in ${fmt(avgIn)}`];
    if (avgOut) parts.push(`avg out ${fmt(avgOut)}`);
    document.getElementById('cal-summary').textContent = parts.join(' · ');
}


// ── LOAD ──────────────────────────────────────────────────────────────────────

async function loadMonth(year, month) {
    currentYear  = year;
    currentMonth = month;
    updateMonthLabel(year, month);

    const data = await fetchMonthEvents(year, month);
    const byDate = groupByDate(data.events || []);
    buildCalendar(year, month, byDate);
    updateSummary(byDate, `${year}-${String(month).padStart(2, '0')}`);
}

async function loadWeek(monday) {
    currentWeekMonday = monday;
    updateWeekLabel(monday);

    const data = await fetchWeekEvents(monday);
    const byDate = groupByDate(data.events || []);
    buildWeekCalendar(monday, byDate);
    updateSummary(byDate);
}


// ── VIEW TOGGLE ───────────────────────────────────────────────────────────────

function setViewMode(mode) {
    viewMode = mode;
    document.getElementById('view-month').classList.toggle('active', mode === 'month');
    document.getElementById('view-week').classList.toggle('active', mode === 'week');
}


// ── INIT ──────────────────────────────────────────────────────────────────────

window.onload = async () => {
    authUser = await initAuth();
    if (authUser?.role === 'user') {
        const back = document.querySelector('.ud-back');
        if (back) back.style.display = 'none';
    }
    await loadUserInfo();
    loadStats();
    loadCards();

    const now = new Date();
    await loadMonth(now.getFullYear(), now.getMonth() + 1);

    document.getElementById('prev-btn').addEventListener('click', () => {
        if (viewMode === 'month') {
            let m = currentMonth - 1, y = currentYear;
            if (m < 1) { m = 12; y--; }
            loadMonth(y, m);
        } else {
            const prev = new Date(currentWeekMonday);
            prev.setDate(prev.getDate() - 7);
            loadWeek(prev);
        }
    });

    document.getElementById('next-btn').addEventListener('click', () => {
        if (viewMode === 'month') {
            let m = currentMonth + 1, y = currentYear;
            if (m > 12) { m = 1; y++; }
            loadMonth(y, m);
        } else {
            const next = new Date(currentWeekMonday);
            next.setDate(next.getDate() + 7);
            loadWeek(next);
        }
    });

    document.getElementById('view-month').addEventListener('click', () => {
        if (viewMode === 'month') return;
        setViewMode('month');
        loadMonth(currentWeekMonday.getFullYear(), currentWeekMonday.getMonth() + 1);
    });

    document.getElementById('view-week').addEventListener('click', () => {
        if (viewMode === 'week') return;
        setViewMode('week');
        currentWeekMonday = getMondayOf(new Date());
        loadWeek(currentWeekMonday);
    });
};
