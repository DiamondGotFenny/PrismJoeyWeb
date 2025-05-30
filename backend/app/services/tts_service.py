import os
import io
import logging
from typing import Dict, Any
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
            for i, operand_row in enumerate(question.columnar_operands):
                digits = [str(d) if d is not None else "_" for d in operand_row]
                operand_strs.append("".join(digits))
            operand_description = f"第一个数是 {operand_strs[0]}"
            if len(operand_strs) > 1:
                operand_description += f"，第二个数是 {operand_strs[1]}"
        
        prompt = f"""你是一位温和耐心的小学数学老师，现在要通过语音帮助一个小朋友解决竖式计算题。请用亲切、简单易懂的中文为这道竖式题提供语音讲解。

竖式计算类型：{op_name}
计算内容：{operand_description}
运算符号：{question.columnar_operation}

请注意：
1. 这段文字将通过语音合成播放给小朋友听，所以要口语化、自然流畅
2. 重点讲解竖式计算的方法和步骤
3. 语调要温和鼓励，让孩子觉得数学很有趣
4. 强调"从右到左，一位一位算"的重要原则
5. 如果是加法，要提醒进位；如果是减法，要提醒借位
6. 用简单的语言解释为什么要这样对齐
7. 鼓励孩子仔细、耐心地完成每一步

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

# Create a singleton instance
tts_service = TTSService() 