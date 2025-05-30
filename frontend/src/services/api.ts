import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1'; // Adjust if backend runs elsewhere

export interface DifficultyLevel {
  id: number;
  name: string;
  code: string;
  max_number: number;
  allow_carry: boolean;
  allow_borrow: boolean;
  operation_types: string[];
  order: number;
}

// Fetch difficulty levels
export const getDifficultyLevels = async (): Promise<DifficultyLevel[]> => {
  try {
    const response = await axios.get<DifficultyLevel[]>(
      `${API_BASE_URL}/difficulty/levels`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching difficulty levels:', error);
    throw error;
  }
};

// Placeholder for future API functions related to practice sessions
export interface Question {
  id: string; // UUID
  session_id: string; // UUID
  operands: number[];
  operations: string[];
  question_string: string;
  correct_answer: number;
  difficulty_level_id: number;
  question_type: string;
  columnar_operands?: (number | null)[][];
  columnar_result_placeholders?: (number | null)[];
  columnar_operation?: string;
  created_at: string; // ISO datetime string
  user_answer?: number;
  is_correct?: boolean;
  time_spent?: number; // seconds
  answered_at?: string; // ISO datetime string
}

export interface PracticeSession {
  id: string; // UUID
  user_id?: string;
  difficulty_level_id: number;
  total_questions_planned: number;
  questions: Question[];
  current_question_index: number;
  score: number;
  start_time: string; // ISO datetime string
  end_time?: string; // ISO datetime string
  difficulty_level_details?: DifficultyLevel;
}

export interface AnswerPayload {
  session_id: string; // UUID
  question_id: string; // UUID
  user_answer?: number; // For arithmetic
  time_spent?: number;
  user_filled_operands?: number[][]; // For columnar
  user_filled_result?: number[]; // For columnar
}

export const startPracticeSession = async (
  difficultyLevelId: number,
  totalQuestions: number = 10
): Promise<PracticeSession> => {
  try {
    const response = await axios.post<PracticeSession>(
      `${API_BASE_URL}/practice/start`,
      {
        difficulty_level_id: difficultyLevelId,
        total_questions: totalQuestions,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error starting practice session:', error);
    throw error;
  }
};

export const getNextQuestion = async (sessionId: string): Promise<Question> => {
  try {
    const response = await axios.get<Question>(
      `${API_BASE_URL}/practice/question?session_id=${sessionId}`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching next question:', error);
    throw error;
  }
};

export const submitAnswer = async (
  payload: AnswerPayload
): Promise<Question> => {
  try {
    const response = await axios.post<Question>(
      `${API_BASE_URL}/practice/answer`,
      payload
    );
    return response.data;
  } catch (error) {
    console.error('Error submitting answer:', error);
    throw error;
  }
};

export const getPracticeSummary = async (
  sessionId: string
): Promise<PracticeSession> => {
  try {
    const response = await axios.get<PracticeSession>(
      `${API_BASE_URL}/practice/summary?session_id=${sessionId}`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching practice summary:', error);
    throw error;
  }
};

// Help/Hint functionality
export interface HelpRequest {
  session_id: string;
  question_id: string;
}

export interface HelpResponse {
  help_content: string;
  thinking_process: string;
  solution_steps: string[];
}

export const getQuestionHelp = async (
  sessionId: string,
  questionId: string
): Promise<HelpResponse> => {
  try {
    const response = await axios.post<HelpResponse>(
      `${API_BASE_URL}/practice/help`,
      {
        session_id: sessionId,
        question_id: questionId,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching question help:', error);
    throw error;
  }
};

export const getQuestionVoiceHelp = async (
  sessionId: string,
  questionId: string
): Promise<Blob> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/practice/voice-help`,
      {
        session_id: sessionId,
        question_id: questionId,
      },
      {
        responseType: 'blob',
        headers: {
          Accept: 'audio/mpeg',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching voice help:', error);
    throw error;
  }
};
