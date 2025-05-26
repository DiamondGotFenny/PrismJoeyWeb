from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime
from app.models.difficulty import DifficultyLevel # Assuming this is where DifficultyLevel is

class Question(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    session_id: UUID
    operand1: int
    operand2: int
    operation: str  # "+" or "-"
    correct_answer: int
    difficulty_level_id: int # Storing the ID of the difficulty level
    created_at: datetime = Field(default_factory=datetime.utcnow)
    user_answer: Optional[int] = None
    is_correct: Optional[bool] = None
    time_spent: Optional[float] = None # Seconds
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
