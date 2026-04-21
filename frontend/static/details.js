import { fetchTags } from "./script.js";

const apiUrl = 'http://127.0.0.1:8000/details/data';

function renderDetails(data, range) {
    const container = document.getElementById("content");
    container.innerHTML = "";

    if (!data.events || data.events.length === 0) {
        container.textContent = "No data found";
        return;
    }

    data.events.forEach(e => {
        const div = document.createElement("div");
        let displayTime = range === "day" ? e.event_time : e.event_time.split("T")[0];
        div.textContent = `${displayTime} - ${e.event_type}`;
        container.appendChild(div);
    });
}

async function loadDetails(range) {
    try {
        const dataTags = await fetchTags();  
        if (!dataTags.tags || dataTags.tags.length === 0) return;

        const firstCardUid = dataTags.tags[0].card_uid;  
        const detailsRes = await fetch(`${apiUrl}?card_uid=${firstCardUid}&time_range=${range}`);
        const detailsData = await detailsRes.json();

        renderDetails(detailsData, range);
    } catch (err) {
        console.error("Error loading details:", err);
    }
}

window.onload = () => {
    loadDetails("month");

    document.getElementById("month-btn").addEventListener("click", () => loadDetails("month"));
    document.getElementById("week-btn").addEventListener("click", () => loadDetails("week"));
    document.getElementById("day-btn").addEventListener("click", () => loadDetails("day"));
};