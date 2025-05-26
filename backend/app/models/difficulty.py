from pydantic import BaseModel
from typing import List

class DifficultyLevel(BaseModel):
    id: int
    name: str
    code: str
    max_number: int
    allow_carry: bool
    allow_borrow: bool
    operation_types: List[str]
    order: int
