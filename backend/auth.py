import jwt
import bcrypt
from datetime import datetime, timedelta, timezone

SECRET = "sentinel-secret-key-change-in-production"
ALGO   = "HS256"
EXPIRE = 24  # hours


def hash_pw(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def check_pw(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def make_token(account_id: int, role: str, user_id) -> str:
    payload = {
        "sub":     str(account_id),
        "role":    role,
        "user_id": user_id,
        "exp":     datetime.now(tz=timezone.utc) + timedelta(hours=EXPIRE),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGO)


def read_token(token: str) -> dict:
    return jwt.decode(token, SECRET, algorithms=[ALGO])
