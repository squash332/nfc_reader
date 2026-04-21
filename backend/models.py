from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class Tag(BaseModel):
    card_uid: str
    description: Optional[str]
    is_active: bool = False
    created_at: datetime = datetime.now()


class UpdateTag(BaseModel):
    description: str
    is_active : int

class Event(BaseModel):
    event_time: datetime
    event_type: str