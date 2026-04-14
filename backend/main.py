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
class TextData(BaseModel):
    text: str

if not os.path.exists(TAG_FILE):
    with open(TAG_FILE, "w") as f:
        json.dump({"tags": []}, f)

def read_tags():
    with open(TAG_FILE, "r") as f:
        data = json.load(f)
    return data["tags"]

def write_tags(tags):
    with open(TAG_FILE, "w") as f:
        json.dump({"tags": tags}, f)

@app.get("/", response_class=HTMLResponse)
async def root():
    index_file_path = os.path.join(frontend_directory, "index.html")
    with open(index_file_path, "r") as f:
        return HTMLResponse(content=f.read())

@app.post("/")
async def receive_text(data: TextData):
    print(f"Received from ESP32S3: {data.text}")
    return {"status": "success", "received": data.text}

@app.post("/tag")
def receive_tag(data: TextData):
    tags = read_tags()

    if data.text in tags:
        return {"status": "duplicate", "message": f"Tag '{data.text}' already exists."}
    
    tags.append(data.text) 
    write_tags(tags)  
    return {"status": "ok", "added_tag": data.text}

@app.get("/tag")
def get_tags():
    tags = read_tags()
    return {"tags": tags}

@app.delete("/tag/{tag}")
def remove_tag(tag: str):
    tags = read_tags()
    if tag in tags:
        tags.remove(tag)
        write_tags(tags) 
        return {"status": "removed", "removed_tag": tag}
    else:
        return {"status": "not found", "message": "Tag not found"}