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

    # Strategy: Create exactly 1-2 blanks, preferring operands over result
    # This creates more meaningful practice like ?6 + ?6 = 22
    operand_positions = []
    result_positions = []
    
    # Add operand positions (prioritize non-leading positions)
    for row_idx in range(len(columnar_operands)):
        for digit_idx in range(len(columnar_operands[row_idx])):
            # Skip leading zeros but include meaningful digits
            if not (columnar_operands[row_idx][digit_idx] == 0 and digit_idx == 0 and overall_max_digits > 1):
                operand_positions.append(('operand', row_idx, digit_idx))
    
    # Add result positions with lower priority
    for digit_idx in range(len(columnar_result_placeholders)):
        if not (columnar_result_placeholders[digit_idx] == 0 and digit_idx == 0 and overall_max_digits > 1):
            result_positions.append(('result', 0, digit_idx))

    # Determine number of blanks (1-2, prefer 2 for better practice)
    num_blanks = 2 if len(operand_positions) >= 2 else 1
    
    # Select positions strategically - prefer operands
    blank_positions = []
    if num_blanks == 2 and len(operand_positions) >= 2:
        # Try to get 2 operand positions from different rows if possible
        row_0_positions = [pos for pos in operand_positions if pos[1] == 0]
        row_1_positions = [pos for pos in operand_positions if pos[1] == 1]
        
        if row_0_positions and row_1_positions:
            # Pick one from each row for balanced practice
            blank_positions.append(random.choice(row_0_positions))
            blank_positions.append(random.choice(row_1_positions))
        else:
            # Fall back to any 2 operand positions
            blank_positions = random.sample(operand_positions, 2)
    elif num_blanks == 1:
        # For 1 blank, prefer operand
        if operand_positions:
            blank_positions = [random.choice(operand_positions)]
        elif result_positions:
            blank_positions = [random.choice(result_positions)]
    
    # Apply the blanks
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
