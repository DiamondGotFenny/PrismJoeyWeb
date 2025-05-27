import random
from typing import List, Optional, Tuple
from uuid import UUID
from app.models.practice import Question
from app.models.difficulty import DifficultyLevel

def _number_to_digits(number: int, max_digits: Optional[int] = None) -> List[Optional[int]]:
    """Converts a number to a list of its digits, optionally padded with zeros."""
    digits = [int(d) for d in str(number)]
    if max_digits and len(digits) < max_digits:
        return [0] * (max_digits - len(digits)) + digits
    return digits

def _digits_to_number(digits: List[Optional[int]]) -> int:
    """Converts a list of digits (some can be None) to a number, treating None as 0 for calculation if necessary."""
    return int("".join(map(str, [d if d is not None else 0 for d in digits])))

def generate_columnar_question(difficulty_level: DifficultyLevel, session_id: UUID) -> Question:
    """Generates a columnar addition question with blanks in operands and/or result."""
    # For now, only addition
    operation = "+"
    
    # Generate two random numbers
    num1 = random.randint(1, difficulty_level.max_number)
    num2 = random.randint(1, difficulty_level.max_number)

    correct_answer = num1 + num2

    # Determine max digits for padding based on the larger of the two numbers or the result
    max_len_operands = max(len(str(num1)), len(str(num2)))
    max_len_result = len(str(correct_answer))
    overall_max_digits = max(max_len_operands, max_len_result)

    # Convert numbers to digit lists (operands)
    op1_digits = _number_to_digits(num1, overall_max_digits)
    op2_digits = _number_to_digits(num2, overall_max_digits)
    result_digits = _number_to_digits(correct_answer, overall_max_digits)
    
    # Create copies for blanking
    columnar_operands = [list(op1_digits), list(op2_digits)]
    columnar_result_placeholders = list(result_digits)

    # Strategy: Create 1-3 blanks across operands and result
    # Ensure at least one significant digit remains visible in each row
    total_positions = []
    
    # Add operand positions (row_index, digit_index)
    for row_idx in range(len(columnar_operands)):
        for digit_idx in range(len(columnar_operands[row_idx])):
            # Skip leading zeros in operands as they're not meaningful blanks
            if not (columnar_operands[row_idx][digit_idx] == 0 and digit_idx == 0 and overall_max_digits > 1):
                total_positions.append(('operand', row_idx, digit_idx))
    
    # Add result positions
    for digit_idx in range(len(columnar_result_placeholders)):
        # Skip leading zeros in result as they're not meaningful blanks
        if not (columnar_result_placeholders[digit_idx] == 0 and digit_idx == 0 and overall_max_digits > 1):
            total_positions.append(('result', 0, digit_idx))

    # Determine number of blanks (1-3, but ensure we don't blank everything)
    max_blanks = min(3, len(total_positions) - 2)  # Leave at least 2 digits visible
    num_blanks = random.randint(1, max(1, max_blanks))
    
    # Randomly select positions to blank
    if total_positions:
        blank_positions = random.sample(total_positions, min(num_blanks, len(total_positions)))
        
        for pos_type, row_idx, digit_idx in blank_positions:
            if pos_type == 'operand':
                columnar_operands[row_idx][digit_idx] = None
            elif pos_type == 'result':
                columnar_result_placeholders[digit_idx] = None

    question_string = f"{num1} {operation} {num2}"

    return Question(
        session_id=session_id,
        operands=[num1, num2],
        operations=[operation],
        question_string=question_string,
        correct_answer=correct_answer,
        difficulty_level_id=difficulty_level.id,
        question_type="columnar",
        columnar_operands=columnar_operands,
        columnar_result_placeholders=columnar_result_placeholders,
        columnar_operation=operation
    )
