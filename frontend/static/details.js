import { showMessage } from './script.js';
const apiUrl = 'http://127.0.0.1:8000/details/data';
const tagApiUrl = 'http://127.0.0.1:8000/tag';

let cachedEvents = [];

function renderDetails(data, range) {
    const container = document.getElementById("content");
    container.innerHTML = "";

    if (!data.events || data.events.length === 0) {
        showMessage("No data found.", "content", true);
        return;
    }
    console.log(range);
    const header = document.createElement("h2");
    if (range === "custom") {
        const start = document.querySelector(".date-control-from").value;
        const end = document.querySelector(".date-control-to").value;

        const startDate = new Date(start);
        const endDate = new Date(end);

        const options = { year: "numeric", month: "short", day: "numeric" };

        const startFormatted = startDate.toLocaleDateString(undefined, options);
        const endFormatted = endDate.toLocaleDateString(undefined, options);
        range = `${startFormatted} to ${endFormatted}`;
    }
    header.textContent = `Logs - ${range}`;
    container.appendChild(header);

    data.events.forEach(e => {
        const div = document.createElement("div");
        let displayTime = range === "day" ? e.event_time : e.event_time.split("T")[0];
        div.textContent = `${e.full_name} | ${e.description} | ${displayTime} | ${e.event_type}`;
        container.appendChild(div);
    });
}

function renderUserCards(cards) {
    const container = document.getElementById("user-cards-container");
    container.innerHTML = "";

    if (!cards || cards.length === 0) {
        showMessage("No cards found for this user.", "user-cards-container", true);
        return;
    }

    const grouped = {};

    cards.forEach(card => {
        const key = card.user_id; // 

        if (!grouped[key]) {
            grouped[key] = {
                full_name: card.full_name,
                cards: []
            };
        }

        grouped[key].cards.push(card);
    });

    Object.values(grouped).forEach(group => {
        const nameHeader = document.createElement("h2");
        nameHeader.textContent = `Full name: ${group.full_name}`;
        container.appendChild(nameHeader);

        group.cards.forEach(card => {
            const div = document.createElement("div");
            div.classList.add("card");
            div.textContent = `${card.card_uid} | ${card.description}`;
            container.appendChild(div);
        });
    });
}



async function loadDetails(range, startDate = null, endDate = null, event_type = null) {
    try {

        const detailsRes = await fetch(`${apiUrl}?time_range=${range}&start_date=${startDate}&end_date=${endDate}&event_type=${event_type}`);
        const detailsData = await detailsRes.json();

        console.log("details data from load details:", detailsData);
        let displayRange;
        if (range === "custom") {
            const start = document.querySelector(".date-control-from").value;
            const end = document.querySelector(".date-control-to").value;
            const startDateObj = new Date(start);
            const endDateObj = new Date(end);
            const options = { year: "numeric", month: "short", day: "numeric" };
            displayRange = `${startDateObj.toLocaleDateString(undefined, options)} to ${endDateObj.toLocaleDateString(undefined, options)}`;
        } else {
            const btn = document.querySelector(`#${range}-btn`);
            displayRange = btn ? btn.textContent : range;
        };
        cachedEvents = detailsData.events || [];
        renderDetails({events: cachedEvents}, displayRange);
        document.querySelectorAll(".date-control-from, .date-control-to").forEach(input => input.value = ""); // reset date inputs
    } catch (err) {
        console.error("Error loading details:", err);
    }
}

async function searchByUser(full_name) {
    try {
        const searchRes = await fetch(`${tagApiUrl}/${encodeURIComponent(full_name)}`);
        const searchData = await searchRes.json();
        console.log(searchData);
        renderUserCards(searchData.tags);
        document.querySelector("#search-user-input").value = "";
    } catch (err) {
        console.error("Error searching by user:", err);
    }
}

window.onload = () => {
    loadDetails("month");

    document.getElementById("month-btn").addEventListener("click", () => loadDetails("month"));
    document.getElementById("week-btn").addEventListener("click", () => loadDetails("week"));
    document.getElementById("day-btn").addEventListener("click", () => loadDetails("day"));
    document.getElementById("get-data-btn").addEventListener("click", () => loadDetails("custom", document.querySelector(".date-control-from").value, document.querySelector(".date-control-to").value));
    document.getElementById("search-user-input").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const userName = e.target.value.trim();
            if (userName) {
                searchByUser(userName)
                e.target.value = "";
            }
        }
    });

    document.getElementById("event-type-select").addEventListener("change", (e) => {
    const selectedType = e.target.value;
    if (!selectedType) {
        return;
    }
    if (selectedType === "") {
        renderDetails({ events: cachedEvents }, "Both");
    }
    else {
        const filtered = cachedEvents.filter(ev => ev.event_type === selectedType);
        renderDetails({ events: filtered }, selectedType);
    }
});
}