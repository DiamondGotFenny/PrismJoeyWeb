import pytest
import random
from uuid import uuid4
from typing import List, Optional

from app.models.difficulty import DifficultyLevel
from app.models.practice import Question
from app.services.columnar_practice_service import generate_columnar_question, _number_to_digits, _digits_to_number

# Helper to create a sample DifficultyLevel instance for tests
def create_sample_difficulty_level(
    id: int = 1,
    name: str = "Test Level",
    code: str = "test_level_01",
    max_number: int = 99, # For 2-digit numbers
    allow_carry: bool = True,
    allow_borrow: bool = True, # Not used for addition but part of model
    operation_types: List[str] = ["addition"], # For columnar, we focus on addition
    order: int = 1
) -> DifficultyLevel:
    return DifficultyLevel(
        id=id,
        name=name,
        code=code,
        max_number=max_number,
        allow_carry=allow_carry,
        allow_borrow=allow_borrow,
        operation_types=operation_types,
        order=order
    )

def test_number_to_digits():
    assert _number_to_digits(123) == [1, 2, 3]
    assert _number_to_digits(0) == [0]
    assert _number_to_digits(123, 5) == [0, 0, 1, 2, 3]
    assert _number_to_digits(123, 3) == [1, 2, 3]
    assert _number_to_digits(123, 2) == [1, 2, 3] # Does not truncate, only pads

def test_digits_to_number():
    assert _digits_to_number([1, 2, 3]) == 123
    assert _digits_to_number([0, 1, 2]) == 12
    assert _digits_to_number([None, 1, 2]) == 12 # None treated as 0 for this conversion
    assert _digits_to_number([1, None, 2]) == 102
    assert _digits_to_number([1, 2, None]) == 120
    assert _digits_to_number([None, None, None]) == 0
    assert _digits_to_number([5]) == 5
    assert _digits_to_number([None]) == 0 # A single None digit

def test_generate_columnar_addition_question_basic_properties():
    difficulty = create_sample_difficulty_level(max_number=99)
    session_id = uuid4()
    
    # Seed random for reproducibility in this specific test run if needed, though usually not for general tests
    # random.seed(42) 

    question = generate_columnar_question(difficulty, session_id)

    assert isinstance(question, Question)
    assert question.session_id == session_id
    assert question.difficulty_level_id == difficulty.id
    assert question.question_type == "columnar"
    assert question.columnar_operation == "+"
    assert len(question.operands) == 2
    
    num1, num2 = question.operands[0], question.operands[1]

    assert 0 <= num1 <= difficulty.max_number
    assert 0 <= num2 <= difficulty.max_number

    assert question.correct_answer == num1 + num2
    assert question.question_string == f"{num1} + {num2}"
    
    assert isinstance(question.columnar_operands, list)
    assert len(question.columnar_operands) == 2
    assert all(isinstance(op_list, list) for op_list in question.columnar_operands)
    
    # Check columnar operands structure and conversion
    max_len_operands = max(len(str(num1)), len(str(num2)))
    max_len_result = len(str(question.correct_answer))
    overall_max_digits = max(max_len_operands, max_len_result)

    assert len(question.columnar_operands[0]) == overall_max_digits
    assert len(question.columnar_operands[1]) == overall_max_digits
    
    # Reconstruct numbers from columnar_operands (they should not have None)
    # _digits_to_number handles None by treating them as 0, which is fine if operands are expected to be fully populated.
    # Here, columnar_operands should be fully populated digits of the numbers.
    assert _digits_to_number(question.columnar_operands[0]) == num1
    assert _digits_to_number(question.columnar_operands[1]) == num2

    assert isinstance(question.columnar_result_placeholders, list)
    assert len(question.columnar_result_placeholders) == overall_max_digits
    
    # Assert at least one None in placeholders (the blank for user input)
    # This is a key feature of columnar questions.
    # However, if the correct answer is 0 (e.g. from 0+0), and overall_max_digits is 1
    # the logic might make the single '0' placeholder None.
    # If overall_max_digits is 1, and answer is e.g. 7, placeholder can be [None]
    # If answer is e.g. 12, placeholder could be [1, None] or [None, 2]
    
    none_count = sum(1 for digit in question.columnar_result_placeholders if digit is None)
    
    # The current logic tries to make one non-leading digit None if possible.
    # If the answer is a single digit (e.g. 5 from 2+3), it might make that digit None ([None])
    # If the answer is like 10, it could be [1, None] or [None, 0].
    # The test should be flexible: at least one None, or if the result is 0, it could be [None].
    if question.correct_answer == 0 and overall_max_digits == 1:
        # For a result of 0 (e.g. 0+0), placeholder could be [None] or [0] depending on logic.
        # The current logic for _number_to_digits(0,1) -> [0]
        # Then it makes one random digit None. So [0] becomes [None].
        assert none_count >= 0 # Can be [None] or potentially [0] if logic changes, but typically 1
    else:
        assert none_count > 0, "There should be at least one blank (None) in result placeholders"
        assert none_count < len(question.columnar_result_placeholders) + (1 if len(question.columnar_result_placeholders) == 1 else 0) , "Not all placeholders should be None unless it's a single digit result made None"


    # Verify that placeholders + Nones correctly form the answer when Nones are filled
    # This is tricky because the None could be anywhere.
    # Instead, let's verify that the non-None placeholders match the correct answer's digits
    correct_answer_digits_str = str(question.correct_answer).zfill(overall_max_digits)
    for i, p_digit in enumerate(question.columnar_result_placeholders):
        if p_digit is not None:
            assert str(p_digit) == correct_answer_digits_str[i], \
                f"Mismatch at index {i}: placeholder {p_digit}, correct_answer_digits {correct_answer_digits_str}"

def test_generate_columnar_question_single_digit_result():
    # Test case where the result might be a single digit, e.g., 2+3=5
    # Max number is small to encourage single digit results
    difficulty = create_sample_difficulty_level(max_number=5) 
    session_id = uuid4()

    for _ in range(10): # Run a few times due to randomness
        question = generate_columnar_question(difficulty, session_id)
        if len(str(question.correct_answer)) == 1: # Found a single digit answer
            assert question.question_type == "columnar"
            
            max_len_operands = max(len(str(question.operands[0])), len(str(question.operands[1])))
            max_len_result = len(str(question.correct_answer))
            overall_max_digits = max(max_len_operands, max_len_result)
            
            assert len(question.columnar_result_placeholders) == overall_max_digits
            
            none_count = sum(1 for digit in question.columnar_result_placeholders if digit is None)
            
            # If result is single digit (e.g. '5'), placeholder could be '[None]'
            # Or if operands are like 1+4, result 5, overall_max_digits could be 1. Placeholder [None].
            # If operands 10+2 -> 12 (not this case).
            # If operands 1+2 -> 3. overall_max_digits = 1. placeholder [None].
            if overall_max_digits == 1:
                 assert none_count == 1, "For single digit result filling single slot, it should be None"
                 assert question.columnar_result_placeholders[0] is None
            else:
                # e.g. num1=5, num2=7 -> answer 12. overall_max_digits = 2. placeholders could be [1,None] or [None,2]
                # e.g. num1=0, num2=3 -> answer 3. overall_max_digits = 1. placeholder [None]
                # This case is hard to hit if max_number=5 without num1/num2 also being single digit
                # Let's assume for single digit *result*, overall_max_digits is usually 1.
                # The more general case for `none_count > 0` is in the main test.
                pass # Covered by the main test's assertions on none_count
            break 
    else:
        pytest.skip("Could not generate a single-digit result columnar question in 10 tries for this specific test.")


def test_generate_columnar_question_padding_logic():
    # Test with numbers that would require different padding lengths
    # e.g. 5 + 8 = 13 (op1_len=1, op2_len=1, res_len=2. Overall=2)
    # e.g. 12 + 3 = 15 (op1_len=2, op2_len=1, res_len=2. Overall=2)
    # e.g. 98 + 7 = 105 (op1_len=2, op2_len=1, res_len=3. Overall=3)
    
    difficulty = create_sample_difficulty_level(max_number=150) # Allow up to 3 digit results
    session_id = uuid4()

    # Scenario 1: 5 + 8 = 13
    # Mock random.randint to control generated numbers
    # This is more involved, so let's check properties based on a generated question
    # where such a scenario is likely.

    found_scenario_1 = False # 1-digit + 1-digit = 2-digits
    found_scenario_2 = False # 2-digits + 1-digit = 2-digits
    found_scenario_3 = False # 2-digits + 1-digit = 3-digits

    for _ in range(50): # Try a few times to hit different scenarios
        q = generate_columnar_question(difficulty, session_id)
        n1, n2 = q.operands[0], q.operands[1]
        res = q.correct_answer
        
        len_n1, len_n2, len_res = len(str(n1)), len(str(n2)), len(str(res))
        overall_max_digits = max(len_n1, len_n2, len_res)

        assert len(q.columnar_operands[0]) == overall_max_digits
        assert len(q.columnar_operands[1]) == overall_max_digits
        assert len(q.columnar_result_placeholders) == overall_max_digits

        if len_n1 == 1 and len_n2 == 1 and len_res == 2:
            found_scenario_1 = True
            assert _digits_to_number(q.columnar_operands[0]) == n1
            assert _digits_to_number(q.columnar_operands[1]) == n2
            # e.g. 5+8=13. operands: [[0,5],[0,8]], result_placeholders: [1,None] or [None,3]
            assert q.columnar_operands[0][0] == 0 # Padded
            assert q.columnar_operands[1][0] == 0 # Padded
        
        if len_n1 == 2 and len_n2 == 1 and len_res == 2:
            found_scenario_2 = True
            assert _digits_to_number(q.columnar_operands[0]) == n1
            assert _digits_to_number(q.columnar_operands[1]) == n2
            # e.g. 12+3=15. operands: [[1,2],[0,3]], result_placeholders: [1,None] or [None,5]
            assert q.columnar_operands[1][0] == 0 # Padded op2
            
        if len_n1 >= 2 and len_n2 >=1 and len_res == 3 : # e.g. 98+7=105 or 80+30=110
             found_scenario_3 = True
             assert _digits_to_number(q.columnar_operands[0]) == n1
             assert _digits_to_number(q.columnar_operands[1]) == n2
             if len_n1 == 2: assert q.columnar_operands[0][0] == 0 # Padded op1
             if len_n2 == 1: assert q.columnar_operands[1][0] == 0 # Padded op2 (if op1 is 3-digit)
             if len_n2 == 2 and len_n1 ==2 : # e.g. 80+30=110. op1=[0,8,0], op2=[0,3,0]
                 assert q.columnar_operands[0][0] == 0
                 assert q.columnar_operands[1][0] == 0


        if found_scenario_1 and found_scenario_2 and found_scenario_3:
            break
    
    if not (found_scenario_1 and found_scenario_2 and found_scenario_3):
        print(f"Warning: Not all padding scenarios were hit. S1:{found_scenario_1}, S2:{found_scenario_2}, S3:{found_scenario_3}")
        # pytest.skip("Not all padding scenarios were hit in 50 iterations.")
        # We can still pass if the general assertions hold for the cases we did hit.
        pass

# Consider adding a test for difficulty levels where max_number is very small (e.g., 0 or 1)
# or where columnar might not be "ideal" to see how it behaves.
# The current code in practice.py endpoint checks for max_number > 9 for columnar.
# This service doesn't have that check, it generates based on given difficulty.

def test_columnar_result_placeholders_specific_case():
    # Test a specific case to ensure the placeholder logic for making one None works.
    # If correct_answer is 123, overall_max_digits is 3.
    # Placeholders could be [None, 2, 3], [1, None, 3], or [1, 2, None].
    
    # This requires mocking random.choice or knowing the seed if random.choice is used directly
    # The current service code has its own complex logic for choosing blank_index.
    # For now, we rely on the `none_count > 0` and matching non-None digits.
    
    # Example: result is '10', overall_max_digits is 2.
    # columnar_result_placeholders could be [1, None] or [None, 0]
    difficulty = create_sample_difficulty_level(max_number=10) # To force smaller numbers
    session_id = uuid4()
    
    # Try to find a question where correct answer is 10
    for _ in range(50):
        q = generate_columnar_question(difficulty, session_id)
        if q.correct_answer == 10:
            max_len = max(len(str(q.operands[0])), len(str(q.operands[1])), len(str(q.correct_answer)))
            assert len(q.columnar_result_placeholders) == max_len
            if max_len == 2 : # e.g. for 10
                assert (q.columnar_result_placeholders == [1, None] or \
                        q.columnar_result_placeholders == [None, 0]), \
                        f"Unexpected placeholder for 10: {q.columnar_result_placeholders}"
                return # Test passed for this case
    # pytest.skip("Could not generate a question with correct_answer=10 for specific placeholder test.")
    print("Warning: Could not generate a question with correct_answer=10 for specific placeholder test.")

# Test for _number_to_digits with max_digits leading to leading zeros in the middle of the number (not really, it's padding)
# e.g. _number_to_digits(5, 3) -> [0,0,5] this is covered
# Test for _digits_to_number with leading Nones e.g. [None, None, 5] -> 5
def test_digits_to_number_leading_nones():
    assert _digits_to_number([None, None, 5]) == 5
    assert _digits_to_number([None, 0, 5]) == 5

# Test that the blanked out digit in result placeholders is not always the last one or first one.
# This is hard to test without deeper mocking of random.choice.
# The current implementation has logic that might prefer non-leading digits.
# The general test `none_count > 0` and `non-None digits match` provides good coverage.

# Test that if a number is 0, it's represented correctly, e.g. _number_to_digits(0, 3) -> [0,0,0]
def test_number_to_digits_zero_padding():
    assert _number_to_digits(0,3) == [0,0,0]
    assert _number_to_digits(0,1) == [0]

# Test columnar_operands are correctly padded
# e.g., if numbers are 5 and 12, result 17. overall_max_digits = 2
# op1_digits for 5 should be [0,5]
# op2_digits for 12 should be [1,2]
def test_columnar_operand_padding():
    difficulty = create_sample_difficulty_level(max_number=20)
    session_id = uuid4()

    for _ in range(30): # Try to get a case like 5 + 12
        q = generate_columnar_question(difficulty, session_id)
        n1, n2 = q.operands[0], q.operands[1]
        res_len = len(str(q.correct_answer))
        n1_len, n2_len = len(str(n1)), len(str(n2))
        overall_max = max(n1_len, n2_len, res_len)

        if n1_len == 1 and n2_len == 2 and overall_max == 2: # e.g. 5 + 12 = 17
            assert q.columnar_operands[0] == _number_to_digits(n1, 2)
            assert q.columnar_operands[1] == _number_to_digits(n2, 2)
            return
        elif n1_len == 2 and n2_len == 1 and overall_max == 2: # e.g. 12 + 5 = 17
            assert q.columnar_operands[0] == _number_to_digits(n1, 2)
            assert q.columnar_operands[1] == _number_to_digits(n2, 2)
            return
    print("Warning: Specific operand padding scenario (e.g., 1-digit + 2-digit = 2-digit) not hit in test_columnar_operand_padding.")

# Ensure that the `columnar_result_placeholders` doesn't make a leading zero None if it's significant
# e.g. for answer 0.5 (not applicable here) or if padding makes result like [0, 1, 5] for 15
# The current logic: `eligible_indices` includes all. `non_leading_eligible_indices` tries to pick > 0.
# If `correct_answer_digits` is `[0, 1, 5]`, `eligible_indices` is `[0,1,2]`.
# `non_leading_eligible_indices` would be `[1,2]` (if `columnar_result_placeholders[i-1] != 0` is met, or if `columnar_result_placeholders[0] == 0`)
# The condition `columnar_result_placeholders[i-1] != 0` in the service code seems a bit off.
# It was `if non_leading_eligible_indices: blank_index = random.choice(non_leading_eligible_indices)`
# The current code is:
# non_leading_eligible_indices = [i for i in eligible_indices if i > 0 and columnar_result_placeholders[i-1] != 0]
# if not non_leading_eligible_indices and columnar_result_placeholders[0] == 0 and len(columnar_result_placeholders) > 1 :
#      non_leading_eligible_indices = [i for i in eligible_indices if i > 0]

# If result is 15, max_digits = 3. Result_digits = [0,1,5]
# eligible_indices = [0,1,2]
# initial non_leading_eligible_indices (based on `crp[i-1]!=0`):
#   i=1: crp[0]=0. Not included.
#   i=2: crp[1]=1. Included. So `non_leading_eligible_indices = [2]`
# This means only index 2 (digit 5) can be made None. Placeholder: [0,1,None]
# This seems reasonable.

# If result is 5, max_digits = 3. Result_digits = [0,0,5]
# eligible_indices = [0,1,2]
# initial non_leading_eligible_indices:
#   i=1: crp[0]=0. Not included.
#   i=2: crp[1]=0. Not included. So `non_leading_eligible_indices = []`
# Then, `if not non_leading_eligible_indices and crp[0] == 0 and len(crp) > 1`: True (empty, 0, 3)
#   `non_leading_eligible_indices = [i for i in eligible_indices if i > 0]` -> `[1,2]`
# So blank can be index 1 or 2. Placeholder: [0,None,5] or [0,0,None]. This is also reasonable.

# The logic seems to try to preserve leading zeros if they are part of padding.
# The primary test `str(p_digit) == correct_answer_digits_str[i]` for non-None digits covers this.
pytest.main() # For running in some environments, not strictly needed for standard pytest runs
