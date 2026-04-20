const apiUrl = 'http://127.0.0.1:8000/tag';
let isEditing = false;
// ui helper
function showMessage(message, isError = false) {
    const el = document.getElementById('message');
    el.textContent = message;
    el.style.color = isError ? 'red' : 'green';
    el.style.display = 'block';
}

function clearList() {
    document.getElementById('card-list').innerHTML = '';
}

// api
async function fetchTags() {
    const res = await fetch(apiUrl);
    return res.json();
}

async function createTag(card_uid, description) {
    return fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_uid, description })
    });
}

async function deleteTag(card_uid) {
    return fetch(`${apiUrl}/${card_uid}`, {
        method: 'DELETE'
    });
}

async function updateTag(card_uid, description, is_active) {
    return fetch(`${apiUrl}/${card_uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, is_active })
    });
}

// render
function createTagElement(tag) {
    const card_uid = tag.card_uid;

    const li = document.createElement('li');
    li.id = `tag-${card_uid}`;

    const text = document.createElement('span');
    text.textContent = `${card_uid} | ${tag.description ?? ""} | ${tag.is_active ?? ""}`;

    const btnWrap = document.createElement('div');

    const removeBtn = document.createElement('button');
    removeBtn.textContent = "Remove";
    removeBtn.onclick = () => handleRemove(tag.card_uid);

    const editBtn = document.createElement('button');
    editBtn.textContent = "Edit";
    editBtn.onclick = () => enterEditMode(tag);

    btnWrap.appendChild(removeBtn);
    btnWrap.appendChild(editBtn);

    li.appendChild(text);
    li.appendChild(btnWrap);

    return li;
}

function renderTags(tags) {
    const list = document.getElementById('card-list');
    list.innerHTML = '';

    tags.forEach(tag => {
        list.appendChild(createTagElement(tag));
    });
}

// actions
async function loadTags() {
    try {
        const data = await fetchTags();
        renderTags(data.tags);
    } catch (err) {
        console.error(err);
        showMessage("Failed to load tags", true);
    }
}

async function handleAdd() {
    const card_uid = document.getElementById('card-uid').value;
    const description = document.getElementById('card-description').value;

    if (!card_uid || !description) {
        showMessage("Fields cannot be empty", true);
        return;
    }

    const res = await createTag(card_uid, description);
    const data = await res.json();

    if (data.status === 'ok') {
        showMessage(`Tag '${card_uid}' added`);
    } else {
        showMessage(data.message || "Error", true);
    }

    loadTags();
}

async function handleRemove(card_uid) {
    const res = await deleteTag(card_uid);
    const data = await res.json();

    if (data.status === "removed") {
        showMessage(`Tag '${card_uid}' removed`);
    } else {
        showMessage(data.message || "Error", true);
    }

    loadTags();
}

// edit
function enterEditMode(tag) {
    isEditing = true;

    const card_uid = tag.card_uid;

    const li = document.getElementById(`tag-${card_uid}`);
    li.innerHTML = '';

    const newDescription = document.createElement('input');
    newDescription.type = "text";
    newDescription.value =  "";
    newDescription.placeholder = "Enter a new card description";

    const cardActiveState = document.createElement('select');
    const optionActive = document.createElement('option');
    optionActive.value = 1;
    optionActive.textContent = "Active";

    const optionInactive = document.createElement('option');
    optionInactive.value = 0;
    optionInactive.textContent = "Inactive";

    cardActiveState.appendChild(optionActive);
    cardActiveState.appendChild(optionInactive);
    cardActiveState.value = tag.is_active ?? 1;

    const saveBtn = document.createElement('button');
    saveBtn.textContent = "Save";
    saveBtn.onclick = () => handleSave(card_uid, newDescription.value, cardActiveState.value);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = "Cancel";
    cancelBtn.onclick = () => {
        isEditing = false;
        loadTags();
    };

    li.appendChild(newDescription);
    li.appendChild(cardActiveState);
    li.appendChild(saveBtn);
    li.appendChild(cancelBtn);
}

async function handleSave(card_uid, newDescription, cardActiveState) {
    const activeStateInt = parseInt(cardActiveState, 10);
    const res = await updateTag(card_uid, newDescription, activeStateInt);
    const data = await res.json();

    if (data.status === "ok") {
        showMessage(`Tag '${card_uid}' edited`);
        loadTags();
    }
}

setInterval(pollTags, 5000);


function pollTags() {
    if(!isEditing) {
        loadTags();
    }
}
setInterval(pollTags, 5000)

window.onload = loadTags;