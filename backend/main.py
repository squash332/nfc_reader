import os

import jwt as pyjwt
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import RedirectResponse, JSONResponse

from auth import read_token
from database import init_db, get_connection
from routes import router, static_directory

app = FastAPI()

EXEMPT       = {"/login", "/auth/login", "/auth/logout", "/event"}
SETUP_PATHS  = {"/register", "/auth/register"}


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        path = request.url.path

        if path.startswith("/static") or path in EXEMPT:
            return await call_next(request)

        # /register is public only before any account exists (first-run setup)
        if path in SETUP_PATHS:
            conn    = get_connection()
            cursor  = conn.cursor()
            cursor.execute("SELECT COUNT(*) AS cnt FROM accounts")
            count   = cursor.fetchone()["cnt"]
            conn.close()
            if count == 0:
                return await call_next(request)

        token = request.cookies.get("token")
        if not token:
            accept = request.headers.get("accept", "")
            if "text/html" in accept:
                return RedirectResponse("/login", status_code=302)
            return JSONResponse({"error": "unauthorized"}, status_code=401)

        try:
            payload = read_token(token)
        except pyjwt.ExpiredSignatureError:
            r = RedirectResponse("/login", status_code=302)
            r.delete_cookie("token")
            return r
        except Exception:
            return RedirectResponse("/login", status_code=302)

        request.state.user = payload

        # User role: restrict to their own user pages only
        if payload.get("role") == "user":
            uid = payload.get("user_id")
            if not uid:
                return RedirectResponse("/login", status_code=302)
            allowed = path == f"/user/{uid}" or path.startswith(f"/user/{uid}/") or path == "/auth/me"
            if not allowed:
                accept = request.headers.get("accept", "")
                if "text/html" in accept:
                    return RedirectResponse(f"/user/{uid}", status_code=302)
                return JSONResponse({"error": "forbidden"}, status_code=403)

        return await call_next(request)


app.add_middleware(AuthMiddleware)
app.mount("/static", StaticFiles(directory=static_directory), name="static")
app.include_router(router)

init_db()
