from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict, Tuple, Optional
from uuid import UUID, uuid4
from datetime import datetime
from app.models.practice import PracticeSession, Question
from app.models.difficulty import DifficultyLevel
from app.api.endpoints.difficulty import difficulty_levels_objects # To get difficulty details
from app.services.columnar_practice_service import generate_columnar_question
import random
from pydantic import BaseModel

router = APIRouter()

# In-memory storage for active sessions (replace with DB for non-MVP)
active_sessions: Dict[UUID, PracticeSession] = {}

# Helper function to get difficulty detail
def get_difficulty_detail_by_id(level_id: int) -> Optional[DifficultyLevel]:
    return next((level for level in difficulty_levels_objects if level.id == level_id), None)

def _get_operation_symbol(operation_word: str) -> str:
    if operation_word == "addition":
        return "+"
    elif operation_word == "subtraction":
        return "-"
    # Add other operations if they exist in the future
    raise ValueError(f"Unknown operation word: {operation_word}")

def _calculate_answer(operands: List[int], operations: List[str]) -> int:
    if not operands:
        raise ValueError("Operands list cannot be empty")
    if len(operands) - 1 != len(operations):
        raise ValueError("Number of operations must be one less than operands")

    result = operands[0]
    for i, op_symbol in enumerate(operations):
        if op_symbol == "+":
            result += operands[i+1]
        elif op_symbol == "-":
            result -= operands[i+1]
        else:
            raise ValueError(f"Unknown operation symbol: {op_symbol}")
    return result

def _generate_question_string(operands: List[int], operations: List[str]) -> str:
    if not operands:
        return ""
    if len(operands) - 1 != len(operations):
        raise ValueError("Number of operations must be one less than operands for string generation")
    
    question_str = str(operands[0])
    for i, op_symbol in enumerate(operations):
        question_str += f" {op_symbol} {operands[i+1]}"
    return question_str

def _generate_single_operand_pair(
    level: DifficultyLevel,
    op_type_word: str,
    first_operand_for_step: Optional[int] = None # Used if this is a subsequent step in multi-step
) -> Tuple[int, int, int, bool]: # operand1, operand2, result, is_valid
    """
    Generates two operands and their result for a single operation,
    applying difficulty rules.
    If first_operand_for_step is provided, it's used as operand1.
    Returns: (operand1, operand2, result_of_step, is_valid_step)
    """
    operand1: int
    operand2: int
    result: int
    is_valid = True

    max_attempts_for_pair = 50 # Inner loop attempts
    for _ in range(max_attempts_for_pair):
        is_valid = True # Reset for each attempt

        # Determine operand generation strategy based on level code or properties
        is_two_one_digit_level = "within_100_two_one" in level.code
        is_tens_level = level.code == "within_100_tens"

        if first_operand_for_step is not None:
            operand1 = first_operand_for_step
            # Generate operand2 based on operand1 and level constraints
            if is_tens_level:
                if op_type_word == "addition":
                    max_o2_val = (level.max_number - operand1)
                    if max_o2_val < 0 : is_valid = False; continue # Should not happen if previous steps are good
                    operand2 = random.randint(1, max_o2_val // 10 if max_o2_val // 10 > 0 else 1) * 10
                else: # subtraction
                    max_o2_val = operand1
                    operand2 = random.randint(1, max_o2_val // 10 if max_o2_val // 10 > 0 else 1) * 10
            elif is_two_one_digit_level:
                # If op1 is 2-digit (from previous step or generated), op2 is 1-digit
                # This might need adjustment if first_operand_for_step could be 1-digit
                operand2 = random.randint(0, 9)
            else: # General case
                operand2 = random.randint(0, level.max_number) # This might need refinement for multi-step
        else: # Generating the first pair of operands
            if is_tens_level:
                operand1 = random.randint(1, (level.max_number // 10) -1 if (level.max_number // 10) -1 > 0 else 1) * 10
                if op_type_word == "addition":
                    max_operand2_tens = (level.max_number - operand1) // 10
                    operand2 = random.randint(1, max_operand2_tens if max_operand2_tens > 0 else 1) * 10
                else: # subtraction
                    max_operand2_tens = operand1 // 10
                    operand2 = random.randint(1, max_operand2_tens if max_operand2_tens > 0 else 1) * 10
            elif is_two_one_digit_level:
                operand1 = random.randint(10, 99)
                operand2 = random.randint(0, 9)
            else: # within_10, within_20, or general
                operand1 = random.randint(0, level.max_number)
                operand2 = random.randint(0, level.max_number)

        # Perform operation and validate
        if op_type_word == "addition":
            current_sum = operand1 + operand2
            if current_sum > level.max_number:
                is_valid = False; continue
            if not level.allow_carry:
                if is_two_one_digit_level: # 2-digit + 1-digit
                    if (operand1 % 10) + operand2 >= 10: is_valid = False; continue
                elif first_operand_for_step is not None and (operand1 >=10 and operand2 >=10): # Muli-step, both current op are 2 digits
                     if (operand1 % 10) + (operand2 % 10) >= 10: is_valid = False; continue # unit carry
                     if (operand1 // 10 % 10) + (operand2 // 10 % 10) >= 10: is_valid = False; continue # tens carry
                elif first_operand_for_step is None : # Single step, general non-carry
                    if (operand1 % 10) + (operand2 % 10) >= 10: is_valid = False; continue
                    if level.max_number > 10 and operand1 > 9 and operand2 > 9: # Check tens carry if applicable
                        if (operand1 // 10 % 10) + (operand2 // 10 % 10) >= 10: is_valid = False; continue
            result = current_sum
        else: # Subtraction
            temp_o1, temp_o2 = operand1, operand2
            if temp_o1 < temp_o2 and first_operand_for_step is None : # For first step, ensure o1 >= o2 by swapping
                temp_o1, temp_o2 = temp_o2, temp_o1
            
            # If it's a subsequent step and o1 < o2, this subtraction is invalid as it would go negative.
            # Or if the problem demands non-negative results always.
            if temp_o1 < temp_o2:
                is_valid = False; continue

            # Avoid X0 - X0 = 0 for tens level, unless it's the only option.
            if is_tens_level and temp_o1 == temp_o2 and temp_o1 !=0 : # Allow 0-0 if generated, but avoid 10-10, 20-20 etc.
                # This rule might be too restrictive or needs refinement. For now, let's keep it simple.
                # Pass for now, can add logic to retry if 0 result is not desired.
                pass


            if is_two_one_digit_level and temp_o2 == 0 and temp_o1 == 0 and first_operand_for_step is None:
                is_valid = False; continue
            
            current_diff = temp_o1 - temp_o2
            if current_diff < 0: # Should be caught by previous check for multi-step
                is_valid = False; continue

            if not level.allow_borrow:
                # Check for borrow:
                # (For 2-digit - 1-digit, it's operand1 % 10 < operand2)
                # (For 2-digit - 2-digit, it's operand1 % 10 < operand2 % 10, or if equal, check tens)
                if is_two_one_digit_level: # (e.g. 23 - 5)
                    if (temp_o1 % 10) < temp_o2 : is_valid = False; continue # (3 < 5)
                elif first_operand_for_step is not None and (temp_o1 >=10 and temp_o2 >=10): # Multi-step, both current op are 2 digits
                    if (temp_o1 % 10) < (temp_o2 % 10): is_valid = False; continue
                    if (temp_o1 % 10) == (temp_o2 % 10) and (temp_o1 // 10 % 10) < (temp_o2 // 10 % 10) : is_valid = False; continue
                elif first_operand_for_step is None: # Single step, general non-borrow
                    if (temp_o1 % 10) < (temp_o2 % 10): is_valid = False; continue
                    if level.max_number > 10 and temp_o1 > 9 and temp_o2 > 9:
                        if (temp_o1 // 10 % 10) < (temp_o2 // 10 % 10): is_valid = False; continue
            
            # If we swapped for the first step, ensure original operand order for the question model
            # but the calculation uses the swapped order.
            # This helper returns actual operands used for calculation for THIS step.
            # The main function will store the sequence.
            operand1, operand2 = temp_o1, temp_o2 # Use the (potentially swapped) operands for this step
            result = current_diff
        
        if is_valid:
            return operand1, operand2, result, True

    return operand1, operand2, -1, False # Fallback if no valid pair found

def generate_question_for_session(session: PracticeSession) -> Question:
    level = session.difficulty_level_details
    if not level:
        raise HTTPException(status_code=500, detail="Difficulty details missing in session")

    max_generation_attempts = 100 # Overall attempts for a full question
    for attempt_num in range(max_generation_attempts):
        final_operands: List[int] = []
        final_operations_words: List[str] = [] # "addition", "subtraction"
        final_operations_symbols: List[str] = [] # "+", "-"
        
        is_multi_step = len(level.operation_types) > 1 and random.random() < 0.5
        num_operations = 2 if is_multi_step else 1
        
        current_val_for_next_step: Optional[int] = None
        valid_question_generated = True

        for i in range(num_operations):
            op_type_word = random.choice(level.operation_types)
            
            o1_step, o2_step, result_step, is_step_valid = _generate_single_operand_pair(
                level, op_type_word, current_val_for_next_step
            )

            if not is_step_valid:
                valid_question_generated = False; break
            
            if i == 0: # First operation
                final_operands.extend([o1_step, o2_step])
            else: # Subsequent operations in multi-step
                final_operands.append(o2_step)
            
            final_operations_words.append(op_type_word)
            final_operations_symbols.append(_get_operation_symbol(op_type_word))
            current_val_for_next_step = result_step

            # Additional checks for multi-step intermediate results (optional for now, focus on final)
            # if is_multi_step and i == 0:
            # if current_val_for_next_step < 0 or current_val_for_next_step > level.max_number :
            # valid_question_generated = False; break
        
        if not valid_question_generated:
            continue # Try generating the whole question again

        final_answer = _calculate_answer(final_operands, final_operations_symbols)

        # Validate final answer (redundant if _calculate_answer is correct and steps are fine)
        if not (0 <= final_answer <= level.max_number):
             # For subtraction, a negative final answer is possible if not handled earlier.
             # _generate_single_operand_pair tries to ensure op1 >= op2 for subtraction steps
             # or that the intermediate result doesn't lead to a negative.
            continue # Try again

        question_str = _generate_question_string(final_operands, final_operations_symbols)

        # Prevent immediate repetition
        if session.questions:
            last_few_qs = session.questions[-min(3, len(session.questions)):]
            if any(q.question_string == question_str for q in last_few_qs):
                # Simple way to try to avoid direct repetition without complex recursion depth tracking here
                # If it happens too often, might get stuck, but max_generation_attempts should save it.
                continue 
        
        # If all checks pass
        return Question(
            session_id=session.id,
            operands=final_operands,
            operations=final_operations_symbols,
            question_string=question_str,
            correct_answer=final_answer,
            difficulty_level_id=level.id,
            question_type="arithmetic"
        )

    # Fallback if all attempts fail (simplistic)
    # This part should ideally generate a guaranteed valid, simple question
    # For now, it's a simplified version of the single-step logic without strict validation.
    op_type_word = random.choice(level.operation_types)
    op_symbol = _get_operation_symbol(op_type_word)
    o1 = random.randint(0, level.max_number // 2 if op_symbol == "+" else level.max_number)
    o2 = random.randint(0, level.max_number // 2)
    if op_symbol == "-" and o1 < o2: o1, o2 = o2, o1
    
    fallback_operands = [o1, o2]
    fallback_operations = [op_symbol]
    fallback_answer = _calculate_answer(fallback_operands, fallback_operations)
    fallback_q_string = _generate_question_string(fallback_operands, fallback_operations)

    # Ensure fallback answer is within bounds, adjust if necessary (crude)
    if not (0 <= fallback_answer <= level.max_number):
        if fallback_answer < 0: fallback_answer = 0
        if fallback_answer > level.max_number: fallback_answer = level.max_number
        # Note: operands/string might not match this adjusted answer. This is a last resort.

    return Question(
        session_id=session.id,
        operands=fallback_operands,
        operations=fallback_operations,
        question_string=fallback_q_string, # Might not match fallback_answer if adjusted
        correct_answer=fallback_answer,
        difficulty_level_id=level.id,
        question_type="arithmetic"
    )


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

@router.get("/question", response_model=Question)
async def get_next_question(session_id: UUID):
    session = active_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Practice session not found")
    if session.end_time:
        raise HTTPException(status_code=400, detail="Session has already ended")
    
    answered_questions_count = sum(1 for q in session.questions if q.user_answer is not None)
    if len(session.questions) == session.total_questions_planned and answered_questions_count == session.total_questions_planned:
         raise HTTPException(status_code=400, detail="All planned questions have been answered.")

    if session.current_question_index < len(session.questions) and \
       session.questions[session.current_question_index].user_answer is None:
        return session.questions[session.current_question_index]

    if len(session.questions) == session.total_questions_planned:
        for i in range(len(session.questions)):
            if session.questions[i].user_answer is None:
                session.current_question_index = i
                return session.questions[i]
        raise HTTPException(status_code=400, detail="All questions answered, session should be ending.")

    if len(session.questions) < session.total_questions_planned:
        # Clear recursion depth attribute if it exists from a previous version
        if hasattr(generate_question_for_session, "recursion_depth"):
            delattr(generate_question_for_session, "recursion_depth")
        
        # Decide question type: 50% chance for columnar if applicable
        # For now, let's assume columnar is always addition and check if "+" is in allowed operations.
        # A more robust check might involve specific flags in difficulty level for columnar support.
        difficulty_detail = session.difficulty_level_details
        can_be_columnar = False
        if difficulty_detail and "+" in [_get_operation_symbol(op) for op in difficulty_detail.operation_types]:
            # Further check if difficulty is suitable for columnar (e.g. not too simple, or has a flag)
            # For MVP, let's assume any level allowing addition could be columnar.
            # We might want to restrict this, e.g. based on max_number or a specific flag.
            # For example, columnar might not make sense for "within_10" single digit additions.
            # Let's add a simple check: max_number > 9 (i.e. at least two digits involved potentially)
            if difficulty_detail.max_number > 9:
                 can_be_columnar = True

        if can_be_columnar and random.random() < 0.5:
            new_question = generate_columnar_question(difficulty_detail, session.id)
        else:
            new_question = generate_question_for_session(session) # Existing arithmetic question
            # Ensure question_type is set for non-columnar questions if not already.
            # The Question model has a default, but explicit here is fine.
            if not new_question.question_type: # Check if it was set by the generator
                new_question.question_type = "arithmetic"


        session.questions.append(new_question)
        session.current_question_index = len(session.questions) - 1
        return new_question
    else:
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
    # The core validation remains the same as correct_answer should be the integer representation
    # for both arithmetic and columnar questions. The frontend will handle converting
    # columnar input into a single integer for user_answer.
    question_to_answer.is_correct = (payload.user_answer == question_to_answer.correct_answer)
    question_to_answer.time_spent = payload.time_spent
    question_to_answer.answered_at = datetime.utcnow()

    if question_to_answer.is_correct:
        session.score += 1
    
    # Ensure question_type is on the returned object, it might have been missing on older questions in session
    if not hasattr(question_to_answer, 'question_type') or not question_to_answer.question_type:
        # This is a safeguard. All new questions should have it.
        # If it's missing, we can't definitively know, but assume "arithmetic" for older data.
        # However, since we are modifying Question model, all new questions will have it.
        # For the response, it's good practice to ensure it's there.
        # The actual Question object in the session *should* have it if generated by new code.
        # This is more about the response model consistency if anything.
        # Let's assume Question model instances in `session.questions` are correctly typed.
        pass


    answered_all = all(q.user_answer is not None for q in session.questions)
    if answered_all and len(session.questions) == session.total_questions_planned:
        if not session.end_time:
            session.end_time = datetime.utcnow()
            
    if question_index == session.current_question_index :
        next_unanswered_idx = -1
        for i in range(len(session.questions)): 
            if session.questions[i].user_answer is None:
                next_unanswered_idx = i
                break
        if next_unanswered_idx != -1:
            session.current_question_index = next_unanswered_idx

    return question_to_answer

@router.get("/summary", response_model=PracticeSession)
async def get_practice_summary(session_id: UUID):
    session = active_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Practice session not found")

    answered_all = all(q.user_answer is not None for q in session.questions)
    if answered_all and len(session.questions) >= session.total_questions_planned: 
       if not session.end_time:
           session.end_time = datetime.utcnow()
           
    return session
