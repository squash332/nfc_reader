from datetime import datetime, timedelta

from fastapi import APIRouter
from fastapi.responses import HTMLResponse
import os
from typing import Optional

from database import get_connection
from models import Tag, UpdateTag

router = APIRouter()

static_directory = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "../frontend/static"
)


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


@router.post("/tag")
def receive_tag(data: Tag):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM cards WHERE card_uid = ?", (data.card_uid,))
    existing = cursor.fetchone()

    if existing:
        conn.close()
        return {"status": "duplicate"}

    user_id = None
    if data.full_name:
        cursor.execute(
            "SELECT id FROM users WHERE full_name = ? COLLATE NOCASE",
            (data.full_name.strip(),),
        )
        user_row = cursor.fetchone()        
        if not user_row:
            conn.close()
            return {"status": "user_not_found", "full_name": data.full_name} 
        user_id = user_row["id"]
    
    # unnasigned but active
    cursor.execute(
        """
        INSERT INTO cards (card_uid, description, user_id, is_active)
        VALUES (?, ?, ?, 1)
    """,
        (
            data.card_uid,
            data.description,
            user_id
        ),
    )

    conn.commit()
    conn.close()

    return {"status": "ok", "added_tag": data.card_uid}


@router.get("/tag")
def get_tags():
    conn = get_connection()
    cursor = conn.cursor()

    
    cursor.execute("""
        SELECT c.card_uid, c.description, c.id, c.user_id, c.is_active,
               (SELECT u.full_name FROM users u WHERE u.id = c.user_id) AS full_name
        FROM cards c
    """)

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
    existing = cursor.fetchone()

    if not existing:
        conn.close()
        return {"status": "not found"}

    # set tag to inactive instead of deleting
    cursor.execute(
        """
        DELETE FROM cards
        WHERE card_uid = ?
    """,
        (uid,),
    )

    conn.commit()
    conn.close()

    return {"status": "removed", "removed_tag": uid}


@router.put("/tag/{uid}")
def edit_tag(uid: str, data: UpdateTag):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM cards WHERE card_uid = ?", (uid,))
    card = cursor.fetchone()

    if not card:
        conn.close()
        return {"status": "not found"}

        # optionally re-assign user
    user_id = None
    if data.full_name:
        cursor.execute(
            "SELECT id FROM users WHERE full_name = ? COLLATE NOCASE",
            (data.full_name.strip(),),
        )
        user_row = cursor.fetchone()
        if not user_row:
            conn.close()
            return {"status": "user_not_found", "full_name": data.full_name}
        user_id = user_row["id"]
 
    if user_id is not None:
        cursor.execute(
            """
            UPDATE cards
            SET description = ?, is_active = ?, user_id = ?
            WHERE card_uid = ?
            """,
            (data.description, data.is_active, user_id, uid),
        )
    else:
        cursor.execute(
            """
            UPDATE cards
            SET description = ?, is_active = ?
            WHERE card_uid = ?
            """,
            (data.description, data.is_active, uid),
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
        SELECT e.event_time, e.event_type, c.card_uid, c.description, u.full_name
        FROM events e
        JOIN cards c on e.card_id = c.id
        JOIN users u on c.user_id = u.id
        WHERE e.event_time >= ? AND e.event_time < ?
    """
    params = [since, until]

    # optional filter
    if event_type in ("in", "out"):
        query += " AND e.event_type = ?"
        params.append(event_type)

    query += " ORDER BY e.event_time DESC"

    cursor.execute(query, params)
    event_rows = cursor.fetchall()

    return {"events": event_rows}

@router.get("/tag/{full_name}")
def get_user_tags(full_name: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
    SELECT cards.card_uid, cards.description, cards.id, cards.user_id, cards.is_active, users.full_name
    FROM cards
    JOIN users ON cards.user_id = users.id
    WHERE users.full_name LIKE ?
    """,
        (f"%{full_name}%",),
    )

    user_cards = cursor.fetchall()

    if not user_cards:
        conn.close()
        return {"error": "No cards found for the user."}
    conn.close()

    return {
        "tags": [
            {
                "card_uid": r["card_uid"],
                "description": r["description"],
                "id": r["id"],
                "full_name": r["full_name"],
                "user_id": r["user_id"],
                "is_active": r["is_active"],
            }
            for r in user_cards
        ]
    }

