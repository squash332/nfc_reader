import re
import secrets
import string
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter
from fastapi.responses import HTMLResponse
import os
from typing import Optional

from fastapi import Response, Request

from fastapi import HTTPException
from auth import hash_pw, check_pw, make_token, read_token
from database import get_connection
from models import RedeemCode
from models import ScanEvent, Tag, UpdateTag, CreateUser, UpdateUser, LoginData, RegisterData, UpdateAccount

router = APIRouter()

static_directory = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "../frontend/static"
)


@router.get("/login", response_class=HTMLResponse)
async def login_page():
    path = os.path.join(static_directory, "../templates/login.html")
    with open(path) as f:
        return HTMLResponse(content=f.read())


@router.get("/register", response_class=HTMLResponse)
async def register_page():
    path = os.path.join(static_directory, "../templates/register.html")
    with open(path) as f:
        return HTMLResponse(content=f.read())


@router.post("/auth/login")
def auth_login(data: LoginData, response: Response):
    conn   = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM accounts WHERE email = ?", (data.email.strip(),))
    account = cursor.fetchone()
    conn.close()

    if not account or not check_pw(data.password, account["password_hash"]):
        return {"status": "invalid_credentials"}

    token = make_token(account["id"], account["role"], account["user_id"])
    response.set_cookie("token", token, httponly=True, samesite="lax", max_age=86400)
    return {"status": "ok", "role": account["role"], "user_id": account["user_id"]}


@router.post("/auth/logout")
def auth_logout(response: Response):
    response.delete_cookie("token")
    return {"status": "ok"}


@router.get("/auth/me")
def auth_me(request: Request):
    token = request.cookies.get("token")
    if not token:
        from fastapi import HTTPException
        raise HTTPException(status_code=401)
    try:
        payload = read_token(token)
    except Exception:
        from fastapi import HTTPException
        raise HTTPException(status_code=401)

    conn   = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT email, role, user_id FROM accounts WHERE id = ?", (int(payload["sub"]),))
    row = cursor.fetchone()
    conn.close()
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=401)
    return {"email": row["email"], "role": row["role"], "user_id": row["user_id"]}


@router.post("/auth/register")
def auth_register(data: RegisterData, request: Request):
    conn   = get_connection()
    cursor = conn.cursor()

    # First account becomes admin; subsequent ones require admin auth
    cursor.execute("SELECT COUNT(*) AS cnt FROM accounts")
    count = cursor.fetchone()["cnt"]

    if count > 0:
        token = request.cookies.get("token")
        if not token:
            conn.close()
            return {"status": "forbidden"}
        try:
            payload = read_token(token)
            if payload.get("role") != "admin":
                conn.close()
                return {"status": "forbidden"}
        except Exception:
            conn.close()
            return {"status": "forbidden"}

    cursor.execute("SELECT id FROM accounts WHERE email = ?", (data.email.strip(),))
    if cursor.fetchone():
        conn.close()
        return {"status": "duplicate"}

    if data.user_id:
        cursor.execute("SELECT id FROM accounts WHERE user_id = ?", (data.user_id,))
        if cursor.fetchone():
            conn.close()
            return {"status": "user_taken"}

    role = "admin" if count == 0 else data.role
    cursor.execute(
        "INSERT INTO accounts (user_id, email, password_hash, role) VALUES (?, ?, ?, ?)",
        (data.user_id, data.email.strip(), hash_pw(data.password), role),
    )
    conn.commit()
    conn.close()
    return {"status": "ok"}


@router.get("/auth/accounts")
def list_accounts():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.id, a.email, a.role, a.user_id, u.full_name
        FROM accounts a
        LEFT JOIN users u ON u.id = a.user_id
        ORDER BY a.role DESC, a.email COLLATE NOCASE
    """)
    rows = cursor.fetchall()
    conn.close()
    return {"accounts": [dict(r) for r in rows]}


@router.delete("/auth/accounts/{account_id}")
def delete_account(account_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT email, role, user_id FROM accounts WHERE id = ?", (account_id,))
    account = cursor.fetchone()
    if not account:
        conn.close()
        return {"status": "not_found"}
    if account["role"] == "admin":
        cursor.execute("SELECT COUNT(*) AS cnt FROM accounts WHERE role = 'admin'")
        if cursor.fetchone()["cnt"] <= 1:
            conn.close()
            return {"status": "last_admin"}
    if account["user_id"]:
        cursor.execute("UPDATE cards SET is_active = 0 WHERE user_id = ?", (account["user_id"],))
    cursor.execute("DELETE FROM accounts WHERE id = ?", (account_id,))
    conn.commit()
    conn.close()
    return {"status": "removed", "email": account["email"]}


@router.patch("/auth/accounts/{account_id}")
def update_account(account_id: int, data: UpdateAccount):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT role, user_id FROM accounts WHERE id = ?", (account_id,))
    account = cursor.fetchone()
    if not account:
        conn.close()
        return {"status": "not_found"}

    if data.password:
        cursor.execute("UPDATE accounts SET password_hash = ? WHERE id = ?",
                       (hash_pw(data.password), account_id))

    if data.role:
        if data.role == "user" and not account["user_id"]:
            conn.close()
            return {"status": "no_profile"}
        if data.role == "user" and account["role"] == "admin":
            cursor.execute("SELECT COUNT(*) AS cnt FROM accounts WHERE role = 'admin'")
            if cursor.fetchone()["cnt"] <= 1:
                conn.close()
                return {"status": "last_admin"}
        cursor.execute("UPDATE accounts SET role = ? WHERE id = ?", (data.role, account_id))

    conn.commit()
    conn.close()
    return {"status": "ok"}


@router.get("/", response_class=HTMLResponse)
async def root():
    index_file_path = os.path.join(static_directory, "../templates/index.html")
    with open(index_file_path, "r") as f:
        return HTMLResponse(content=f.read())


@router.get("/details", response_class=HTMLResponse)
async def details():
    details_file_path = os.path.join(static_directory, "../templates/details.html")
    with open(details_file_path, "r") as f:
        return HTMLResponse(content=f.read())


def _generate_uid():
    return secrets.token_hex(4).upper()

def _generate_code():
    chars = [c for c in string.ascii_uppercase + string.digits if c not in 'O0I1L']
    raw = ''.join(secrets.choice(chars) for _ in range(6))
    return f"{raw[:3]}-{raw[3:]}"

@router.post("/tag")
def receive_tag(data: Tag):
    conn = get_connection()
    cursor = conn.cursor()

    phone_flow = not data.card_uid
    card_uid   = data.card_uid or _generate_uid()

    if phone_flow and not data.email:
        conn.close()
        return {"status": "error", "message": "Email is required when auto-generating a card."}

    cursor.execute("SELECT * FROM cards WHERE card_uid = ?", (card_uid,))
    if cursor.fetchone():
        conn.close()
        return {"status": "duplicate"}

    user_id = None
    if data.email:
        cursor.execute("SELECT id FROM users WHERE email = ?", (data.email.strip(),))
        user_row = cursor.fetchone()
        if not user_row:
            conn.close()
            return {"status": "user_not_found", "email": data.email}
        user_id = user_row["id"]

    cursor.execute(
        "INSERT INTO cards (card_uid, description, user_id, is_active) VALUES (?, ?, ?, 0)",
        (card_uid, data.description, user_id),
    )
    card_id = cursor.lastrowid

    claim_code = None
    if phone_flow:
        claim_code = _generate_code()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=48)
        cursor.execute(
            "INSERT INTO claim_codes (card_id, code, expires_at) VALUES (?, ?, ?)",
            (card_id, claim_code, expires_at.strftime("%Y-%m-%d %H:%M:%S")),
        )

    conn.commit()
    conn.close()

    return {"status": "ok", "added_tag": card_uid, "claim_code": claim_code}


@router.post("/tag/redeem")
def redeem_code(data: RedeemCode):
    conn    = get_connection()
    cursor  = conn.cursor()

    cursor.execute("""
        SELECT cc.id, cc.used, cc.expires_at, c.card_uid
        FROM claim_codes cc
        JOIN cards c ON c.id = cc.card_id
        WHERE cc.code = ?
    """, (data.code.upper(),))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Code not found")

    if row["used"]:
        conn.close()
        raise HTTPException(status_code=410, detail="Code already used")

    expires_at = datetime.fromisoformat(row["expires_at"]).replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_at:
        conn.close()
        raise HTTPException(status_code=410, detail="Code expired")

    cursor.execute("UPDATE claim_codes SET used = 1 WHERE id = ?", (row["id"],))
    conn.commit()
    conn.close()

    return {"status": "ok", "card_uid": row["card_uid"]}


@router.get("/tag")
def get_tags():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT c.card_uid, c.description, c.id, c.user_id, c.is_active,
               u.full_name, u.email
        FROM cards c
        LEFT JOIN users u ON u.id = c.user_id
    """
    )

    rows = cursor.fetchall()
    conn.close()

    return {
        "tags": [
            {
                "card_uid": r["card_uid"],
                "description": r["description"],
                "id": r["id"],
                "user_id": r["user_id"],
                "full_name": r["full_name"],
                "email": r["email"],
                "is_active": r["is_active"],
            }
            for r in rows
        ]
    }


@router.delete("/tag/{uid}")
def remove_tag(uid: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM cards WHERE card_uid = ?", (uid,))
    card = cursor.fetchone()

    if not card:
        conn.close()
        return {"status": "not found"}

    cursor.execute("DELETE FROM events WHERE card_id = ?", (card["id"],))
    cursor.execute("DELETE FROM cards WHERE card_uid = ?", (uid,))

    conn.commit()
    conn.close()

    return {"status": "removed", "removed_tag": uid}


@router.put("/tag/{uid}")
def edit_tag(uid: str, data: UpdateTag):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM cards WHERE card_uid = ?", (uid,))
    if not cursor.fetchone():
        conn.close()
        return {"status": "not found"}

    user_id = None
    if data.email:
        cursor.execute("SELECT id FROM users WHERE email = ?", (data.email.strip(),))
        user_row = cursor.fetchone()
        if not user_row:
            conn.close()
            return {"status": "user_not_found", "email": data.email}
        user_id = user_row["id"]

    # always update user_id — None unassigns the card
    cursor.execute(
        """
        UPDATE cards
        SET description = ?, is_active = ?, user_id = ?
        WHERE card_uid = ?
        """,
        (data.description, data.is_active, user_id, uid),
    )

    conn.commit()
    conn.close()

    return {"status": "ok", "card_uid": uid}


@router.get("/details/data")
def show_details(
    time_range: str,
    start_date: str = None,
    end_date: str = None,
    event_type: Optional[str] = None,
    full_name: Optional[str] = None,
):
    conn = get_connection()
    cursor = conn.cursor()

    until = datetime.now()
    if time_range == "day":
        since = datetime.now() - timedelta(days=1)
    elif time_range == "week":
        since = datetime.now() - timedelta(days=7)
    elif time_range == "month":
        since = datetime.now() - timedelta(days=30)
    elif time_range == "custom":
        if not start_date or not end_date:
            return {
                "error": "Both start_date and end_date must be provided for custom range."
            }
        try:
            since = datetime.strptime(start_date, "%Y-%m-%d %H:%M")
            until = datetime.strptime(end_date, "%Y-%m-%d %H:%M") + timedelta(
                days=1
            )  # end date included
        except ValueError:
            return {"error": "Invalid date format. Please use YYYY-MM-DD HH:MM."}
    else:
        return {"error": "invalid range"}

    # base query
    query = """
        SELECT e.event_time, e.event_type, c.card_uid, c.description, e.user_id,
               u.full_name, u.email
        FROM events e
        JOIN cards c ON e.card_id = c.id
        LEFT JOIN users u ON u.id = e.user_id
        WHERE e.event_time >= ? AND e.event_time < ?
    """
    params = [since, until]

    # optional filter
    if event_type in ("in", "out", "rejected"):
        query += " AND e.event_type = ?"
        params.append(event_type)

    if full_name:
        query += " AND u.full_name LIKE ?"
        params.append(f"%{full_name}%")


    query += " ORDER BY e.event_time DESC"

    cursor.execute(query, params)
    event_rows = cursor.fetchall()

    return {"events": [dict(r) for r in event_rows]}


@router.get("/tag/{full_name}")
def get_user_tags(full_name: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, full_name FROM users WHERE full_name LIKE ?",
        (f"%{full_name}%",),
    )
    users = cursor.fetchall()

    if not users:
        conn.close()
        return {"error": "No user found."}

    tags = []
    for user in users:
        cursor.execute("SELECT * FROM cards WHERE user_id = ?", (user["id"],))
        for r in cursor.fetchall():
            tags.append({
                "card_uid": r["card_uid"],
                "description": r["description"],
                "id": r["id"],
                "full_name": user["full_name"],
                "user_id": r["user_id"],
                "is_active": r["is_active"],
            })

    conn.close()
    return {"tags": tags}


@router.get("/users", response_class=HTMLResponse)
async def users_page():
    path = os.path.join(static_directory, "../templates/users.html")
    with open(path, "r") as f:
        return HTMLResponse(content=f.read())


@router.get("/user/{user_id}", response_class=HTMLResponse)
async def user_detail_page(user_id: int):
    path = os.path.join(static_directory, "../templates/user_detail.html")
    with open(path, "r") as f:
        return HTMLResponse(content=f.read())


@router.get("/user/{user_id}/info")
def get_user_info(user_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT u.id, u.full_name, u.email, u.position, u.created_at,
               COUNT(c.id) AS card_count
        FROM users u
        LEFT JOIN cards c ON c.user_id = u.id
        WHERE u.id = ? AND u.deleted_at IS NULL
        GROUP BY u.id
        """,
        (user_id,),
    )
    user = cursor.fetchone()
    conn.close()
    if not user:
        return {"status": "not_found"}
    return {"user": dict(user)}


@router.get("/user/{user_id}/events")
def get_user_events(user_id: int, month: str = None, week: str = None):
    if week:
        m = re.match(r'^(\d{4})-W(\d{1,2})$', week)
        if not m:
            return {"error": "Invalid week format. Use YYYY-WNN."}
        year, wnum = int(m.group(1)), int(m.group(2))
        jan4 = datetime(year, 1, 4)
        jan4_dow = jan4.isoweekday()
        monday = jan4 - timedelta(days=jan4_dow - 1) + timedelta(weeks=wnum - 1)
        since = monday
        until = monday + timedelta(days=7)
    elif month:
        try:
            year, mon = map(int, month.split("-"))
            since = datetime(year, mon, 1)
            until = datetime(year + 1, 1, 1) if mon == 12 else datetime(year, mon + 1, 1)
        except (ValueError, AttributeError):
            return {"error": "Invalid month format. Use YYYY-MM."}
    else:
        return {"error": "Either month or week parameter is required."}
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT e.event_time, e.event_type, c.card_uid, c.description
        FROM events e
        JOIN cards c ON e.card_id = c.id
        WHERE c.user_id = ? AND e.event_time >= ? AND e.event_time < ?
        ORDER BY e.event_time ASC
        """,
        (user_id, since, until),
    )
    rows = cursor.fetchall()
    conn.close()
    return {"events": [dict(r) for r in rows]}


@router.get("/present")
def get_present_users():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.id, u.full_name, u.email, u.position,
               (SELECT e.event_time FROM events e
                WHERE e.user_id = u.id AND e.event_type != 'rejected'
                ORDER BY e.event_time DESC LIMIT 1) as entered_at
        FROM users u
        WHERE u.deleted_at IS NULL
          AND (SELECT e.event_type FROM events e
               WHERE e.user_id = u.id AND e.event_type != 'rejected'
               ORDER BY e.event_time DESC LIMIT 1) = 'in'
        ORDER BY entered_at ASC
    """)
    rows = cursor.fetchall()
    conn.close()
    return {"users": [dict(r) for r in rows]}


@router.get("/user/{user_id}/stats")
def get_user_stats(user_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    now = datetime.now()
    month_start = datetime(now.year, now.month, 1)

    cursor.execute(
        """
        SELECT e.event_time, e.event_type
        FROM events e
        JOIN cards c ON e.card_id = c.id
        WHERE c.user_id = ? AND e.event_time >= ? AND e.event_type != 'rejected'
        ORDER BY e.event_time ASC
        """,
        (user_id, month_start),
    )
    events = cursor.fetchall()

    by_date = {}
    for e in events:
        date, etype = e["event_time"][:10], e["event_type"]
        if date not in by_date:
            by_date[date] = {}
        if etype == "in" and "in" not in by_date[date]:
            by_date[date]["in"] = e["event_time"][11:16]
        if etype == "out":
            by_date[date]["out"] = e["event_time"][11:16]

    days_present = sum(1 for d in by_date.values() if "in" in d)

    durations = []
    for d in by_date.values():
        if "in" in d and "out" in d:
            ih, im = map(int, d["in"].split(":"))
            oh, om = map(int, d["out"].split(":"))
            dur = (oh * 60 + om) - (ih * 60 + im)
            if dur > 0:
                durations.append(dur)

    avg_minutes   = round(sum(durations) / len(durations)) if durations else None
    total_minutes = sum(durations)

    cursor.execute(
        """
        SELECT e.event_time FROM events e
        JOIN cards c ON e.card_id = c.id
        WHERE c.user_id = ? AND e.event_type = 'in'
        ORDER BY e.event_time DESC LIMIT 1
        """,
        (user_id,),
    )
    last_row = cursor.fetchone()
    conn.close()

    return {
        "days_present": days_present,
        "avg_minutes": avg_minutes,
        "total_minutes": total_minutes,
        "last_seen": last_row["event_time"] if last_row else None,
    }


@router.get("/user/{user_id}/cards")
def get_user_cards_list(user_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT card_uid, description, is_active
        FROM cards WHERE user_id = ?
        ORDER BY is_active DESC, created_at ASC
        """,
        (user_id,),
    )
    rows = cursor.fetchall()
    conn.close()
    return {"cards": [dict(r) for r in rows]}


@router.get("/user")
def get_users():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT u.id, u.full_name, u.email, u.position, u.created_at,
               COUNT(c.id) AS card_count
        FROM users u
        LEFT JOIN cards c ON c.user_id = u.id
        WHERE u.deleted_at IS NULL
        GROUP BY u.id
        ORDER BY u.full_name COLLATE NOCASE
        """
    )
    rows = cursor.fetchall()
    conn.close()
    return {"users": [dict(r) for r in rows]}


@router.post("/user")
def create_user(data: CreateUser):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = ?", (data.email.strip(),))
    if cursor.fetchone():
        conn.close()
        return {"status": "duplicate", "email": data.email}
    cursor.execute(
        "INSERT INTO users (full_name, email, position) VALUES (?, ?, ?)",
        (data.full_name.strip(), data.email.strip(), data.position),
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()
    return {"status": "ok", "id": user_id}


@router.put("/user/{user_id}")
def update_user(user_id: int, data: UpdateUser):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
    if not cursor.fetchone():
        conn.close()
        return {"status": "not_found"}
    if data.email:
        cursor.execute(
            "SELECT id FROM users WHERE email = ? AND id != ?",
            (data.email.strip(), user_id),
        )
        if cursor.fetchone():
            conn.close()
            return {"status": "duplicate", "email": data.email}
    cursor.execute(
        """
        UPDATE users
        SET full_name = COALESCE(?, full_name),
            email     = COALESCE(?, email),
            position  = ?
        WHERE id = ?
        """,
        (
            data.full_name.strip() if data.full_name else None,
            data.email.strip() if data.email else None,
            data.position,
            user_id,
        ),
    )
    conn.commit()
    conn.close()
    return {"status": "ok", "id": user_id}


@router.delete("/user/{user_id}")
def delete_user(user_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, full_name FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return {"status": "not_found"}
    cursor.execute("UPDATE cards SET user_id = NULL, is_active = 0 WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM accounts WHERE user_id = ?", (user_id,))
    cursor.execute("UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"status": "removed", "full_name": user["full_name"]}


@router.post("/event")
def scan_event(data: ScanEvent):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM cards WHERE card_uid = ?", (data.card_uid,))
    card = cursor.fetchone()

    # card not in DB — register it as inactive/unassigned
    if not card:
        cursor.execute(
            "INSERT INTO cards (card_uid, is_active) VALUES (?, 0)",
            (data.card_uid,),
        )
        conn.commit()
        conn.close()
        return {"status": "registered"}

    # card exists but inactive or no user — rejected
    if not card["is_active"] or not card["user_id"]:
        cursor.execute(
            "INSERT INTO events (card_id, user_id, event_type) VALUES (?, ?, 'rejected')",
            (card["id"], card["user_id"]),
        )
        conn.commit()
        conn.close()
        return {"status": "rejected"}

    # card active and assigned — determine in/out from last event
    cursor.execute(
        "SELECT event_type FROM events WHERE card_id = ? ORDER BY event_time DESC LIMIT 1",
        (card["id"],),
    )
    last = cursor.fetchone()
    event_type = "out" if last and last["event_type"] == "in" else "in"

    cursor.execute(
        "INSERT INTO events (card_id, user_id, event_type) VALUES (?, ?, ?)",
        (card["id"], card["user_id"], event_type),
    )
    conn.commit()
    conn.close()

    return {"status": "granted", "event_type": event_type}
