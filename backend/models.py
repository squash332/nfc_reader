from typing import Optional

from pydantic import BaseModel


class Tag(BaseModel):
    uid: str
    name: Optional[str] = ""

class UpdateTag(BaseModel):
    name: str