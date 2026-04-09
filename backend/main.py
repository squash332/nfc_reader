from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class TextData(BaseModel):
    text: str

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.post("/")
async def receive_text(data: TextData):
    print(f"Received from ESP32S3: {data.text}")
    return {"status": "success", "received": data.text}