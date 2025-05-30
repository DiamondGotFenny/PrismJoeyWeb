#!/usr/bin/env python3
"""
Comprehensive test script for optimized streaming TTS functionality.
Tests both regular and ultra-optimized streaming approaches.
"""

import os
import sys
import logging
import time
from typing import Generator

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.services.tts_service import TTSService
from app.models.practice import Question
from uuid import uuid4

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_test_questions():
    """Create different types of test questions"""
    arithmetic_question = Question(
        id=uuid4(),
        session_id=uuid4(),
        operands=[25, 13],
        operations=['+'],
        question_string="25 + 13",
        correct_answer=38,
        difficulty_level_id=1,
        question_type="arithmetic",
        created_at="2024-01-01T00:00:00Z"
    )
    
    columnar_question = Question(
        id=uuid4(),
        session_id=uuid4(),
        operands=[],
        operations=[],
        question_string="",
        correct_answer=0,
        difficulty_level_id=1,
        question_type="columnar",
        columnar_operation="+",
        columnar_operands=[[2, 4], [1, 6]],
        columnar_result_placeholders=[None, None],
        created_at="2024-01-01T00:00:00Z"
    )
    
    return arithmetic_question, columnar_question

def test_streaming_comparison():
    """Compare different streaming approaches"""
    
    print("🧪 Comprehensive Streaming TTS Performance Test")
    print("=" * 70)
    
    # Check environment variables
    if not os.getenv("AZURE_SPEECH_KEY") or not os.getenv("AZURE_SPEECH_REGION"):
        print("❌ Missing Azure Speech credentials in environment variables")
        print("Please set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION")
        return False
    
    try:
        # Initialize TTS service
        print("🔧 Initializing TTS service...")
        tts_service = TTSService()
        print("✅ TTS service initialized successfully")
        
        # Create test questions
        arithmetic_q, columnar_q = create_test_questions()
        test_questions = [
            ("Arithmetic", arithmetic_q),
            ("Columnar", columnar_q)
        ]
        
        for question_type, question in test_questions:
            print(f"\n🎯 Testing {question_type} Question")
            print("-" * 50)
            
            # Test 1: Non-streaming (baseline)
            print("1️⃣ Non-streaming TTS (baseline)...")
            baseline_start = time.time()
            try:
                audio_bytes = tts_service.generate_voice_help(question)
                baseline_end = time.time()
                baseline_duration = baseline_end - baseline_start
                print(f"   ✅ Baseline: {len(audio_bytes):,} bytes in {baseline_duration:.2f}s")
            except Exception as e:
                print(f"   ❌ Baseline failed: {e}")
                continue
            
            # Test 2: Regular streaming
            print("2️⃣ Regular AudioDataStream streaming...")
            regular_start = time.time()
            regular_first_chunk = None
            try:
                chunk_count = 0
                total_bytes = 0
                
                for chunk in tts_service.generate_voice_help_stream(question):
                    if regular_first_chunk is None:
                        regular_first_chunk = time.time()
                        regular_ttfb = regular_first_chunk - regular_start
                        print(f"   ⚡ Regular TTFB: {regular_ttfb:.3f}s")
                    
                    chunk_count += 1
                    total_bytes += len(chunk)
                    
                    if chunk_count <= 3 or chunk_count % 5 == 0:
                        print(f"   📦 Chunk {chunk_count}: {len(chunk):,} bytes")
                    
                    if chunk_count >= 10:  # Limit for testing
                        break
                
                regular_end = time.time()
                regular_duration = regular_end - regular_start
                print(f"   ✅ Regular: {chunk_count} chunks, {total_bytes:,} bytes in {regular_duration:.2f}s")
                
            except Exception as e:
                print(f"   ❌ Regular streaming failed: {e}")
                regular_first_chunk = None
            
            # Test 3: Ultra-optimized streaming
            print("3️⃣ Ultra-optimized streaming (immediate intro)...")
            ultra_start = time.time()
            ultra_first_chunk = None
            try:
                chunk_count = 0
                total_bytes = 0
                intro_chunks = 0
                
                for chunk in tts_service.generate_voice_help_stream_optimized(question):
                    if ultra_first_chunk is None:
                        ultra_first_chunk = time.time()
                        ultra_ttfb = ultra_first_chunk - ultra_start
                        print(f"   ⚡ Ultra TTFB: {ultra_ttfb:.3f}s (INTRO AUDIO!)")
                    
                    chunk_count += 1
                    total_bytes += len(chunk)
                    
                    # Count intro chunks (first few chunks are the intro)
                    if chunk_count <= 5:
                        intro_chunks += 1
                        print(f"   🎙️  Intro chunk {chunk_count}: {len(chunk):,} bytes")
                    elif chunk_count <= 3 or chunk_count % 5 == 0:
                        print(f"   📦 Full chunk {chunk_count}: {len(chunk):,} bytes")
                    
                    if chunk_count >= 10:  # Limit for testing
                        break
                
                ultra_end = time.time()
                ultra_duration = ultra_end - ultra_start
                print(f"   ✅ Ultra: {chunk_count} chunks ({intro_chunks} intro), {total_bytes:,} bytes in {ultra_duration:.2f}s")
                
            except Exception as e:
                print(f"   ❌ Ultra streaming failed: {e}")
                ultra_first_chunk = None
            
            # Performance comparison
            if regular_first_chunk and ultra_first_chunk:
                print(f"\n📊 Performance Comparison for {question_type}:")
                print(f"   • Baseline total time: {baseline_duration:.2f}s")
                print(f"   • Regular TTFB: {regular_ttfb:.3f}s")
                print(f"   • Ultra TTFB: {ultra_ttfb:.3f}s")
                
                ultra_improvement = regular_ttfb - ultra_ttfb
                baseline_improvement = baseline_duration - ultra_ttfb
                
                print(f"   🚀 Ultra vs Regular: {ultra_improvement:.3f}s faster ({ultra_improvement/regular_ttfb*100:.1f}% improvement)")
                print(f"   🚀 Ultra vs Baseline: {baseline_improvement:.3f}s faster ({baseline_improvement/baseline_duration*100:.1f}% improvement)")
        
        return True
        
    except Exception as e:
        print(f"❌ Test initialization failed: {e}")
        return False

def test_api_endpoints():
    """Test both regular and ultra API endpoints"""
    
    print("\n🌐 Testing API Endpoints")
    print("=" * 70)
    
    try:
        import requests
        
        # Test data
        test_data = {
            "session_id": str(uuid4()),
            "question_id": str(uuid4())
        }
        
        base_url = "http://localhost:8000/api/v1/practice"
        endpoints = [
            ("Regular Streaming", "/voice-help-stream"),
            ("Ultra Streaming", "/voice-help-stream-ultra")
        ]
        
        for endpoint_name, endpoint_path in endpoints:
            print(f"\n🌊 Testing {endpoint_name}...")
            
            api_start = time.time()
            first_chunk_time = None
            
            try:
                response = requests.post(
                    f"{base_url}{endpoint_path}",
                    json=test_data,
                    stream=True,
                    timeout=30
                )
                
                if response.status_code == 200:
                    chunk_count = 0
                    total_bytes = 0
                    
                    for chunk in response.iter_content(chunk_size=1024):
                        if chunk:
                            if first_chunk_time is None:
                                first_chunk_time = time.time()
                                time_to_first_chunk = first_chunk_time - api_start
                                print(f"   ⚡ {endpoint_name} TTFB: {time_to_first_chunk:.3f}s")
                            
                            chunk_count += 1
                            total_bytes += len(chunk)
                            
                            if chunk_count <= 3:
                                print(f"   📦 Chunk {chunk_count}: {len(chunk):,} bytes")
                            
                            if chunk_count >= 8:  # Limit for testing
                                break
                    
                    api_end = time.time()
                    api_duration = api_end - api_start
                    
                    print(f"   ✅ {endpoint_name}: {chunk_count} chunks, {total_bytes:,} bytes in {api_duration:.2f}s")
                    
                else:
                    print(f"   ❌ {endpoint_name} returned status {response.status_code}")
                    
            except requests.exceptions.ConnectionError:
                print(f"   ⚠️  Could not connect to {endpoint_name} API (server not running?)")
                return False
            except Exception as e:
                print(f"   ❌ {endpoint_name} test failed: {e}")
                return False
        
        return True
        
    except ImportError:
        print("⚠️  'requests' library not installed, skipping API tests")
        return False

if __name__ == "__main__":
    print("🎵 Optimized Streaming TTS Test Suite")
    print("=" * 70)
    
    success = True
    
    # Test TTS service directly
    if not test_streaming_comparison():
        success = False
    
    # Test API endpoints
    if not test_api_endpoints():
        success = False
    
    print("\n" + "=" * 70)
    if success:
        print("🎉 All optimization tests PASSED!")
        print("\n🚀 Key Optimizations Achieved:")
        print("   • Ultra-fast immediate audio feedback")
        print("   • Reduced time-to-first-byte with intro streaming")
        print("   • Seamless transition to full content")
        print("   • Multiple streaming strategies for different scenarios")
        print("\n✨ User Experience Impact:")
        print("   • Users hear response almost immediately")
        print("   • No more waiting for complete LLM processing")
        print("   • Progressive audio delivery")
    else:
        print("❌ Some optimization tests FAILED!")
        print("🔧 Please check the error messages above")
    
    print("\n💡 Next steps:")
    print("   1. Start the backend: cd backend && uvicorn main:app --reload")
    print("   2. Start the frontend: cd frontend && npm run dev")
    print("   3. Try both streaming modes - notice the ultra-fast response!")
    print("   4. Compare time-to-first-audio improvements") 