import os
from typing import List, Dict, Any
from openai import OpenAI
from app.models.practice import Question
import logging
from dotenv import load_dotenv, find_dotenv

_ = load_dotenv(find_dotenv())
logger = logging.getLogger(__name__)

api_base = os.getenv("QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
api_key = os.getenv("QWEN_API_KEY")

class LLMService:
    """Service for generating AI-powered help responses for math questions"""
    
    def __init__(self):
        self.client = OpenAI(
            api_key=api_key,
            base_url=api_base
        )
        self.model = os.getenv("QWEN_MODEL", "qwen-turbo")
        
    def generate_help_response(self, question: Question) -> Dict[str, Any]:
        """
        Generate structured help response for a given question
        
        Args:
            question: The Question object to generate help for
            
        Returns:
            Dict containing help_content, thinking_process, and solution_steps
        """
        try:
            if question.question_type == "columnar":
                return self._generate_columnar_help(question)
            else:
                return self._generate_arithmetic_help(question)
        except Exception as e:
            logger.error(f"Error generating LLM help response: {e}")
            # Fallback to mock responses if LLM fails
            return self._generate_fallback_response(question)
    
    def _generate_arithmetic_help(self, question: Question) -> Dict[str, Any]:
        """Generate help for arithmetic questions"""
        prompt = self._build_arithmetic_prompt(question)
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "你是一个专门为小学生提供数学帮助的AI助手。你的回答要简单易懂，适合小学生理解。请严格按照要求的格式回答。"
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=800
            )
            
            content = response.choices[0].message.content
            return self._parse_response(content)
            
        except Exception as e:
            logger.error(f"OpenAI API error for arithmetic question: {e}")
            raise
    
    def _generate_columnar_help(self, question: Question) -> Dict[str, Any]:
        """Generate help for columnar questions"""
        prompt = self._build_columnar_prompt(question)
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "你是一个专门为小学生提供数学帮助的AI助手。你擅长解释竖式计算。你的回答要简单易懂，适合小学生理解。请严格按照要求的格式回答。"
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=800
            )
            
            content = response.choices[0].message.content
            return self._parse_response(content)
            
        except Exception as e:
            logger.error(f"OpenAI API error for columnar question: {e}")
            raise
    
    def _build_arithmetic_prompt(self, question: Question) -> str:
        """Build prompt for arithmetic questions"""
        operations_map = {"+": "加法", "-": "减法", "*": "乘法", "/": "除法"}
        op_names = [operations_map.get(op, op) for op in question.operations]
        
        return f"""
为小学生解释这道数学题：{question.question_string}

请按以下格式回答：
题目分析：[简单分析题目类型和要求，1-2句话]
思考过程：[解题思路，用简单的语言解释，2-3句话]
解题步骤：[具体步骤，用数字列表，每步一句话]

要求：
1. 语言要简单易懂，适合小学生
2. 不要使用复杂的数学术语
3. 解题步骤要清晰明确
4. 每个步骤都要有具体的计算过程
"""

    def _build_columnar_prompt(self, question: Question) -> str:
        """Build prompt for columnar questions"""
        operation = question.columnar_operation or "+"
        op_name = "加法" if operation == "+" else "减法"
        
        # Extract the numbers from operands for context
        operands_info = ""
        if question.operands and len(question.operands) >= 2:
            operands_info = f"涉及的数字是 {question.operands[0]} 和 {question.operands[1]}"
        
        return f"""
为小学生解释这道竖式{op_name}题：{question.question_string}
{operands_info}

请按以下格式回答：
题目分析：[简单分析这是什么类型的竖式计算，1-2句话]
思考过程：[解释竖式{op_name}的基本方法和注意事项，2-3句话]
解题步骤：[具体的竖式计算步骤，用数字列表，每步一句话]

要求：
1. 语言要简单易懂，适合小学生
2. 重点解释竖式计算的方法
3. 如果涉及进位或借位，要特别说明
4. 每个步骤都要清楚明确
"""

    def _parse_response(self, content: str) -> Dict[str, Any]:
        """Parse the LLM response into structured format"""
        try:
            lines = content.strip().split('\n')
            help_content = ""
            thinking_process = ""
            solution_steps = []
            
            current_section = None
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                    
                if line.startswith("题目分析："):
                    current_section = "help"
                    help_content = line.replace("题目分析：", "").strip()
                elif line.startswith("思考过程："):
                    current_section = "thinking"
                    thinking_process = line.replace("思考过程：", "").strip()
                elif line.startswith("解题步骤："):
                    current_section = "steps"
                    step_content = line.replace("解题步骤：", "").strip()
                    if step_content:
                        solution_steps.append(step_content)
                elif current_section == "help" and not line.startswith(("思考过程：", "解题步骤：")):
                    help_content += " " + line
                elif current_section == "thinking" and not line.startswith(("题目分析：", "解题步骤：")):
                    thinking_process += " " + line
                elif current_section == "steps":
                    # Handle numbered steps
                    if line and not line.startswith(("题目分析：", "思考过程：")):
                        solution_steps.append(line)
            
            # Clean up and validate
            help_content = help_content.strip()
            thinking_process = thinking_process.strip()
            
            # Ensure we have content for all sections
            if not help_content:
                help_content = "让我来帮你分析这道题目。"
            if not thinking_process:
                thinking_process = "我们需要仔细思考解题的方法。"
            if not solution_steps:
                solution_steps = ["按照基本的计算方法来解决这道题。"]
            
            return {
                "help_content": help_content,
                "thinking_process": thinking_process,
                "solution_steps": solution_steps
            }
            
        except Exception as e:
            logger.error(f"Error parsing LLM response: {e}")
            # Return a basic fallback structure
            return {
                "help_content": "让我来帮你分析这道题目。",
                "thinking_process": "我们需要仔细思考解题的方法。",
                "solution_steps": ["按照基本的计算方法来解决这道题。"]
            }
    
    def _generate_fallback_response(self, question: Question) -> Dict[str, Any]:
        """Generate fallback response when LLM fails"""
        if question.question_type == "columnar":
            operation = question.columnar_operation or "+"
            op_name = "加法" if operation == "+" else "减法"
            return {
                "help_content": f"这是一个{op_name}竖式计算题。让我来帮你分析一下解题思路！",
                "thinking_process": f"竖式{op_name}的关键是从右到左逐位计算。",
                "solution_steps": [
                    "第一步：将数字按位对齐写成竖式",
                    "第二步：从个位开始，逐位计算",
                    "第三步：注意进位或借位",
                    "第四步：得出最终答案"
                ]
            }
        else:
            return {
                "help_content": f"这是一个{question.question_string}的计算题。让我来帮你分析一下解题思路！",
                "thinking_process": "我们需要按照运算顺序来计算这道题。",
                "solution_steps": [
                    "第一步：识别运算类型",
                    "第二步：按顺序计算",
                    "第三步：得出答案"
                ]
            }

# Global instance
llm_service = LLMService() 