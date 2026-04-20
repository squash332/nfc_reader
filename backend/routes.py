from fastapi import APIRouter
from fastapi.responses import HTMLResponse
import os

from database import get_connection
from models import Tag, UpdateTag

router = APIRouter()

frontend_directory = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "../frontend"
)

@router.get("/", response_class=HTMLResponse)
async def root():
    index_file_path = os.path.join(frontend_directory, "index.html")
    with open(index_file_path, "r") as f:
        return HTMLResponse(content=f.read())
    
@router.post("/tag")
def receive_tag(data: Tag):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM cards WHERE card_uid = ?", (data.uid,))
    existing = cursor.fetchone()

    if existing:
        conn.close()
        return {"status": "duplicate"}

    # unnasigned but active
    cursor.execute("""
        INSERT INTO cards (card_uid, is_active)
        VALUES (?, 1)
    """, (data.uid,))

    conn.commit()
    conn.close()

    return {"status": "ok", "added_tag": data.uid}

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
                "uid": r["card_uid"],
                "id": r["id"],
                "user_id": r["user_id"],
                "active": r["is_active"]
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
    cursor.execute("""
        UPDATE cards
        SET is_active = 0
        WHERE card_uid = ?
    """, (uid,))

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
    if not card["user_id"]:
        conn.close()
        return {"status": "card not assigned to user"}

    cursor.execute("""
        UPDATE users
        SET full_name = ?
        WHERE id = ?
    """, (data.name, card["user_id"]))

    conn.commit()
    conn.close()

    return {
        "status": "ok",
        "uid": uid,
        "new_name": data.name
    }