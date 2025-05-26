from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict
from uuid import UUID, uuid4
from datetime import datetime
from app.models.practice import PracticeSession, Question
from app.models.difficulty import DifficultyLevel
from app.api.endpoints.difficulty import difficulty_levels_objects # To get difficulty details
import random

router = APIRouter()

# In-memory storage for active sessions (replace with DB for non-MVP)
active_sessions: Dict[UUID, PracticeSession] = {}

# Helper function to get difficulty detail (avoid circular import if this was in difficulty.py)
def get_difficulty_detail_by_id(level_id: int) -> Optional[DifficultyLevel]:
    return next((level for level in difficulty_levels_objects if level.id == level_id), None)

@router.post("/start", response_model=PracticeSession)
async def start_practice_session(difficulty_level_id: int = Body(..., embed=True), total_questions: int = Body(10, embed=True)):
    difficulty_detail = get_difficulty_detail_by_id(difficulty_level_id)
    if not difficulty_detail:
        raise HTTPException(status_code=404, detail="Difficulty level not found")

    session = PracticeSession(
        difficulty_level_id=difficulty_level_id,
        total_questions_planned=total_questions,
        difficulty_level_details=difficulty_detail
    )
    active_sessions[session.id] = session
    return session

def generate_question_for_session(session: PracticeSession) -> Question:
    level = session.difficulty_level_details
    if not level:
        raise HTTPException(status_code=500, detail="Difficulty details missing in session")

    op_type = random.choice(level.operation_types)
    operand1, operand2 = 0, 0
    answer = -1 

    # Specific logic for "100以内整十数加减法"
    if level.code == "within_100_tens":
        operand1 = random.randint(1, (level.max_number // 10) -1 ) * 10 
        if op_type == "addition":
            max_operand2_tens = (level.max_number - operand1) // 10
            # Ensure max_operand2_tens is at least 1 to avoid random.randint error if it's 0 or negative
            operand2 = random.randint(1, max_operand2_tens if max_operand2_tens > 0 else 1) * 10
            answer = operand1 + operand2
        else: # subtraction
            # Ensure operand1 >= operand2 and result is multiple of 10
            max_operand2_tens = operand1 // 10
            operand2 = random.randint(1, max_operand2_tens if max_operand2_tens > 0 else 1) * 10
            answer = operand1 - operand2
            if operand1 == operand2: # Avoid X0 - X0 = 0, ensure a non-zero operand if possible or handle 0 result
                 # Regenerate if we want to avoid 0 result, or accept it. For now, accept.
                 pass


    else: # General logic for other levels
        is_two_one_digit_level = "within_100_two_one" in level.code

        # Loop to ensure conditions (like no carry/borrow, ranges) are met
        attempts = 0
        max_attempts = 100 # Prevent infinite loops

        while attempts < max_attempts:
            attempts += 1
            valid_question = True # Assume valid until a condition fails

            if is_two_one_digit_level:
                operand1 = random.randint(10, 99)
                operand2 = random.randint(0, 9) # Allow 0 for addition, ensure >0 for subtraction if needed
            elif level.max_number == 100: # Generic 100以内 (not two_one_digit or tens)
                 # This case needs more specific rules if we have other 100-based levels.
                 # For now, assuming it might be like two_one_digit or a mix.
                 # Let's make it more general for now, allowing broader ranges.
                operand1 = random.randint(0, level.max_number)
                operand2 = random.randint(0, level.max_number)
            else: # within_10, within_20
                operand1 = random.randint(0, level.max_number)
                operand2 = random.randint(0, level.max_number)


            if op_type == "addition":
                current_sum = operand1 + operand2
                if current_sum > level.max_number:
                    valid_question = False; continue
                
                if not level.allow_carry:
                    if is_two_one_digit_level: # 2-digit + 1-digit
                        if (operand1 % 10) + operand2 >= 10: # Unit digit carry
                            valid_question = False; continue
                        # Tens digit carry is not possible with 2-digit + 1-digit if unit doesn't carry and sum <= 100
                    else: # single digit focus for < 100 levels, or general non-carry
                        if (operand1 % 10) + (operand2 % 10) >= 10: # Unit digit carry
                             valid_question = False; continue
                        if level.max_number > 10: # Check tens carry if applicable
                            if (operand1 // 10 % 10) + (operand2 // 10 % 10) >= 10:
                                valid_question = False; continue
                answer = current_sum

            else:  # Subtraction
                # Ensure op1 >= op2 for simplicity and non-negative result
                if operand1 < operand2:
                    operand1, operand2 = operand2, operand1
                
                # Avoid 0-0 for subtraction if desired (e.g. for within_10, it's common to have 0 as operand)
                if operand1 == 0 and operand2 == 0 and level.max_number > 0 : # if level allows 0, but we want to avoid 0-0
                    # if level.code == "within_10": # allow 0-0 for this level
                    #    pass
                    # else:
                    valid_question = False; continue


                if is_two_one_digit_level and operand2 == 0 and operand1 == 0 : # Avoid 0-0 for this specific case if not desired.
                    valid_question = False; continue


                current_diff = operand1 - operand2
                # Basic check, should be handled by op1 >= op2 swap mostly
                if current_diff < 0:
                    valid_question = False; continue 

                if not level.allow_borrow:
                    if is_two_one_digit_level: # 2-digit - 1-digit
                        if (operand1 % 10) < operand2: # Unit digit borrow
                            valid_question = False; continue
                        # Tens digit borrow not applicable if unit doesn't borrow and op1 is 2-digit, op2 is 1-digit
                    else: # General non-borrow
                        if (operand1 % 10) < (operand2 % 10): # Unit digit borrow
                            valid_question = False; continue
                        if level.max_number > 10 and operand1 > 9 and operand2 > 9: # Check tens borrow if applicable (both operands > 9)
                             if (operand1 // 10 % 10) < (operand2 // 10 % 10):
                                 valid_question = False; continue
                answer = current_diff
            
            if valid_question:
                break # Found a valid question
        
        if not valid_question and attempts >= max_attempts:
            # Fallback or raise error if too many attempts fail
            # This indicates an issue in logic or overly restrictive conditions
            # For now, let's try to generate a "safe" question if possible, or raise error
            # This part needs robust handling. For MVP, we might accept a slight deviation or error.
            # Simplistic fallback:
            if op_type == "addition":
                operand1 = random.randint(0, level.max_number // 2)
                operand2 = random.randint(0, level.max_number // 2)
                answer = operand1 + operand2
            else:
                operand1 = random.randint(level.max_number // 2, level.max_number)
                operand2 = random.randint(0, level.max_number // 2)
                answer = operand1 - operand2
            # This fallback might not respect allow_carry/borrow, so it's not ideal.
            # Better to ensure the loop logic is correct.
            # raise HTTPException(status_code=500, detail="Failed to generate question after multiple attempts")


    # Prevent immediate repetition (basic check)
    if len(session.questions) > 0:
        last_few = session.questions[-min(3, len(session.questions)):] 
        for prev_q in last_few:
            if prev_q.operand1 == operand1 and prev_q.operand2 == operand2 and prev_q.operation == op_type:
                # If repetition found, try generating one more time (simple recursion, careful with depth)
                # Add a flag to prevent deep recursion if this happens too often
                if not hasattr(generate_question_for_session, "recursion_depth"):
                    generate_question_for_session.recursion_depth = 0
                
                if generate_question_for_session.recursion_depth < 2: # Limit recursion
                    generate_question_for_session.recursion_depth += 1
                    new_q = generate_question_for_session(session)
                    generate_question_for_session.recursion_depth = 0 # Reset after successful generation
                    return new_q
                else: # Reset and just return the current potentially repeated question
                    generate_question_for_session.recursion_depth = 0


    return Question(
        session_id=session.id,
        operand1=operand1,
        operand2=operand2,
        operation=op_type,
        correct_answer=answer,
        difficulty_level_id=level.id
    )

@router.get("/question", response_model=Question)
async def get_next_question(session_id: UUID):
    session = active_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Practice session not found")
    if session.end_time:
        raise HTTPException(status_code=400, detail="Session has already ended")
    
    # If all planned questions are generated and answered, no new questions.
    answered_questions_count = sum(1 for q in session.questions if q.user_answer is not None)
    if len(session.questions) == session.total_questions_planned and answered_questions_count == session.total_questions_planned:
         raise HTTPException(status_code=400, detail="All planned questions have been answered.")

    # If current_question_index points to an existing non-answered question, return it
    if session.current_question_index < len(session.questions) and \
       session.questions[session.current_question_index].user_answer is None:
        return session.questions[session.current_question_index]

    # If we have generated all questions but not all are answered,
    # try to find the next unanswered question.
    if len(session.questions) == session.total_questions_planned:
        for i in range(len(session.questions)):
            if session.questions[i].user_answer is None:
                session.current_question_index = i
                return session.questions[i]
        # If all are answered (this case should be caught above, but as a safeguard)
        raise HTTPException(status_code=400, detail="All questions answered, session should be ending.")


    # Generate a new question if fewer than planned have been generated
    if len(session.questions) < session.total_questions_planned:
        new_question = generate_question_for_session(session)
        session.questions.append(new_question)
        session.current_question_index = len(session.questions) - 1
        return new_question
    else:
        # This state should ideally not be reached if logic above is correct
        raise HTTPException(status_code=400, detail="No more new questions to generate.")


class AnswerPayload(BaseModel):
    session_id: UUID
    question_id: UUID
    user_answer: int
    time_spent: Optional[float] = None

@router.post("/answer", response_model=Question)
async def submit_answer(payload: AnswerPayload):
    session = active_sessions.get(payload.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Practice session not found")
    if session.end_time:
        raise HTTPException(status_code=400, detail="Session has already ended")

    question_to_answer = None
    question_index = -1
    for idx, q in enumerate(session.questions):
        if q.id == payload.question_id:
            question_to_answer = q
            question_index = idx
            break
    
    if not question_to_answer:
        raise HTTPException(status_code=404, detail="Question not found in this session")
    if question_to_answer.user_answer is not None:
        raise HTTPException(status_code=400, detail="Question already answered")

    question_to_answer.user_answer = payload.user_answer
    question_to_answer.is_correct = (payload.user_answer == question_to_answer.correct_answer)
    question_to_answer.time_spent = payload.time_spent
    question_to_answer.answered_at = datetime.utcnow()

    if question_to_answer.is_correct:
        session.score += 1
    
    # Check if all questions are now answered
    answered_all = all(q.user_answer is not None for q in session.questions)
    if answered_all and len(session.questions) == session.total_questions_planned:
        if not session.end_time:
            session.end_time = datetime.utcnow()
            
    # Advance current_question_index to the next unanswered question or end
    if question_index == session.current_question_index :
        next_unanswered_idx = -1
        for i in range(len(session.questions)): # Check from beginning
            if session.questions[i].user_answer is None:
                next_unanswered_idx = i
                break
        if next_unanswered_idx != -1:
            session.current_question_index = next_unanswered_idx
        # else, all questions are answered, frontend will likely call summary or get /question and see it's ended

    return question_to_answer

@router.get("/summary", response_model=PracticeSession)
async def get_practice_summary(session_id: UUID):
    session = active_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Practice session not found")

    # Mark end_time if all questions are answered and it hasn't been set
    answered_all = all(q.user_answer is not None for q in session.questions)
    if answered_all and len(session.questions) >= session.total_questions_planned: # Use >= in case more were somehow generated
       if not session.end_time:
           session.end_time = datetime.utcnow()
           
    return session
