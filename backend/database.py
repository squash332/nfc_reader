# tablice - users, events, kartice
import sqlite3


DB_FILE = "database.db"


def get_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """ CREATE TABLE IF NOT EXISTS users (
                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                   full_name TEXT NOT NULL,
                   position TEXT,
                   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                   is_active BOOLEAN DEFAULT 1
                   )
                   """
    )

    cursor.execute(
        """ CREATE TABLE IF NOT EXISTS cards (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    card_uid TEXT UNIQUE NOT NULL,
                    description TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                    )
                   """
    )

    cursor.execute(
        """ CREATE TABLE IF NOT EXISTS events (
                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                   user_id INTEGER,
                   card_id INTEGER,
                   event_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                   event_type TEXT CHECK(event_type IN ('in', 'out')),
                   FOREIGN KEY(user_id) REFERENCES users(id),
                   FOREIGN KEY(card_id) REFERENCES cards(id)
                   )
                    """
    )

    conn.commit()
    conn.close()