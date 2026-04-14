const apiUrl = 'http://127.0.0.1:8000/tag';

setInterval(async function () {
    await getTags();
}, 1000)

async function getTags() {
    try {
        const response = await fetch('/tag');
        const data = await response.json();
        const cardList = document.getElementById('card-list');
        cardList.innerHTML = '';

        data.tags.forEach(tag => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `${tag} <button onclick="removeTag('${tag}')">Remove</button>`;
            cardList.appendChild(listItem);
        });
    } catch (error) {
        console.error("Error fetching tags:", error);
    }
}

async function addTag() {
    const cardId = document.getElementById('card-id').value;
    if (!cardId) {
        alert('Please enter a valid card UID');
        return;
    }

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: cardId })
    });

    const data = await response.json();

    if (data.status === 'ok') {
        showMessage(`Tag '${data.added_tag}' added successfully!`);
    } else {
        showMessage(data.message, true);
    }

    getTags();
}

async function removeTag(tagId) {
    const response = await fetch(`${apiUrl}/${tagId}`, {
        method: 'DELETE',
    });

    const data = await response.json();

    if (data.status === "removed") {
        showMessage(`Tag '${data.removed_tag}' removed successfully!`);
    } else {
        showMessage(data.message, true);
    }

    getTags();
}

function showMessage(message, isError = false) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.style.color = isError ? 'red' : 'green';
}

window.onload = getTags;