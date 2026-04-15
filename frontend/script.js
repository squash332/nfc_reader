const apiUrl = 'http://127.0.0.1:8000/tag';

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

async function createTag(uid, name) {
    return fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, name })
    });
}

async function deleteTag(uid) {
    return fetch(`${apiUrl}/${uid}`, {
        method: 'DELETE'
    });
}

async function updateTag(uid, name) {
    return fetch(`${apiUrl}/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
}

// render
function createTagElement(uid, tag) {
    const li = document.createElement('li');
    li.id = `tag-${uid}`;

    const text = document.createElement('span');
    text.textContent = `${uid} | ${tag.name}`;
    text.style.flex = "1";

    const btnWrap = document.createElement('div');

    const removeBtn = document.createElement('button');
    removeBtn.textContent = "Remove";
    removeBtn.onclick = () => handleRemove(uid);

    const editBtn = document.createElement('button');
    editBtn.textContent = "Edit";
    editBtn.onclick = () => enterEditMode(uid, tag.name);

    btnWrap.appendChild(removeBtn);
    btnWrap.appendChild(editBtn);

    li.appendChild(text);
    li.appendChild(btnWrap);

    return li;
}

function renderTags(tags) {
    const list = document.getElementById('card-list');
    clearList();

    Object.entries(tags).forEach(([uid, tag]) => {
        list.appendChild(createTagElement(uid, tag));
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
    const uid = document.getElementById('card-uid').value;
    const name = document.getElementById('card-name').value;

    if (!uid || !name) {
        showMessage("Fields cannot be empty", true);
        return;
    }

    const res = await createTag(uid, name);
    const data = await res.json();

    if (data.status === 'ok') {
        showMessage(`Tag '${uid}' added`);
        loadTags();
    } else {
        showMessage(data.message || "Error", true);
    }

    loadTags();
}

async function handleRemove(uid) {
    const res = await deleteTag(uid);
    const data = await res.json();

    if (data.status === "removed") {
        showMessage(`Tag '${uid}' removed`);
    } else {
        showMessage(data.message || "Error", true);
    }

    loadTags();
}

// edit
function enterEditMode(uid, currentName) {
    isEditing = true;
    const li = document.getElementById(`tag-${uid}`);
    li.innerHTML = '';

    const input = document.createElement('input');
    input.value = currentName;
    input.id = `edit-${uid}`;
    input.style.flex = "1";

    const saveBtn = document.createElement('button');
    saveBtn.textContent = "Save";
    saveBtn.onclick = () => handleSave(uid);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = "Cancel";
    cancelBtn.onclick = () => {
        isEditing = false; 
        loadTags();  
    };

    li.appendChild(input);
    li.appendChild(saveBtn);
    li.appendChild(cancelBtn);
}

async function handleSave(uid) {
    const input = document.getElementById(`edit-${uid}`);
    const newName = input.value;

    if (!newName.trim()) {
        showMessage("Name cannot be empty", true);
        return;
    }

    const res = await updateTag(uid, newName);
    const data = await res.json();

    if (data.status === "ok") {
        showMessage(`Tag '${uid}' updated`);
        loadTags();
    } else {
        showMessage(data.message || "Update failed", true);
    }

    loadTags();
}

setInterval(pollTags, 5000);

let isEditing = false;

function pollTags() {
    if(!isEditing) {
        loadTags();
    }
}

window.onload = loadTags;