const apiUrl = 'http://127.0.0.1:8000/details/data';
const tagApiUrl = 'http://127.0.0.1:8000/tag';  

function renderDetails(data, range) {
    const container = document.getElementById("content");
    container.innerHTML = "";

    if (!data.events || data.events.length === 0) {
        container.textContent = "No data found";
        return;
    }

    const header = document.createElement("h2");
    header.textContent = `Logs - ${range}`;
    container.appendChild(header);
    
    data.events.forEach(e => {
        const div = document.createElement("div");
        let displayTime = range === "day" ? e.event_time : e.event_time.split("T")[0];
        div.textContent = `${e.card_uid} | ${e.description} | ${displayTime} | ${e.event_type}`;
        container.appendChild(div);
    });
}

function renderUserCards(cards) {
    const container = document.getElementById("user-cards-container");
    container.innerHTML = "";

    if (!cards || cards.length === 0) {
        container.textContent = "No cards found for this user.";
        return;
    }

    const full_name = cards[0].full_name;
    const name_header = document.createElement("h2");
    name_header.textContent = `Full name: ${full_name}`;
    container.appendChild(name_header);

    cards.forEach(card => {

        const div = document.createElement("div");
        div.classList.add("card");
        div.textContent = `${card.card_uid} | ${card.description}`;
        container.appendChild(div);

    });

}

async function loadDetails(range, startDate = null, endDate = null) {
    try {

        const detailsRes = await fetch(`${apiUrl}?time_range=${range}&start_date=${startDate}&end_date=${endDate}`);
        const detailsData = await detailsRes.json();

        renderDetails(detailsData, range);
        document.querySelectorAll(".date-control-from, .date-control-to").forEach(input => input.value = ""); // reset date inputs
    } catch (err) {
        console.error("Error loading details:", err);
    }
}

async function searchByUser(full_name) {
    try {
        const searchRes = await fetch(`${tagApiUrl}/${encodeURIComponent(full_name)}`);
        const searchData = await searchRes.json();
        
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
}