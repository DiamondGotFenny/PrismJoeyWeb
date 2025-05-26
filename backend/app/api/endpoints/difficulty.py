from fastapi import APIRouter, HTTPException
from typing import List
from app.models.difficulty import DifficultyLevel

router = APIRouter()

# Predefined difficulty levels based on section 2.1.2
difficulty_levels_data = [
    {
        "id": 1, "name": "10以内加减法", "code": "within_10", "max_number": 10,
        "allow_carry": False, "allow_borrow": False, "operation_types": ["addition", "subtraction"], "order": 1
    },
    {
        "id": 2, "name": "20以内不进/退位加减法", "code": "within_20_no_carry_borrow", "max_number": 20,
        "allow_carry": False, "allow_borrow": False, "operation_types": ["addition", "subtraction"], "order": 2
    },
    {
        "id": 3, "name": "20以内进/退位加减法", "code": "within_20_carry_borrow", "max_number": 20,
        "allow_carry": True, "allow_borrow": True, "operation_types": ["addition", "subtraction"], "order": 3
    },
    {
        "id": 4, "name": "100以内整十数加减法", "code": "within_100_tens", "max_number": 100,
        "allow_carry": False, 
        "allow_borrow": False, 
        "operation_types": ["addition", "subtraction"], "order": 4
    },
    {
        "id": 5, "name": "100以内两位数与一位数加减法 (不进/退位)", "code": "within_100_two_one_no_carry_borrow", "max_number": 100,
        "allow_carry": False, "allow_borrow": False, "operation_types": ["addition", "subtraction"], "order": 5
    },
    {
        "id": 6, "name": "100以内两位数与一位数加减法 (进/退位)", "code": "within_100_two_one_carry_borrow", "max_number": 100,
        "allow_carry": True, "allow_borrow": True, "operation_types": ["addition", "subtraction"], "order": 6
    }
]
difficulty_levels_objects = [DifficultyLevel(**data) for data in difficulty_levels_data]

@router.get("/levels", response_model=List[DifficultyLevel])
async def get_difficulty_levels():
    return difficulty_levels_objects

@router.get("/{level_id}", response_model=DifficultyLevel)
async def get_difficulty_level(level_id: int):
    for level in difficulty_levels_objects:
        if level.id == level_id:
            return level
    raise HTTPException(status_code=404, detail="Difficulty level not found")
