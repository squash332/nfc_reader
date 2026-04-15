from typing import Optional
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import json
import os

app = FastAPI()
frontend_directory = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../frontend")

app.mount("/static", StaticFiles(directory=frontend_directory), name="static")

TAG_FILE = "tags.json"
class Tag(BaseModel):
    uid: str
    name: Optional[str] = ""

class UpdateTag(BaseModel):
    name:str

if not os.path.exists(TAG_FILE):
    with open(TAG_FILE, "w") as f:
        json.dump({"tags": {}}, f)

def read_tags():
    with open(TAG_FILE, "r") as f:
        data = json.load(f)
    return data["tags"]

def write_tags(tags):
    with open(TAG_FILE, "w") as f:
        json.dump({"tags": tags, }, f)

@app.get("/", response_class=HTMLResponse)
async def root():
    index_file_path = os.path.join(frontend_directory, "index.html")
    with open(index_file_path, "r") as f:
        return HTMLResponse(content=f.read())

@app.post("/tag")
def receive_tag(data: Tag):
    tags = read_tags()

    if data.uid in tags:
        return {"status": "duplicate"}

    tags[data.uid] = {
        "name": data.name
    }
    write_tags(tags)  
    return {"status": "ok", "added_tag": data.uid}

@app.get("/tag")
def get_tags():
    tags = read_tags()
    return {"tags": tags}

@app.delete("/tag/{uid}")
def remove_tag(uid: str):
    tags = read_tags()

    if uid not in tags:
        return {"status": "not found"}

    tags.pop(uid)
    write_tags(tags)

    return {"status": "removed", "removed_tag": uid}

@app.put("/tag/{uid}")
def edit_tag(uid: str, data: UpdateTag):
    tags = read_tags()

    if uid not in tags:
        return {"status": "not found"}

    tags[uid]["name"] = data.name

    write_tags(tags)

    return {
        "status": "ok",
        "uid": uid,
        "new_name": data.name
    }


