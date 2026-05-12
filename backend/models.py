from typing import Optional

from pydantic import BaseModel


class Tag(BaseModel):
    card_uid: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = False
    email: Optional[str] = None

class RedeemCode(BaseModel):
    code: str


class UpdateTag(BaseModel):
    description: Optional[str] = None
    is_active : int = 1
    email: Optional[str] = None

class ScanEvent(BaseModel):
    card_uid: str
    card_desc: Optional[str] = None

class CreateUser(BaseModel):
    full_name: str
    email: str
    position: Optional[str] = None

class UpdateUser(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    position: Optional[str] = None

class LoginData(BaseModel):
    email: str
    password: str

class RegisterData(BaseModel):
    email: str
    password: str
    role: str = 'user'
    user_id: Optional[int] = None

class UpdateAccount(BaseModel):
    password: Optional[str] = None
    role: Optional[str] = None