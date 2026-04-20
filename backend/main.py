from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from database import init_db
from routes import router, frontend_directory

app = FastAPI()


app.mount("/static", StaticFiles(directory=frontend_directory), name="static")
app.include_router(router)

init_db()