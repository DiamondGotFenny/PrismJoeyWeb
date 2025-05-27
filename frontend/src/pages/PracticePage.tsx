import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { PracticeSession, Question, AnswerPayload } from '../services/api';
import {
  startPracticeSession,
  getNextQuestion,
  submitAnswer,
  getPracticeSummary,
} from '../services/api';
import NumericKeypad from '../components/NumericKeypad';
import FeedbackDisplay from '../components/FeedbackDisplay';
import ColumnarCalculation from '../components/ColumnarCalculation'; // Import ColumnarCalculation
import '../styles/PracticePage.css';

const PracticePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  // State for columnar answer parts
  const [columnarResultDigits, setColumnarResultDigits] = useState<
    (number | null)[] | null
  >(null);
  const [columnarOperandDigits, setColumnarOperandDigits] = useState<
    (number | null)[][] | null
  >(null);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean | null;
    message: string;
    correctAnswer?: number;
    show: boolean;
  }>({ isCorrect: null, message: '', correctAnswer: undefined, show: false });

  const [score, setScore] = useState<number>(0);
  const [questionNumber, setQuestionNumber] = useState<number>(0);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSessionOver, setIsSessionOver] = useState<boolean>(false);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [questionAnimationKey, setQuestionAnimationKey] = useState<number>(0); // For animation trigger
  const [sessionDataForSummary, setSessionDataForSummary] =
    useState<PracticeSession | null>(null);

  const difficultyLevelIdFromState = location.state
    ?.difficultyLevelId as number;
  const difficultyNameFromState = location.state?.difficultyName as string; // Optional: for display

  const handleStartSession = useCallback(async () => {
    if (!difficultyLevelIdFromState) {
      setError('未选择难度级别。请返回并选择一个难度。');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // Assuming totalQuestions can be part of location.state or default to 10
      const plannedQuestions = location.state?.totalQuestions || 10;
      const sessionData = await startPracticeSession(
        difficultyLevelIdFromState,
        plannedQuestions
      );
      setSessionId(sessionData.id);
      setTotalQuestions(sessionData.total_questions_planned);
      setScore(sessionData.score); // Should be 0 initially
      // Fetch the first question
      const firstQuestion = await getNextQuestion(sessionData.id);
      setCurrentQuestion(firstQuestion);
      setQuestionAnimationKey((prevKey) => prevKey + 1); // Trigger animation
      setQuestionNumber(1); // Start with question 1
      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error starting session or fetching first question:', err);
      setError('开始练习或获取题目失败，请稍后再试。');
      setIsLoading(false);
    }
  }, [difficultyLevelIdFromState, location.state]);

  useEffect(() => {
    handleStartSession();
  }, [handleStartSession]);

  const handleKeypadDigit = (digit: string) => {
    if (currentAnswer.length < 5) {
      // Limit answer length
      setCurrentAnswer((prev) => prev + digit);
    }
  };

  const handleKeypadClear = () => {
    setCurrentAnswer('');
  };

  const handleSubmitAnswer = async () => {
    if (!sessionId || !currentQuestion || currentAnswer === '') return;
    setIsLoading(true); // For submission
    setIsAnswerSubmitted(true); // Disable keypad, show next button

    try {
      const answerNum = parseInt(currentAnswer, 10);
      const payload: AnswerPayload = {
        session_id: sessionId,
        question_id: currentQuestion.id,
        user_answer: answerNum,
        // time_spent: /* Implement timer if needed */,
      };
      const resultQuestion = await submitAnswer(payload);

      setFeedback({
        isCorrect: resultQuestion.is_correct ?? false,
        message: resultQuestion.is_correct ? '答对了！🎉' : '再想想哦 🤔',
        correctAnswer: resultQuestion.is_correct
          ? undefined
          : resultQuestion.correct_answer,
        show: true,
      });

      if (resultQuestion.is_correct) {
        setScore((prev) => prev + 1);
      }
      setCurrentQuestion(resultQuestion); // Update question with answer details
      setIsLoading(false);

      // Check if this was the last question
      if (questionNumber >= totalQuestions) {
        setIsSessionOver(true);
        // Fetch summary data
        if (sessionId) {
          // ensure sessionId is available
          const summaryData = await getPracticeSummary(sessionId);
          setSessionDataForSummary(summaryData);
        }
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
      setError('提交答案失败，请检查网络连接。');
      setFeedback({ isCorrect: null, message: '提交失败!', show: true });
      setIsLoading(false);
    }
  };

  const handleNextQuestion = async () => {
    if (!sessionId || isSessionOver) return;

    // Hide old feedback immediately
    setFeedback((prev) => ({ ...prev, show: false }));

    // If it was the last question, based on the counter
    if (questionNumber >= totalQuestions && sessionId) {
      // Ensure sessionId is present
      setIsSessionOver(true);
      setIsLoading(true); // Show loading while fetching summary
      try {
        const summaryData = await getPracticeSummary(sessionId);
        setSessionDataForSummary(summaryData);
        setIsLoading(false);
      } catch (summaryError) {
        console.error('Error fetching summary data:', summaryError);
        setError('无法加载练习总结。');
        setIsLoading(false);
      }
      return; // Stop further execution as session is over
    }

    setIsLoading(true);
    setCurrentAnswer('');
    setIsAnswerSubmitted(false); // Re-enable keypad

    try {
      const nextQ = await getNextQuestion(sessionId);
      setCurrentQuestion(nextQ);
      setQuestionAnimationKey((prevKey) => prevKey + 1); // Trigger animation
      setQuestionNumber((prev) => prev + 1);
      setError(null);
    } catch (err) {
      console.error('Error fetching next question:', err);
      // If error is because session is over (e.g., backend says no more questions)      // Define a type guard for the error response
      const isAxiosError = (
        error: unknown
      ): error is { response?: { data?: { detail?: string } } } => {
        return (
          typeof error === 'object' && error !== null && 'response' in error
        );
      };

      if (
        isAxiosError(err) &&
        err.response?.data?.detail?.includes(
          'All planned questions have been answered'
        )
      ) {
        setIsSessionOver(true);
        navigate('/summary', { state: { sessionId: sessionId } });
      } else {
        setError('获取下一题失败。');
      }
    } finally {
      setIsLoading(false);
      // Ensure feedback is hidden if it wasn't already by a state update
      setFeedback({
        isCorrect: null,
        message: '',
        correctAnswer: undefined,
        show: false,
      });
    }
  };

  const handleExitPractice = () => {
    // Optional: Call an API to invalidate session if needed
    navigate('/difficulty-selection');
  };

  if (!difficultyLevelIdFromState) {
    return (
      <div className="practice-container error-container">
        <h1>错误</h1>
        <p>未指定练习难度。请返回并选择一个难度级别。</p>
        <button
          onClick={() => navigate('/difficulty-selection')}
          className="control-button button-interactive"
        >
          选择难度
        </button>
      </div>
    );
  }
  if (isLoading && !currentQuestion && !isSessionOver)
    return <div className="loading-message">正在准备练习...</div>; // Initial load, not for summary loading
  if (error && !isSessionOver)
    return (
      <div className="error-message">
        {error}{' '}
        <button
          onClick={handleExitPractice}
          className="control-button button-interactive"
        >
          退出练习
        </button>
      </div>
    ); // Error during practice

  const handlePracticeAgain = () => {
    // Reset state for a new session with the same difficulty
    setIsSessionOver(false);
    setSessionDataForSummary(null);
    setCurrentAnswer('');
    setFeedback({
      isCorrect: null,
      message: '',
      correctAnswer: undefined,
      show: false,
    });
    setScore(0);
    setQuestionNumber(0);
    // Total questions should remain the same or be re-fetched if dynamic
    // Ensure difficultyLevelIdFromState is still valid
    if (difficultyLevelIdFromState) {
      handleStartSession(); // This will re-initialize the session
    } else {
      navigate('/difficulty-selection'); // Fallback if difficulty ID is lost
    }
    setColumnarResultDigits(null); // Reset columnar state
  };

  if (isSessionOver) {
    if (isLoading)
      return <div className="loading-message">正在加载总结...</div>; // Loading state for summary
    if (error)
      return (
        <div className="error-message">
          {error}{' '}
          <button
            onClick={() => navigate('/')}
            className="control-button button-interactive"
          >
            返回主页
          </button>
        </div>
      ); // Error loading summary
    if (!sessionDataForSummary)
      return <div className="loading-message">总结数据准备中...</div>;

    const totalQs =
      sessionDataForSummary.total_questions_planned ||
      sessionDataForSummary.questions.length;
    const accuracy =
      totalQs > 0
        ? ((sessionDataForSummary.score / totalQs) * 100).toFixed(0)
        : '0';
    let durationStr = 'N/A';

    if (sessionDataForSummary.start_time && sessionDataForSummary.end_time) {
      try {
        const startTime = new Date(sessionDataForSummary.start_time);
        const endTime = new Date(sessionDataForSummary.end_time);
        if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
          const durationMs = endTime.getTime() - startTime.getTime();
          if (durationMs >= 0) {
            const minutes = Math.floor(durationMs / 60000);
            const seconds = Math.floor((durationMs % 60000) / 1000);
            durationStr = `${minutes}分 ${seconds}秒`;
          } else {
            durationStr = '时间记录错误';
          }
        } else {
          durationStr = '时间格式无效';
        }
      } catch (e) {
        console.error('Error parsing time:', e);
        durationStr = '时间计算出错';
      }
    }

    let encouragingMessage = '继续努力，下次会更好！💪';
    if (parseFloat(accuracy) >= 80) {
      encouragingMessage = '太棒了！你真是个数学小天才！🎉';
    } else if (parseFloat(accuracy) >= 60) {
      encouragingMessage = '做得不错！继续加油哦！🚀';
    }

    return (
      <div className="practice-summary-overlay">
        <div className="practice-summary-card">
          <h2>练习总结</h2>
          {difficultyNameFromState && (
            <p className="summary-difficulty">
              难度：<span>{difficultyNameFromState}</span>
            </p>
          )}
          <div className="summary-stats-grid">
            <p>
              总题数：<span>{totalQs}</span>
            </p>
            <p>
              答对题数：<span>{sessionDataForSummary.score}</span>
            </p>
            <p>
              答错题数：<span>{totalQs - sessionDataForSummary.score}</span>
            </p>
            <p>
              正确率：<span>{accuracy}%</span>
            </p>
            <p>
              用时：<span>{durationStr}</span>
            </p>
          </div>
          <p className="encouraging-message">{encouragingMessage}</p>
          <div className="summary-actions">
            <button
              onClick={handlePracticeAgain}
              className="control-button button-interactive summary-button-again"
            >
              再练一次
            </button>
            <button
              onClick={() => navigate('/difficulty-selection')}
              className="control-button button-interactive summary-button-select"
            >
              选择其他难度
            </button>
            <button
              onClick={() => navigate('/')}
              className="control-button button-interactive summary-button-home"
            >
              返回主页
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion)
    return <div className="loading-message">题目加载中...</div>; // Should be brief

  const handleColumnarAnswerChange = (
    answerString: string,
    operandsWithBlanks: (number | null)[][],
    resultDigits: (number | null)[]
  ) => {
    setCurrentAnswer(answerString);
    setColumnarOperandDigits(operandsWithBlanks);
    setColumnarResultDigits(resultDigits);
  };

  const handleSubmitColumnarAnswer = async () => {
    if (!sessionId || !currentQuestion || !columnarResultDigits) return;

    // Check if user has filled all blanks (both operands and result)
    const hasAllOperandBlanks =
      columnarOperandDigits?.every((row) =>
        row.every((digit) => digit !== null)
      ) ?? true;

    const hasAllResultBlanks = columnarResultDigits.every(
      (digit) => digit !== null
    );

    if (!hasAllOperandBlanks || !hasAllResultBlanks) {
      // User hasn't filled all blanks yet
      setFeedback({
        isCorrect: null,
        message: '请填写所有空白处！',
        show: true,
      });
      setTimeout(() => {
        setFeedback((prev) => ({ ...prev, show: false }));
      }, 2000);
      return;
    }

    // Convert the filled-in result digits to a number for validation
    const userResultNumber = parseInt(
      columnarResultDigits.map((d) => d?.toString()).join(''),
      10
    );

    setIsLoading(true);
    setIsAnswerSubmitted(true);

    try {
      const payload: AnswerPayload = {
        session_id: sessionId,
        question_id: currentQuestion.id,
        user_answer: userResultNumber,
      };
      const resultQuestion = await submitAnswer(payload);

      setFeedback({
        isCorrect: resultQuestion.is_correct ?? false,
        message: resultQuestion.is_correct ? '答对了！🎉' : '再想想哦 🤔',
        correctAnswer: resultQuestion.is_correct
          ? undefined
          : resultQuestion.correct_answer,
        show: true,
      });

      if (resultQuestion.is_correct) {
        setScore((prev) => prev + 1);
      }
      setCurrentQuestion(resultQuestion);
      setIsLoading(false);

      // Check if this was the last question
      if (questionNumber >= totalQuestions) {
        setIsSessionOver(true);
        if (sessionId) {
          const summaryData = await getPracticeSummary(sessionId);
          setSessionDataForSummary(summaryData);
        }
      }
    } catch (err) {
      console.error('Error submitting columnar answer:', err);
      setError('提交答案失败，请检查网络连接。');
      setFeedback({ isCorrect: null, message: '提交失败!', show: true });
      setIsLoading(false);
    }
  };

  return (
    <div className="practice-container">
      <header className="practice-header">
        <div className="progress-info">
          {difficultyNameFromState && (
            <span className="difficulty-name-display">
              难度: {difficultyNameFromState} |{' '}
            </span>
          )}
          题目: {questionNumber} / {totalQuestions}
        </div>
        <div className="score-info">得分: {score}</div>
      </header>

      <main className="question-area">
        {currentQuestion.question_type === 'columnar' ? (
          <ColumnarCalculation
            question={currentQuestion}
            onAnswerChange={handleColumnarAnswerChange}
            showCorrectAnswer={isAnswerSubmitted}
          />
        ) : (
          <div
            className="question-display question-enter-active"
            key={questionAnimationKey}
          >
            <span className="expression">
              {currentQuestion.question_string}
            </span>
            <span className="equals-sign">=</span>
            <span className="answer-placeholder">?</span>
          </div>
        )}

        {currentQuestion.question_type !== 'columnar' && (
          <div className="user-answer-display">{currentAnswer || '_'}</div>
        )}

        <FeedbackDisplay
          isCorrect={feedback.isCorrect}
          correctMessage={feedback.message}
          incorrectMessage={feedback.message}
          correctAnswer={feedback.correctAnswer}
          show={feedback.show}
        />
      </main>

      {currentQuestion.question_type !== 'columnar' && (
        <div className="keypad-container">
          <NumericKeypad
            onDigitClick={handleKeypadDigit}
            onClear={handleKeypadClear}
            onConfirm={handleSubmitAnswer}
            disabled={isAnswerSubmitted || isLoading}
          />
        </div>
      )}

      {currentQuestion.question_type === 'columnar' && !isAnswerSubmitted && (
        <div className="columnar-submit-container">
          <button
            onClick={handleSubmitColumnarAnswer}
            className="control-button submit-columnar-button button-interactive"
            disabled={
              isLoading ||
              !columnarResultDigits?.every((digit) => digit !== null) ||
              !columnarOperandDigits?.every((row) =>
                row.every((digit) => digit !== null)
              )
            }
          >
            提交答案
          </button>
        </div>
      )}

      <footer className="practice-controls">
        {isAnswerSubmitted && !isSessionOver && (
          <button
            onClick={handleNextQuestion}
            className="control-button next-question-button button-interactive"
            disabled={isLoading}
          >
            下一题
          </button>
        )}
        <button
          onClick={handleExitPractice}
          className="control-button exit-button button-interactive"
        >
          退出练习
        </button>
      </footer>
    </div>
  );
};

export default PracticePage;
