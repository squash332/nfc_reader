from typing import Optional

from pydantic import BaseModel


class Tag(BaseModel):
    card_uid: str
    description: Optional[str] = ""

class UpdateTag(BaseModel):
    description: str
    is_active : int