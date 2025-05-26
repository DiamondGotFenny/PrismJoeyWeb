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
  operand1: number;
  operand2: number;
  operation: string;
  correct_answer: number;
  difficulty_level_id: number;
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
  user_answer: number;
  time_spent?: number;
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
