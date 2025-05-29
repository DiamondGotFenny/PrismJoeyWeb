#!/usr/bin/env python3
"""
Test script for LLM service integration
"""
import os
import sys
from uuid import uuid4
from dotenv import load_dotenv

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

# Load environment variables
load_dotenv()

from app.models.practice import Question
from app.services.llm_service import llm_service

def test_arithmetic_question():
    """Test LLM service with an arithmetic question"""
    print("Testing arithmetic question...")
    
    question = Question(
        session_id=uuid4(),
        operands=[15, 7],
        operations=["+"],
        question_string="15 + 7",
        correct_answer=22,
        difficulty_level_id=1,
        question_type="arithmetic"
    )
    
    try:
        response = llm_service.generate_help_response(question)
        print(f"Help Content: {response['help_content']}")
        print(f"Thinking Process: {response['thinking_process']}")
        print(f"Solution Steps: {response['solution_steps']}")
        print("✅ Arithmetic test passed!")
        return True
    except Exception as e:
        print(f"❌ Arithmetic test failed: {e}")
        return False

def test_columnar_question():
    """Test LLM service with a columnar question"""
    print("\nTesting columnar question...")
    
    question = Question(
        session_id=uuid4(),
        operands=[23, 15],
        operations=["+"],
        question_string="2? + 1? = 38",
        correct_answer=None,
        difficulty_level_id=1,
        question_type="columnar",
        columnar_operands=[[2, None], [1, None]],
        columnar_result_placeholders=[3, 8],
        columnar_operation="+"
    )
    
    try:
        response = llm_service.generate_help_response(question)
        print(f"Help Content: {response['help_content']}")
        print(f"Thinking Process: {response['thinking_process']}")
        print(f"Solution Steps: {response['solution_steps']}")
        print("✅ Columnar test passed!")
        return True
    except Exception as e:
        print(f"❌ Columnar test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing LLM Service Integration")
    print("=" * 50)
    
    # Check environment variables
    if not os.getenv("QWEN_API_KEY"):
        print("❌ QWEN_API_KEY not found in environment variables")
        return
    
    print(f"Using API Base URL: {os.getenv('QWEN_BASE_URL')}")
    print(f"Using Model: {os.getenv('QWEN_MODEL', 'qwen-turbo')}")
    print()
    
    # Run tests
    arithmetic_passed = test_arithmetic_question()
    columnar_passed = test_columnar_question()
    
    print("\n" + "=" * 50)
    if arithmetic_passed and columnar_passed:
        print("🎉 All tests passed! LLM integration is working correctly.")
    else:
        print("⚠️  Some tests failed. Please check the configuration.")

if __name__ == "__main__":
    main() 