from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime
from app.models.difficulty import DifficultyLevel # Assuming this is where DifficultyLevel is

class Question(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    session_id: UUID
    operands: List[int] # For columnar, these are the original numbers before blanks
    operations: List[str]
    question_string: str   # For columnar, e.g., "1? + ?3 = 25"
    correct_answer: Optional[int] = None # Will be None for columnar type
    difficulty_level_id: int
    question_type: str # "arithmetic" or "columnar"
    columnar_operands: Optional[List[List[Optional[int]]]] = None # e.g., [[1, None], [None, 3]]
    columnar_result_placeholders: Optional[List[Optional[int]]] = None # e.g., [2, 5]
    columnar_operation: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    user_answer: Optional[int] = None # For columnar, stores the integer of user's result row
    is_correct: Optional[bool] = None
    time_spent: Optional[float] = None
    answered_at: Optional[datetime] = None

class PracticeSession(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    user_id: Optional[str] = None # For future use, not strictly needed for MVP
    difficulty_level_id: int
    total_questions_planned: int = 10 # Default to 10 questions per session
    questions: List[Question] = []
    current_question_index: int = 0
    score: int = 0
    start_time: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    # To avoid loading all levels for each session, store only necessary info
    difficulty_level_details: Optional[DifficultyLevel] = None
