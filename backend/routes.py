from datetime import datetime, timedelta

from fastapi import APIRouter
from fastapi.responses import HTMLResponse
import os

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

    # unnasigned but active
    cursor.execute(
        """
        INSERT INTO cards (card_uid, description, is_active)
        VALUES (?, ?, 1)
    """,
        (
            data.card_uid,
            data.description,
        ),
    )

    conn.commit()
    conn.close()

    return {"status": "ok", "added_tag": data.card_uid}


@router.get("/tag")
def get_tags():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM cards")
    rows = cursor.fetchall()

    conn.close()

    return {
        "tags": [
            {
                "card_uid": r["card_uid"],
                "description": r["description"],
                "id": r["id"],
                "user_id": r["user_id"],
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

    # no user- you cant "name" it
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

    return {
        "status": "ok",
        "card_uid": uid,
        "description": data.description,
        "is_active": data.is_active,
    }


@router.get("/details/data")
def show_details(time_range: str, start_date: str = None, end_date: str = None):
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

    cursor.execute(
        """
        SELECT e.event_time, e.event_type, c.card_uid, c.description
        FROM events e
        JOIN cards c on e.card_id = c.id
        WHERE e.event_time >= ? AND e.event_time < ?
        ORDER BY e.event_time DESC
    """,
        (since, until),
    )
    event_rows = cursor.fetchall()

    return {"events": event_rows}
