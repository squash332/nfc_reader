from typing import Optional

from pydantic import BaseModel


class Tag(BaseModel):
    card_uid: str
    description: Optional[str] = None # esp will only send uid, not description
    is_active: bool = False
    full_name: Optional[str] = None


class UpdateTag(BaseModel):
    description: Optional[str] = None
    is_active : int = 1
    full_name: Optional[str] = None

class ScanEvent(BaseModel):
    card_uid: str