import random
from typing import List, Optional, Tuple
from uuid import UUID
from app.models.practice import Question
from app.models.difficulty import DifficultyLevel

def _get_operation_symbol_from_difficulty(op_type_word: str) -> str:
    if op_type_word == "addition": return "+"
    if op_type_word == "subtraction": return "-"
    # Add more if other types are introduced for columnar, e.g., "multiplication": "*"
    raise ValueError(f"Unsupported operation type for columnar: {op_type_word}")

def _number_to_digits(number: int, max_digits: Optional[int] = None) -> List[Optional[int]]:
    """Converts a number to a list of its digits, optionally padded with zeros."""
    s_number = str(number)
    # Handle negative numbers if they become possible in the future for columnar results, for now, assume positive.
    # For padding, length is based on absolute value.
    # Example: -5 padded to 3 digits could be [- sign, 0, 5] or handled differently.
    # Current logic assumes positive numbers for digits list.
    digits = [int(d) for d in s_number]
    if max_digits and len(digits) < max_digits:
        # Pad with 0 for positive numbers. 
        # If negative sign needs to be a separate element or handled in display, this would change.
        return [0] * (max_digits - len(digits)) + digits
    return digits

def _digits_to_number(digits: List[Optional[int]]) -> int:
    """Converts a list of digits (some can be None) to a number, treating None as 0 for calculation if necessary."""
    return int("".join(map(str, [d if d is not None else 0 for d in digits])))

def generate_columnar_question(difficulty_level: DifficultyLevel, session_id: UUID) -> Question:
    """Generates a columnar question (addition or subtraction) with blanks."""
    
    # Determine available operations for columnar based on difficulty level
    # For now, let's assume columnar questions will only use one operation type per question.
    # And that operation_types in difficulty level are like ["addition", "subtraction"]
    possible_ops_words = []
    if "addition" in difficulty_level.operation_types:
        possible_ops_words.append("addition")
    if "subtraction" in difficulty_level.operation_types:
        possible_ops_words.append("subtraction")
    
    if not possible_ops_words:
        # Fallback or error if no suitable operations defined for columnar for this difficulty
        # For now, default to addition if somehow empty but shouldn't happen with proper config
        selected_op_word = "addition"
    else:
        selected_op_word = random.choice(possible_ops_words)
    
    operation_symbol = _get_operation_symbol_from_difficulty(selected_op_word)

    num1 = random.randint(0, difficulty_level.max_number) # Allow 0 for subtraction e.g. 10 - 0
    num2 = random.randint(0, difficulty_level.max_number)

    if operation_symbol == "-":
        # Ensure num1 >= num2 for subtraction to keep results non-negative for typical columnar display
        if num1 < num2:
            num1, num2 = num2, num1 # Swap them
        # Further checks for difficulty_level.allow_borrow might be needed here if we want to ensure
        # that a borrow IS or IS NOT required, but for now, just ensure positive result.
        calculated_actual_result = num1 - num2
    elif operation_symbol == "+":
        # Ensure sum does not exceed max_number (more critical for addition)
        # If num1 + num2 > max_number, we might need to regenerate or cap them.
        # For simplicity, let's try to cap. A better approach might be to generate num2 based on num1 and max_number.
        if num1 + num2 > difficulty_level.max_number:
            if difficulty_level.max_number - num1 >= 0:
                 num2 = random.randint(0, difficulty_level.max_number - num1)
            else: # num1 is already max_number or very close, make num2 zero
                 num2 = 0 
        calculated_actual_result = num1 + num2
    else:
        # Should not happen with current logic
        raise ValueError(f"Unsupported operation symbol for columnar: {operation_symbol}")

    max_len_operands = max(len(str(num1)), len(str(num2)), 1) # Min length 1 for single digit numbers
    max_len_result = max(len(str(calculated_actual_result)), 1) # Min length 1
    overall_max_digits = max(max_len_operands, max_len_result)

    op1_digits_full = _number_to_digits(num1, overall_max_digits)
    op2_digits_full = _number_to_digits(num2, overall_max_digits)
    result_digits_full = _number_to_digits(calculated_actual_result, overall_max_digits)
    
    columnar_operands_with_blanks = [list(op1_digits_full), list(op2_digits_full)]
    columnar_result_placeholders_with_blanks = list(result_digits_full)

    # Blanking strategy (remains largely the same)
    operand_positions = []
    for r_idx in range(len(columnar_operands_with_blanks)):
        for d_idx in range(len(columnar_operands_with_blanks[r_idx])):
            is_leading_zero_for_padding = columnar_operands_with_blanks[r_idx][d_idx] == 0 and d_idx == 0 and overall_max_digits > 1
            if not is_leading_zero_for_padding or overall_max_digits > 1: 
                 operand_positions.append(('operand', r_idx, d_idx))
    
    result_positions = []
    for d_idx in range(len(columnar_result_placeholders_with_blanks)):
        is_leading_zero_for_padding = columnar_result_placeholders_with_blanks[d_idx] == 0 and d_idx == 0 and overall_max_digits > 1
        if not is_leading_zero_for_padding or overall_max_digits > 1:
            result_positions.append(('result', 0, d_idx))

    all_eligible_positions = operand_positions + result_positions
    if not all_eligible_positions:
        if columnar_result_placeholders_with_blanks: 
             columnar_result_placeholders_with_blanks[0] = None
        elif columnar_operands_with_blanks and columnar_operands_with_blanks[0]:
             columnar_operands_with_blanks[0][0] = None
    else:
        num_blanks = random.randint(1, min(2, len(all_eligible_positions)))
        blank_selections = random.sample(all_eligible_positions, num_blanks)
        for pos_type, r_idx, d_idx in blank_selections:
            if pos_type == 'operand':
                columnar_operands_with_blanks[r_idx][d_idx] = None
            elif pos_type == 'result':
                columnar_result_placeholders_with_blanks[d_idx] = None

    op1_str_template = "".join([str(d) if d is not None else '?' for d in columnar_operands_with_blanks[0]])
    op2_str_template = "".join([str(d) if d is not None else '?' for d in columnar_operands_with_blanks[1]])
    res_str_template = "".join([str(d) if d is not None else '?' for d in columnar_result_placeholders_with_blanks])
    question_string_template = f"{op1_str_template} {operation_symbol} {op2_str_template} = {res_str_template}"

    return Question(
        session_id=session_id,
        operands=[num1, num2],
        operations=[operation_symbol],
        question_string=question_string_template,
        correct_answer=None,
        difficulty_level_id=difficulty_level.id,
        question_type="columnar",
        columnar_operands=columnar_operands_with_blanks,
        columnar_result_placeholders=columnar_result_placeholders_with_blanks,
        columnar_operation=operation_symbol
    )
