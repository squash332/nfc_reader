# tablice - users, events, kartice
import sqlite3


DB_FILE = "database.db"


def get_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """ CREATE TABLE IF NOT EXISTS users (
                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                   full_name TEXT NOT NULL,
                   email TEXT UNIQUE,
                   position TEXT,
                   created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                   )
                   """
    )

    cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'")
    users_schema = cursor.fetchone()
    if users_schema and 'email' not in users_schema[0]:
        cursor.execute("ALTER TABLE users ADD COLUMN email TEXT")
        cursor.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL"
        )

    # card default inactive == 0 until admin changes it
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        card_uid TEXT UNIQUE NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT 0, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        card_id INTEGER,
        event_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        event_type TEXT CHECK(event_type IN ('in', 'out', 'rejected')),
        FOREIGN KEY(card_id) REFERENCES cards(id)
    )
    """)

    # migrate existing events table if it lacks 'rejected' in the check constraint
    cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='events'")
    row = cursor.fetchone()
    if row and 'rejected' not in row[0]:
        cursor.executescript("""
            CREATE TABLE events_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                card_id INTEGER,
                event_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                event_type TEXT CHECK(event_type IN ('in', 'out', 'rejected')),
                FOREIGN KEY(card_id) REFERENCES cards(id)
            );
            INSERT INTO events_new SELECT * FROM events;
            DROP TABLE events;
            ALTER TABLE events_new RENAME TO events;
        """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS accounts (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
            email         TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role          TEXT NOT NULL DEFAULT 'user'
                          CHECK(role IN ('admin', 'user')),
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='accounts'")
    accounts_schema = cursor.fetchone()
    if accounts_schema and 'SET NULL' in accounts_schema[0]:
        cursor.executescript("""
            CREATE TABLE accounts_new (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
                email         TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role          TEXT NOT NULL DEFAULT 'user'
                              CHECK(role IN ('admin', 'user')),
                created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            INSERT INTO accounts_new SELECT * FROM accounts;
            DROP TABLE accounts;
            ALTER TABLE accounts_new RENAME TO accounts;
        """)

    cursor.executescript("""
        CREATE INDEX IF NOT EXISTS idx_events_card_id    ON events(card_id);
        CREATE INDEX IF NOT EXISTS idx_events_event_time ON events(event_time);
        CREATE INDEX IF NOT EXISTS idx_cards_user_id     ON cards(user_id);
    """)

    conn.commit()
    conn.close()