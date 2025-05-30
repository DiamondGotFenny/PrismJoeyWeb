import os
import io
import logging
from typing import Dict, Any, AsyncGenerator, Generator
import azure.cognitiveservices.speech as speechsdk
from app.models.practice import Question
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)

class TTSService:
    """Service for converting text to speech using Azure Cognitive Services"""

    def __init__(self):
        self.speech_key = os.getenv("AZURE_SPEECH_KEY")
        self.speech_region = os.getenv("AZURE_SPEECH_REGION")
        
        if not self.speech_key or not self.speech_region:
            raise ValueError("Azure Speech credentials not found in environment variables")
        
        # Initialize Azure Speech SDK
        self.speech_config = speechsdk.SpeechConfig(
            subscription=self.speech_key, 
            region=self.speech_region
        )
        
        # Configure for Chinese voice
        # Using a natural sounding Chinese voice
        self.speech_config.speech_synthesis_voice_name = "zh-CN-XiaoxiaoNeural"
        
        # Set output format to audio/wav
        self.speech_config.set_speech_synthesis_output_format(
            speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
        )
        
        self.llm_service = LLMService()

    def generate_voice_help(self, question: Question) -> bytes:
        """
        Generate voice help for a given question
        
        Args:
            question: The Question object to generate voice help for
            
        Returns:
            Audio bytes in MP3 format
        """
        try:
            # Generate TTS-optimized help content using LLM
            help_text = self._generate_oral_help_content(question)
            
            # Convert text to speech
            audio_bytes = self._text_to_speech(help_text)
            
            return audio_bytes
            
        except Exception as e:
            logger.error(f"Error generating voice help: {e}")
            raise e

    def generate_voice_help_stream(self, question: Question) -> Generator[bytes, None, None]:
        """
        Generate voice help for a given question as an audio stream
        
        Args:
            question: The Question object to generate voice help for
            
        Yields:
            Audio bytes chunks in MP3 format as they are generated
        """
        try:
            # Generate TTS-optimized help content using LLM
            help_text = self._generate_oral_help_content(question)
            
            # Convert text to speech with streaming
            yield from self._text_to_speech_stream(help_text)
            
        except Exception as e:
            logger.error(f"Error generating voice help stream: {e}")
            raise e

    def generate_voice_help_stream_optimized(self, question: Question) -> Generator[bytes, None, None]:
        """
        Generate voice help with maximum optimization - starts TTS as soon as initial content is ready
        
        Args:
            question: The Question object to generate voice help for
            
        Yields:
            Audio bytes chunks in MP3 format as they are generated
        """
        try:
            # Generate immediate short intro while preparing full content
            quick_intro = self._generate_quick_intro(question)
            
            # Stream the quick intro first for immediate audio feedback
            logger.debug("Streaming quick intro for immediate feedback...")
            yield from self._text_to_speech_stream(quick_intro)
            
            # Generate full help content in parallel/after intro
            try:
                full_help_text = self._generate_oral_help_content(question)
                # Stream the full help content
                logger.debug("Streaming full help content...")
                yield from self._text_to_speech_stream(full_help_text)
            except Exception as e:
                logger.warning(f"Full content generation failed, using fallback: {e}")
                fallback_text = self._generate_fallback_oral_help(question)
                yield from self._text_to_speech_stream(fallback_text)
                
        except Exception as e:
            logger.error(f"Error generating optimized voice help stream: {e}")
            raise e

    def _generate_oral_help_content(self, question: Question) -> str:
        """Generate TTS-friendly Chinese help content using LLM"""
        
        try:
            if question.question_type == "columnar":
                return self._generate_oral_columnar_help(question)
            else:
                return self._generate_oral_arithmetic_help(question)
        except Exception as e:
            logger.error(f"Error generating oral help content with LLM: {e}")
            # Fallback to simple content if LLM fails
            return self._generate_fallback_oral_help(question)

    def _generate_oral_arithmetic_help(self, question: Question) -> str:
        """Generate oral help for arithmetic questions using LLM"""
        
        # Create operation description for the prompt
        operation_map = {
            '+': '加法',
            '-': '减法', 
            '*': '乘法',
            '×': '乘法',
            '/': '除法',
            '÷': '除法'
        }
        
        op_names = [operation_map.get(op, op) for op in question.operations]
        op_description = "、".join(op_names) if len(op_names) > 1 else op_names[0] if op_names else "计算"
        
        prompt = f"""你是一位温和耐心的小学数学老师，现在要通过语音帮助一个小朋友解决数学题。请用亲切、简单易懂的中文为这道题提供语音讲解。

题目：{question.question_string} = ?
正确答案：{question.correct_answer}
运算类型：{op_description}

请注意：
1. 这段文字将通过语音合成播放给小朋友听，所以要口语化、自然流畅
2. 用简单易懂的语言，就像面对面教小朋友一样
3. 语调要温和鼓励，不要让孩子感到压力
4. 提供具体的计算步骤，但要简洁明了
5. 可以用一些生动的比喻或例子帮助理解
6. 最后给出正确答案并鼓励孩子

请直接输出语音讲解内容，不要包含任何格式标记："""

        try:
            response = self.llm_service.client.chat.completions.create(
                model=self.llm_service.model,
                messages=[
                    {"role": "system", "content": "你是一位专业的小学数学老师，擅长用温和耐心的方式教导孩子数学。你的回答将通过语音播放，所以要特别注意口语化表达。"},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.7
            )
            
            content = response.choices[0].message.content.strip()
            
            # Ensure the content is suitable for TTS
            if len(content) < 20:  # Too short, might be an error
                return self._generate_fallback_oral_help(question)
                
            return content
            
        except Exception as e:
            logger.error(f"Error calling LLM for arithmetic oral help: {e}")
            return self._generate_fallback_oral_help(question)

    def _generate_oral_columnar_help(self, question: Question) -> str:
        """Generate oral help for columnar questions using LLM"""
        
        operation_map = {
            '+': '加法',
            '-': '减法', 
            '*': '乘法',
            '×': '乘法'
        }
        
        op_name = operation_map.get(question.columnar_operation, '竖式计算')
        
        # Build a description of the columnar layout for the LLM
        operand_description = "未知"
        if question.columnar_operands:
            operand_strs = []
            operand_descriptions = []
            for i, operand_row in enumerate(question.columnar_operands):
                digits = [str(d) if d is not None else "_" for d in operand_row]
                operand_str = "".join(digits)
                operand_strs.append(operand_str)
                
                # Count blanks in this operand
                blank_count = sum(1 for d in operand_row if d is None)
                if blank_count > 0:
                    operand_descriptions.append(f"{operand_str}（有{blank_count}个空格）")
                else:
                    operand_descriptions.append(operand_str)
            
            operand_description = f"第一个数是 {operand_descriptions[0]}"
            if len(operand_descriptions) > 1:
                operand_description += f"，第二个数是 {operand_descriptions[1]}"
            
            # Include the result row with placeholders - this is crucial for understanding the complete question
            if question.columnar_result_placeholders:
                result_digits = [str(d) if d is not None else "_" for d in question.columnar_result_placeholders]
                result_str = "".join(result_digits)
                operand_description += f"，答案行是 {result_str}"
                
                # Count how many blanks need to be filled
                blank_count = sum(1 for d in question.columnar_result_placeholders if d is None)
                if blank_count > 0:
                    operand_description += f"（其中有{blank_count}个空格需要填写）"
        
        prompt = f"""你是一位温和耐心的小学数学老师，现在要通过语音帮助一个小朋友解决竖式计算题。请用亲切、简单易懂的中文为这道竖式题提供语音讲解。

竖式计算类型：{op_name}
计算内容：{operand_description}
运算符号：{question.columnar_operation}

请注意：
1. 这段文字将通过语音合成播放给小朋友听，所以要口语化、自然流畅
2. 重点讲解竖式计算的方法和步骤，帮助孩子理解如何填写所有的空格
3. 语调要温和鼓励，让孩子觉得数学很有趣
4. 强调"从右到左，一位一位算"的重要原则
5. 如果是加法，要提醒进位；如果是减法，要提醒借位
6. 用简单的语言解释为什么要这样对齐
7. 要指导孩子如何推理出每个空格的数字，包括操作数中的空格和答案中的空格。
8. 注意，有时候填什么数字才能让竖式成立，答案是有几个可能，要提示孩子多思考各种可能。
9. 鼓励孩子仔细、耐心地完成每一步

请直接输出语音讲解内容，不要包含任何格式标记："""

        try:
            response = self.llm_service.client.chat.completions.create(
                model=self.llm_service.model,
                messages=[
                    {"role": "system", "content": "你是一位专业的小学数学老师，特别擅长教竖式计算。你的回答将通过语音播放，所以要特别注意口语化表达，就像面对面教孩子一样温和耐心。"},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=600,
                temperature=0.7
            )
            
            content = response.choices[0].message.content.strip()
            
            # Ensure the content is suitable for TTS
            if len(content) < 30:  # Too short, might be an error
                return self._generate_fallback_oral_help(question)
                
            return content
            
        except Exception as e:
            logger.error(f"Error calling LLM for columnar oral help: {e}")
            return self._generate_fallback_oral_help(question)

    def _generate_fallback_oral_help(self, question: Question) -> str:
        """Generate simple fallback help when LLM is not available"""
        
        if question.question_type == "columnar":
            operation_map = {
                '+': '加法',
                '-': '减法', 
                '*': '乘法',
                '×': '乘法'
            }
            op_name = operation_map.get(question.columnar_operation, '竖式计算')
            
            return f"""小朋友，这是一道{op_name}竖式计算题。
            
竖式计算要记住一个重要的方法：从右到左，一位一位地计算。

首先，把数字按照个位、十位、百位对齐写好。然后从个位开始计算。

{f"加法要注意，如果个位相加超过9，要向十位进1。" if question.columnar_operation == "+" else ""}
{f"减法要注意，如果不够减，要从前一位借1当10来减。" if question.columnar_operation == "-" else ""}

慢慢来，一步一步算，你一定可以做对的！加油！"""

        else:
            # Arithmetic fallback
            operation_map = {
                '+': '加法',
                '-': '减法', 
                '*': '乘法',
                '×': '乘法',
                '/': '除法',
                '÷': '除法'
            }
            
            if question.operands and question.operations:
                op_name = operation_map.get(question.operations[0], '计算')
                first_num = question.operands[0] if len(question.operands) > 0 else 0
                second_num = question.operands[1] if len(question.operands) > 1 else 0
                
                return f"""小朋友，这是一道{op_name}题目。

题目是：{question.question_string}

我们来一步步计算：{first_num} {question.operations[0]} {second_num}

你可以慢慢算，不用着急。算完后记得检查一下答案对不对。

相信你一定能算出正确答案的！加油！"""
            else:
                return "小朋友，这是一道数学计算题。请仔细观察数字，一步步进行计算。你一定可以做对的，加油！"

    def _text_to_speech(self, text: str) -> bytes:
        """Convert text to speech using Azure TTS"""
        
        try:
            # Create a synthesizer
            synthesizer = speechsdk.SpeechSynthesizer(speech_config=self.speech_config, audio_config=None)
            
            # Synthesize speech
            result = synthesizer.speak_text_async(text).get()
            
            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                # Return the audio data
                return result.audio_data
            elif result.reason == speechsdk.ResultReason.Canceled:
                cancellation_details = result.cancellation_details
                logger.error(f"Speech synthesis canceled: {cancellation_details.reason}")
                if cancellation_details.reason == speechsdk.CancellationReason.Error:
                    logger.error(f"Error details: {cancellation_details.error_details}")
                raise Exception("Speech synthesis was canceled")
            else:
                raise Exception("Speech synthesis failed")
                
        except Exception as e:
            logger.error(f"Error in text-to-speech conversion: {e}")
            raise e

    def _text_to_speech_stream(self, text: str) -> Generator[bytes, None, None]:
        """Convert text to speech using Azure TTS with AudioDataStream for optimal streaming"""
        
        try:
            # Create a synthesizer with no audio output config (we'll handle the data manually)
            synthesizer = speechsdk.SpeechSynthesizer(speech_config=self.speech_config, audio_config=None)
            
            # Start speaking asynchronously - this is key for streaming
            logger.debug("Starting async speech synthesis for streaming...")
            result = synthesizer.start_speaking_text_async(text).get()
            
            if result.reason == speechsdk.ResultReason.Canceled:
                cancellation_details = result.cancellation_details
                logger.error(f"Speech synthesis was canceled: {cancellation_details.reason}")
                if cancellation_details.reason == speechsdk.CancellationReason.Error:
                    error_details = cancellation_details.error_details
                    logger.error(f"Error details: {error_details}")
                    raise Exception(f"TTS Error: {error_details}")
                else:
                    raise Exception("Speech synthesis was canceled")
            
            # Create AudioDataStream for efficient chunk reading
            audio_data_stream = speechsdk.AudioDataStream(result)
            
            # Buffer size - 16KB chunks work well for streaming
            buffer_size = 16000
            audio_buffer = bytes(buffer_size)
            
            logger.debug("Starting to read audio chunks from stream...")
            chunk_count = 0
            total_bytes = 0
            
            # Read chunks until stream is exhausted
            while True:
                filled_size = audio_data_stream.read_data(audio_buffer)
                
                if filled_size == 0:
                    # No more data available
                    logger.debug(f"Stream ended. Total chunks: {chunk_count}, Total bytes: {total_bytes}")
                    break
                
                # Yield the actual data (not the full buffer)
                chunk = audio_buffer[:filled_size]
                chunk_count += 1
                total_bytes += filled_size
                
                logger.debug(f"Yielding chunk {chunk_count}: {filled_size} bytes")
                yield chunk
            
            logger.debug("Audio streaming completed successfully")
                
        except Exception as e:
            logger.error(f"Error in streaming text-to-speech conversion: {e}")
            raise e

    def _generate_quick_intro(self, question: Question) -> str:
        """Generate a quick introduction that can be spoken immediately while preparing full content"""
        
        if question.question_type == "columnar":
            operation_map = {
                '+': '加法',
                '-': '减法', 
                '*': '乘法',
                '×': '乘法'
            }
            op_name = operation_map.get(question.columnar_operation, '竖式计算')
            return f"小朋友，我来帮你解决这道{op_name}竖式计算题。让我们一步步来看。"
        else:
            # For arithmetic questions
            operation_map = {
                '+': '加法',
                '-': '减法', 
                '*': '乘法',
                '×': '乘法',
                '/': '除法',
                '÷': '除法'
            }
            
            if question.operations:
                op_name = operation_map.get(question.operations[0], '计算')
                return f"小朋友，这是一道{op_name}题。题目是{question.question_string}。我来教你怎么算。"
            else:
                return f"小朋友，我来帮你解决这道计算题。让我们仔细看看。"

# Create a singleton instance
tts_service = TTSService() 