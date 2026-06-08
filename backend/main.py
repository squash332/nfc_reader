import os
from pathlib import Path

import jwt as pyjwt
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi import Request
from fastapi.responses import RedirectResponse, JSONResponse

_env = Path(__file__).parent.parent / ".env"
if _env.exists():
    for _line in _env.read_text().splitlines():
        if "=" in _line and not _line.startswith("#"):
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

API_KEY = os.getenv("API_KEY", "")

from auth import read_token
from database import init_db, get_connection
from routes import router, static_directory

app = FastAPI()

EXEMPT       = {"/login", "/auth/login", "/auth/logout", "/event", "/tag/redeem", "/camera/frame"}
SETUP_PATHS  = {"/register", "/auth/register"}


class AuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive)
        path = request.url.path

        if path.startswith("/static") or path in EXEMPT:
            await self.app(scope, receive, send)
            return

        if request.method == "GET" and path.startswith("/tag/"):
            await self.app(scope, receive, send)
            return

        if API_KEY and request.headers.get("X-API-Key") == API_KEY:
            await self.app(scope, receive, send)
            return

        if path in SETUP_PATHS:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) AS cnt FROM accounts")
            count = cursor.fetchone()["cnt"]
            conn.close()
            if count == 0:
                await self.app(scope, receive, send)
                return

        token = request.cookies.get("token")
        if not token:
            accept = request.headers.get("accept", "")
            if "text/html" in accept:
                response = RedirectResponse("/login", status_code=302)
            else:
                response = JSONResponse({"error": "unauthorized"}, status_code=401)
            await response(scope, receive, send)
            return

        try:
            payload = read_token(token)
        except pyjwt.ExpiredSignatureError:
            r = RedirectResponse("/login", status_code=302)
            r.delete_cookie("token")
            await r(scope, receive, send)
            return
        except Exception:
            response = RedirectResponse("/login", status_code=302)
            await response(scope, receive, send)
            return

        scope["state"] = scope.get("state", {})
        scope["state"]["user"] = payload

        if payload.get("role") == "user":
            uid = payload.get("user_id")
            if not uid:
                response = RedirectResponse("/login", status_code=302)
                await response(scope, receive, send)
                return
            allowed = path == f"/user/{uid}" or path.startswith(f"/user/{uid}/") or path == "/auth/me"
            if not allowed:
                accept = request.headers.get("accept", "")
                if "text/html" in accept:
                    response = RedirectResponse(f"/user/{uid}", status_code=302)
                else:
                    response = JSONResponse({"error": "forbidden"}, status_code=403)
                await response(scope, receive, send)
                return

        await self.app(scope, receive, send)


app.add_middleware(AuthMiddleware)
app.mount("/static", StaticFiles(directory=static_directory), name="static")
app.include_router(router)

init_db()
