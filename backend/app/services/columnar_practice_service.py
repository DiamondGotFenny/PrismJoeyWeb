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
    operation = "+" # For now, only addition
    
    num1 = random.randint(1, difficulty_level.max_number)
    num2 = random.randint(1, difficulty_level.max_number)
    calculated_actual_result = num1 + num2 # This is the true sum, not for user display

    max_len_operands = max(len(str(num1)), len(str(num2)))
    max_len_result = len(str(calculated_actual_result))
    overall_max_digits = max(max_len_operands, max_len_result)

    op1_digits_full = _number_to_digits(num1, overall_max_digits)
    op2_digits_full = _number_to_digits(num2, overall_max_digits)
    result_digits_full = _number_to_digits(calculated_actual_result, overall_max_digits)
    
    columnar_operands_with_blanks = [list(op1_digits_full), list(op2_digits_full)]
    columnar_result_placeholders_with_blanks = list(result_digits_full)

    # Blanking strategy (same as before)
    operand_positions = []
    for r_idx in range(len(columnar_operands_with_blanks)):
        for d_idx in range(len(columnar_operands_with_blanks[r_idx])):
            # Allow blanking leading zeros if they are part of padding, but not if it's the only digit
            is_leading_zero_for_padding = columnar_operands_with_blanks[r_idx][d_idx] == 0 and d_idx == 0 and overall_max_digits > 1
            if not is_leading_zero_for_padding or overall_max_digits > 1: # don't blank if it's just [0]
                 operand_positions.append(('operand', r_idx, d_idx))
    
    result_positions = []
    for d_idx in range(len(columnar_result_placeholders_with_blanks)):
        is_leading_zero_for_padding = columnar_result_placeholders_with_blanks[d_idx] == 0 and d_idx == 0 and overall_max_digits > 1
        if not is_leading_zero_for_padding or overall_max_digits > 1:
            result_positions.append(('result', 0, d_idx)) # row_idx is 0 for result

    all_eligible_positions = operand_positions + result_positions
    if not all_eligible_positions:
        # This case should be rare (e.g. 0+0=0 with overall_max_digits=1, where nothing is eligible for blanking by above rules)
        # Force a blank if nothing eligible (e.g., make the single result digit blank)
        if columnar_result_placeholders_with_blanks: 
             columnar_result_placeholders_with_blanks[0] = None
        elif columnar_operands_with_blanks and columnar_operands_with_blanks[0]:
             columnar_operands_with_blanks[0][0] = None # Fallback to blanking first digit of first operand

    else:
        num_blanks = random.randint(1, min(2, len(all_eligible_positions))) # 1 or 2 blanks
        blank_selections = random.sample(all_eligible_positions, num_blanks)
        for pos_type, r_idx, d_idx in blank_selections:
            if pos_type == 'operand':
                columnar_operands_with_blanks[r_idx][d_idx] = None
            elif pos_type == 'result':
                columnar_result_placeholders_with_blanks[d_idx] = None

    # Create the question_string template
    op1_str_template = "".join([str(d) if d is not None else '?' for d in columnar_operands_with_blanks[0]])
    op2_str_template = "".join([str(d) if d is not None else '?' for d in columnar_operands_with_blanks[1]])
    res_str_template = "".join([str(d) if d is not None else '?' for d in columnar_result_placeholders_with_blanks])
    question_string_template = f"{op1_str_template} {operation} {op2_str_template} = {res_str_template}"

    return Question(
        session_id=session_id,
        operands=[num1, num2], # Original numbers for reference
        operations=[operation],
        question_string=question_string_template, # Template string
        correct_answer=None,  # Explicitly None for columnar
        difficulty_level_id=difficulty_level.id,
        question_type="columnar",
        columnar_operands=columnar_operands_with_blanks,
        columnar_result_placeholders=columnar_result_placeholders_with_blanks,
        columnar_operation=operation
    )
