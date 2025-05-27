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
    """Generates a columnar addition question."""
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
    
    columnar_operands = [op1_digits, op2_digits]

    # Convert correct answer to digit list (result placeholders)
    correct_answer_digits = _number_to_digits(correct_answer, overall_max_digits)
    
    # Create placeholders, initially a copy of the correct answer
    columnar_result_placeholders = list(correct_answer_digits)

    # Make one random digit in the result None (if result has more than 1 digit and not the leading one)
    if len(columnar_result_placeholders) > 0:
        # Ensure we don't make a leading digit None if it's the only digit or to avoid confusion
        # For example, if answer is 7, placeholder is [7]. If answer is 12, placeholder is [1, None] or [None, 2]
        # We will try to make a non-leading digit None if possible.
        
        # Find indices that can be made None (not a leading zero if it's the only digit)
        eligible_indices = [
            i for i, digit in enumerate(columnar_result_placeholders)
        ]
        
        if columnar_result_placeholders[0] == 0 and len(columnar_result_placeholders) > 1: # leading zero from padding
            # if it's like [0, 1, 5] for 15, don't make the 0 None.
            # if it's like [5] for 5, eligible_indices is [0]
            # if it's like [1, 5] for 15, eligible_indices is [0,1]
            # if it's like [0,0,5] for 5, eligible_indices is [0,1,2]
            # We want to avoid making a significant leading digit None if possible.
            # Let's try to make a non-leading digit None.
            non_leading_eligible_indices = [i for i in eligible_indices if i > 0 and columnar_result_placeholders[i-1] != 0]
            if not non_leading_eligible_indices and columnar_result_placeholders[0] == 0 and len(columnar_result_placeholders) > 1 : #e.g. [0,5]
                 # if it is [0,5], make 5 None
                 non_leading_eligible_indices = [i for i in eligible_indices if i > 0]


            if non_leading_eligible_indices:
                blank_index = random.choice(non_leading_eligible_indices)
                columnar_result_placeholders[blank_index] = None
            elif eligible_indices: # Only one digit or all leading are significant
                blank_index = random.choice(eligible_indices)
                # Avoid making the only digit of a single-digit number None if it's not 0
                if not (len(columnar_result_placeholders) == 1 and columnar_result_placeholders[0] != 0) :
                    columnar_result_placeholders[blank_index] = None

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
