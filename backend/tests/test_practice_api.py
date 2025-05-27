import pytest
import random
from uuid import uuid4, UUID
from typing import List

# Assuming the following imports will work based on PYTHONPATH or test runner setup
from app.models.practice import PracticeSession, Question
from app.models.difficulty import DifficultyLevel
from app.api.endpoints.practice import generate_question_for_session, _calculate_answer, _get_operation_symbol, _generate_question_string

# --- Fixtures for Test Data ---

@pytest.fixture
def difficulty_level_add_only() -> DifficultyLevel:
    return DifficultyLevel(
        id=1,
        name="Addition Only (Max 20)",
        code="add_only_max_20",
        max_number=20,
        allow_carry=True,
        allow_borrow=False, # Not relevant for addition
        operation_types=["addition"],
        order=1
    )

@pytest.fixture
def difficulty_level_sub_only() -> DifficultyLevel:
    return DifficultyLevel(
        id=2,
        name="Subtraction Only (Max 20)",
        code="sub_only_max_20",
        max_number=20,
        allow_carry=False, # Not relevant for subtraction
        allow_borrow=True,
        operation_types=["subtraction"],
        order=2
    )

@pytest.fixture
def difficulty_level_mixed_ops() -> DifficultyLevel:
    return DifficultyLevel(
        id=3,
        name="Mixed Operations (Max 50)",
        code="mixed_ops_max_50",
        max_number=50,
        allow_carry=True,
        allow_borrow=True,
        operation_types=["addition", "subtraction"],
        order=3
    )

@pytest.fixture
def base_session(difficulty_level_mixed_ops: DifficultyLevel) -> PracticeSession:
    """A base session that can be updated with specific difficulty levels."""
    return PracticeSession(
        id=uuid4(),
        difficulty_level_id=difficulty_level_mixed_ops.id,
        total_questions_planned=20, # Generate enough questions
        difficulty_level_details=difficulty_level_mixed_ops,
        questions=[] # Start with no prior questions
    )

# --- Test Functions ---

def test_generate_single_step_addition_only(base_session: PracticeSession, difficulty_level_add_only: DifficultyLevel):
    base_session.difficulty_level_details = difficulty_level_add_only
    base_session.difficulty_level_id = difficulty_level_add_only.id
    base_session.questions = [] # Ensure fresh start for this test

    for _ in range(10): # Generate a few questions
        # Mocking random.random() to ensure single step if multi-step decision is 50%
        # For addition_only, it should always be single step as only one op_type.
        question = generate_question_for_session(base_session)

        assert isinstance(question, Question)
        assert len(question.operands) == 2, "Should have 2 operands for single-step"
        assert len(question.operations) == 1, "Should have 1 operation for single-step"
        assert question.operations[0] == "+", "Operation should be addition"
        
        expected_answer = question.operands[0] + question.operands[1]
        assert question.correct_answer == expected_answer, "Correct answer calculation is wrong"
        assert 0 <= question.correct_answer <= difficulty_level_add_only.max_number, "Answer out of bounds"
        
        expected_string = f"{question.operands[0]} + {question.operands[1]}"
        assert question.question_string == expected_string, "Question string format is wrong"
        base_session.questions.append(question) # Add to session for next iteration's repetition check

def test_generate_single_step_subtraction_only(base_session: PracticeSession, difficulty_level_sub_only: DifficultyLevel):
    base_session.difficulty_level_details = difficulty_level_sub_only
    base_session.difficulty_level_id = difficulty_level_sub_only.id
    base_session.questions = []

    for _ in range(10):
        question = generate_question_for_session(base_session)

        assert isinstance(question, Question)
        assert len(question.operands) == 2
        assert len(question.operations) == 1
        assert question.operations[0] == "-", "Operation should be subtraction"
        
        expected_answer = question.operands[0] - question.operands[1]
        assert question.correct_answer == expected_answer
        assert 0 <= question.correct_answer <= difficulty_level_sub_only.max_number
        
        expected_string = f"{question.operands[0]} - {question.operands[1]}"
        assert question.question_string == expected_string
        base_session.questions.append(question)

def test_generate_mixed_operation_questions_single_and_multi_step(base_session: PracticeSession, difficulty_level_mixed_ops: DifficultyLevel):
    base_session.difficulty_level_details = difficulty_level_mixed_ops
    base_session.difficulty_level_id = difficulty_level_mixed_ops.id
    base_session.questions = []

    generated_questions: List[Question] = []
    for _ in range(30): # Generate more to increase chance of multi-step
        q = generate_question_for_session(base_session)
        generated_questions.append(q)
        base_session.questions.append(q) # Add to session history

    single_step_found = False
    multi_step_found = False

    for question in generated_questions:
        assert isinstance(question, Question)
        assert 0 <= question.correct_answer <= difficulty_level_mixed_ops.max_number

        if len(question.operands) == 2: # Single-step
            single_step_found = True
            assert len(question.operations) == 1
            op_symbol = question.operations[0]
            assert op_symbol in ["+", "-"]
            
            expected_answer = question.operands[0] + question.operands[1] if op_symbol == "+" else question.operands[0] - question.operands[1]
            assert question.correct_answer == expected_answer
            
            expected_string = f"{question.operands[0]} {op_symbol} {question.operands[1]}"
            assert question.question_string == expected_string

        elif len(question.operands) == 3: # Multi-step
            multi_step_found = True
            assert len(question.operations) == 2
            op1_symbol, op2_symbol = question.operations[0], question.operations[1]
            assert op1_symbol in ["+", "-"]
            assert op2_symbol in ["+", "-"]

            # Calculate expected answer (left-to-right)
            intermediate_result = question.operands[0] + question.operands[1] if op1_symbol == "+" else question.operands[0] - question.operands[1]
            final_expected_answer = intermediate_result + question.operands[2] if op2_symbol == "+" else intermediate_result - question.operands[2]
            assert question.correct_answer == final_expected_answer

            expected_string = f"{question.operands[0]} {op1_symbol} {question.operands[1]} {op2_symbol} {question.operands[2]}"
            assert question.question_string == expected_string
        else:
            pytest.fail(f"Unexpected number of operands: {len(question.operands)}")

    assert single_step_found, "No single-step questions were generated in the mixed set."
    # For multi-step, it's probabilistic. If this fails often, mocking random() might be needed.
    assert multi_step_found, "No multi-step questions were generated in the mixed set. Consider increasing iterations or mocking."


def test_direct_calculate_answer():
    # Test cases for _calculate_answer (assuming it's importable)
    assert _calculate_answer([10, 5, 3], ["+", "-"]) == 12  # (10 + 5) - 3 = 12
    assert _calculate_answer([20, 3, 2], ["-", "+"]) == 19  # (20 - 3) + 2 = 19
    assert _calculate_answer([7, 2, 4], ["+", "+"]) == 13   # (7 + 2) + 4 = 13
    assert _calculate_answer([100, 50, 25], ["-", "-"]) == 25 # (100 - 50) - 25 = 25
    assert _calculate_answer([5, 3], ["+"]) == 8
    assert _calculate_answer([5], []) == 5 # Single operand

    with pytest.raises(ValueError, match="Operands list cannot be empty"):
        _calculate_answer([], [])
    with pytest.raises(ValueError, match="Number of operations must be one less than operands"):
        _calculate_answer([5, 3], ["+", "-"])


def test_get_operation_symbol():
    assert _get_operation_symbol("addition") == "+"
    assert _get_operation_symbol("subtraction") == "-"
    with pytest.raises(ValueError):
        _get_operation_symbol("multiplication")


def test_generate_question_string():
    assert _generate_question_string([10, 5], ["+"]) == "10 + 5"
    assert _generate_question_string([10, 5, 3], ["+", "-"]) == "10 + 5 - 3"
    assert _generate_question_string([7], []) == "7"
    with pytest.raises(ValueError):
        _generate_question_string([7, 2], []) # Mismatched ops and operands


# Example of how one might mock if needed, e.g., to force multi-step:
# from unittest.mock import patch
# @patch('random.random', return_value=0.4) # Ensures multi-step if threshold is 0.5
# def test_force_multi_step_via_mocking(mock_random_val, base_session: PracticeSession, difficulty_level_mixed_ops: DifficultyLevel):
#     base_session.difficulty_level_details = difficulty_level_mixed_ops
#     base_session.difficulty_level_id = difficulty_level_mixed_ops.id
#     base_session.questions = []
#     # ... rest of the test for multi-step
#     question = generate_question_for_session(base_session)
#     assert len(question.operands) == 3

# This test is commented out as the primary approach is generation and filtering.

# To run these tests, one would typically use `pytest` from the root directory
# containing the `backend` folder, ensuring PYTHONPATH is set up correctly
# or that the project structure allows `app` to be discovered.
# For example:
# PYTHONPATH=. pytest backend/tests/test_practice_api.py
# (or simply `pytest` if conftest.py or pytest.ini handles paths)
