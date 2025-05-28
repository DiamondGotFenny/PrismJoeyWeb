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
  const [activeColumnarInput, setActiveColumnarInput] = useState<{
    type: 'operand' | 'result';
    rowIndex?: number;
    digitIndex: number;
  } | null>(null);
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

  const findNextFocusable = (
    currentOperands: (number | null)[][],
    currentResult: (number | null)[],
    sourceType: 'operand' | 'result',
    sourceRowIndex?: number,
    sourceDigitIndex?: number
  ) => {
    if (
      sourceType === 'operand' &&
      sourceRowIndex !== undefined &&
      sourceDigitIndex !== undefined
    ) {
      for (
        let i = sourceDigitIndex + 1;
        i < currentOperands[sourceRowIndex].length;
        i++
      ) {
        if (currentOperands[sourceRowIndex][i] === null) {
          setActiveColumnarInput({
            type: 'operand',
            rowIndex: sourceRowIndex,
            digitIndex: i,
          });
          return;
        }
      }
      for (let r = sourceRowIndex + 1; r < currentOperands.length; r++) {
        for (let d = 0; d < currentOperands[r].length; d++) {
          if (currentOperands[r][d] === null) {
            setActiveColumnarInput({
              type: 'operand',
              rowIndex: r,
              digitIndex: d,
            });
            return;
          }
        }
      }
    }
    const startIndex =
      sourceType === 'result' && sourceDigitIndex !== undefined
        ? sourceDigitIndex + 1
        : 0;
    for (let i = startIndex; i < currentResult.length; i++) {
      if (currentResult[i] === null) {
        setActiveColumnarInput({ type: 'result', digitIndex: i });
        return;
      }
    }
    setActiveColumnarInput(null);
  };

  const findPreviousFocusableAndClear = (
    operands: (number | null)[][],
    result: (number | null)[],
    sourceType: 'operand' | 'result',
    sourceRowIndex?: number,
    sourceDigitIndex?: number
  ) => {
    let targetToClearAndFocus: {
      type: 'operand' | 'result';
      rowIndex?: number;
      digitIndex: number;
    } | null = null;
    let focusOnlyTarget: {
      type: 'operand' | 'result';
      rowIndex?: number;
      digitIndex: number;
    } | null = null;

    if (sourceType === 'result' && sourceDigitIndex !== undefined) {
      for (let i = sourceDigitIndex - 1; i >= 0; i--) {
        if (result[i] !== null) {
          targetToClearAndFocus = { type: 'result', digitIndex: i };
          break;
        } else if (result[i] === null && !focusOnlyTarget) {
          focusOnlyTarget = { type: 'result', digitIndex: i };
        }
      }
      if (targetToClearAndFocus) {
        /* proceed to clear */
      } else {
        sourceType = 'operand';
        sourceRowIndex = operands.length - 1;
        sourceDigitIndex = operands[operands.length - 1]?.length || 0;
        if (focusOnlyTarget) {
          setActiveColumnarInput(focusOnlyTarget);
          return;
        }
      }
    }

    if (
      sourceType === 'operand' &&
      sourceRowIndex !== undefined &&
      sourceDigitIndex !== undefined
    ) {
      for (let i = sourceDigitIndex - 1; i >= 0; i--) {
        if (operands[sourceRowIndex][i] !== null) {
          targetToClearAndFocus = {
            type: 'operand',
            rowIndex: sourceRowIndex,
            digitIndex: i,
          };
          break;
        } else if (operands[sourceRowIndex][i] === null && !focusOnlyTarget) {
          focusOnlyTarget = {
            type: 'operand',
            rowIndex: sourceRowIndex,
            digitIndex: i,
          };
        }
      }
      if (!targetToClearAndFocus) {
        for (let r = sourceRowIndex - 1; r >= 0; r--) {
          for (let d = operands[r].length - 1; d >= 0; d--) {
            if (operands[r][d] !== null) {
              targetToClearAndFocus = {
                type: 'operand',
                rowIndex: r,
                digitIndex: d,
              };
              break;
            } else if (operands[r][d] === null && !focusOnlyTarget) {
              focusOnlyTarget = { type: 'operand', rowIndex: r, digitIndex: d };
            }
          }
          if (targetToClearAndFocus) break;
        }
      }
    }

    if (targetToClearAndFocus) {
      const newOperands = operands.map((row) => [...row]);
      const newResult = [...result];
      if (
        targetToClearAndFocus.type === 'operand' &&
        targetToClearAndFocus.rowIndex !== undefined
      ) {
        newOperands[targetToClearAndFocus.rowIndex][
          targetToClearAndFocus.digitIndex
        ] = null;
      } else if (targetToClearAndFocus.type === 'result') {
        newResult[targetToClearAndFocus.digitIndex] = null;
      }
      setActiveColumnarInput(targetToClearAndFocus);
      const combined = `${newOperands.map((r) => r.map((d) => d ?? '').join('')).join('|')}=${newResult.map((d) => d ?? '').join('')}`;
      handleColumnarAnswerChange(combined, newOperands, newResult);
    } else if (focusOnlyTarget) {
      setActiveColumnarInput(focusOnlyTarget);
    }
  };

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

  // Auto-focus first available input for columnar questions
  useEffect(() => {
    if (
      currentQuestion?.question_type === 'columnar' &&
      !activeColumnarInput &&
      !isAnswerSubmitted
    ) {
      // Find first available operand input
      if (currentQuestion.columnar_operands) {
        for (
          let rowIndex = 0;
          rowIndex < currentQuestion.columnar_operands.length;
          rowIndex++
        ) {
          for (
            let digitIndex = 0;
            digitIndex < currentQuestion.columnar_operands[rowIndex].length;
            digitIndex++
          ) {
            if (
              currentQuestion.columnar_operands[rowIndex][digitIndex] === null
            ) {
              setActiveColumnarInput({ type: 'operand', rowIndex, digitIndex });
              return;
            }
          }
        }
      }

      // If no operand inputs, try result inputs
      if (currentQuestion.columnar_result_placeholders) {
        for (
          let digitIndex = 0;
          digitIndex < currentQuestion.columnar_result_placeholders.length;
          digitIndex++
        ) {
          if (
            currentQuestion.columnar_result_placeholders[digitIndex] === null
          ) {
            setActiveColumnarInput({ type: 'result', digitIndex });
            return;
          }
        }
      }
    }
  }, [currentQuestion, activeColumnarInput, isAnswerSubmitted]);

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
    setActiveColumnarInput(null); // Reset active input for new question
    setColumnarOperandDigits(null); // Reset columnar operand state
    setColumnarResultDigits(null); // Reset columnar result state

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
    // Reset all relevant states to start a new session with the same difficulty
    setSessionId(null);
    setCurrentQuestion(null);
    setCurrentAnswer('');
    setColumnarOperandDigits(null);
    setColumnarResultDigits(null);
    setActiveColumnarInput(null);
    setFeedback({ isCorrect: null, message: '', show: false });
    setScore(0);
    setQuestionNumber(0);
    // totalQuestions remains the same or could be re-fetched if settings change
    setIsLoading(true);
    setError(null);
    setIsSessionOver(false);
    setIsAnswerSubmitted(false);
    setQuestionAnimationKey(0); // Reset animation
    setSessionDataForSummary(null);

    // Restart the session (which will fetch new questions)
    handleStartSession();
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

    // Auto-focus first available input if none is currently active
    if (
      !activeColumnarInput &&
      currentQuestion &&
      currentQuestion.question_type === 'columnar'
    ) {
      // Check if currentQuestion.columnar_operands and currentQuestion.columnar_result_placeholders exist
      const operands = currentQuestion.columnar_operands;
      const resultPlaceholders = currentQuestion.columnar_result_placeholders;

      // Find first available operand input
      if (operands) {
        for (let rowIndex = 0; rowIndex < operands.length; rowIndex++) {
          for (
            let digitIndex = 0;
            digitIndex < operands[rowIndex].length;
            digitIndex++
          ) {
            if (operands[rowIndex][digitIndex] === null) {
              // Check if this input is already filled by the user recently
              if (
                !columnarOperandDigits ||
                columnarOperandDigits[rowIndex]?.[digitIndex] === null
              ) {
                setActiveColumnarInput({
                  type: 'operand',
                  rowIndex,
                  digitIndex,
                });
                return;
              }
            }
          }
        }
      }

      // If no operand inputs, try result inputs
      if (resultPlaceholders) {
        for (
          let digitIndex = 0;
          digitIndex < resultPlaceholders.length;
          digitIndex++
        ) {
          if (resultPlaceholders[digitIndex] === null) {
            // Check if this input is already filled by the user recently
            if (
              !columnarResultDigits ||
              columnarResultDigits[digitIndex] === null
            ) {
              setActiveColumnarInput({ type: 'result', digitIndex });
              return;
            }
          }
        }
      }
    }
  };

  const handleColumnarInputFocus = (
    type: 'operand' | 'result',
    digitIndex: number,
    rowIndex?: number
  ) => {
    setActiveColumnarInput({ type, digitIndex, rowIndex });
  };

  const handleColumnarKeypadDigit = (digit: string) => {
    if (isAnswerSubmitted || !currentQuestion) return;

    const currentOperandDigitsState = columnarOperandDigits
      ? columnarOperandDigits.map((row) => [...row])
      : currentQuestion.columnar_operands
        ? currentQuestion.columnar_operands.map((row) => [...row])
        : [];
    const currentResultDigitsState = columnarResultDigits
      ? [...columnarResultDigits]
      : currentQuestion.columnar_result_placeholders
        ? [...currentQuestion.columnar_result_placeholders]
        : [];

    let changed = false;
    if (activeColumnarInput) {
      const digitValue = parseInt(digit, 10);
      if (activeColumnarInput.type === 'operand') {
        const { rowIndex, digitIndex } = activeColumnarInput;
        if (
          rowIndex !== undefined &&
          currentOperandDigitsState[rowIndex] &&
          currentOperandDigitsState[rowIndex][digitIndex] === null
        ) {
          currentOperandDigitsState[rowIndex][digitIndex] = digitValue;
          changed = true;
          findNextFocusable(
            currentOperandDigitsState,
            currentResultDigitsState,
            'operand',
            rowIndex,
            digitIndex
          );
        }
      } else if (activeColumnarInput.type === 'result') {
        const { digitIndex } = activeColumnarInput;
        if (currentResultDigitsState[digitIndex] === null) {
          currentResultDigitsState[digitIndex] = digitValue;
          changed = true;
          findNextFocusable(
            currentOperandDigitsState,
            currentResultDigitsState,
            'result',
            undefined,
            digitIndex
          );
        }
      }
    }

    if (changed) {
      const operandStrings = currentOperandDigitsState.map((row) =>
        row.map((d) => (d !== null ? d.toString() : '')).join('')
      );
      const resultString = currentResultDigitsState
        .map((d) => (d !== null ? d.toString() : ''))
        .join('');
      const combinedAnswer = `${operandStrings.join('|')}=${resultString}`;

      handleColumnarAnswerChange(
        combinedAnswer,
        currentOperandDigitsState,
        currentResultDigitsState
      );
    }
  };

  const handleColumnarKeypadClear = () => {
    if (isAnswerSubmitted || !currentQuestion) return;

    const currentOperands = columnarOperandDigits
      ? columnarOperandDigits.map((row) => [...row])
      : currentQuestion.columnar_operands
        ? currentQuestion.columnar_operands.map((row) => [...row])
        : [];
    const currentResult = columnarResultDigits
      ? [...columnarResultDigits]
      : currentQuestion.columnar_result_placeholders
        ? [...currentQuestion.columnar_result_placeholders]
        : [];

    let didDirectClear = false;
    if (activeColumnarInput) {
      if (activeColumnarInput.type === 'operand') {
        const { rowIndex, digitIndex } = activeColumnarInput;
        if (
          rowIndex !== undefined &&
          currentOperands[rowIndex] &&
          currentOperands[rowIndex][digitIndex] !== null
        ) {
          currentOperands[rowIndex][digitIndex] = null;
          didDirectClear = true;
        } else if (rowIndex !== undefined) {
          findPreviousFocusableAndClear(
            currentOperands,
            currentResult,
            'operand',
            rowIndex,
            digitIndex
          );
        }
      } else if (activeColumnarInput.type === 'result') {
        const { digitIndex } = activeColumnarInput;
        if (currentResult[digitIndex] !== null) {
          currentResult[digitIndex] = null;
          didDirectClear = true;
        } else {
          findPreviousFocusableAndClear(
            currentOperands,
            currentResult,
            'result',
            undefined,
            digitIndex
          );
        }
      }
    }

    if (didDirectClear) {
      const operandStrings = currentOperands.map((row) =>
        row.map((d) => (d !== null ? d.toString() : '')).join('')
      );
      const resultString = currentResult
        .map((d) => (d !== null ? d.toString() : ''))
        .join('');
      const combinedAnswer = `${operandStrings.join('|')}=${resultString}`;

      handleColumnarAnswerChange(
        combinedAnswer,
        currentOperands,
        currentResult
      );
    }
  };

  const handleSubmitColumnarAnswer = async () => {
    if (
      !sessionId ||
      !currentQuestion ||
      !columnarOperandDigits ||
      !columnarResultDigits
    )
      return;

    const allOperandsFilled = columnarOperandDigits.every((row) =>
      row.every((digit) => digit !== null)
    );
    const allResultFilled = columnarResultDigits.every(
      (digit) => digit !== null
    );

    if (!allOperandsFilled || !allResultFilled) {
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

    setIsLoading(true);
    setIsAnswerSubmitted(true);

    const filledOperandsForPayload = columnarOperandDigits.map((row) =>
      row.map((digit) => digit as number)
    );
    const filledResultForPayload = columnarResultDigits.map(
      (digit) => digit as number
    );

    try {
      const payload: AnswerPayload = {
        session_id: sessionId,
        question_id: currentQuestion.id,
        user_filled_operands: filledOperandsForPayload,
        user_filled_result: filledResultForPayload,
      };
      const resultQuestion = await submitAnswer(payload);

      setFeedback({
        isCorrect: resultQuestion.is_correct ?? false,
        message: resultQuestion.is_correct ? '答对了！🎉' : '再想想哦 🤔',
        correctAnswer: undefined,
        show: true,
      });

      if (resultQuestion.is_correct) {
        setScore((prev) => prev + 1);
      }

      setIsLoading(false);

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
            onInputFocus={handleColumnarInputFocus}
            activeInput={activeColumnarInput}
            externalOperandDigits={columnarOperandDigits || undefined}
            externalResultDigits={columnarResultDigits || undefined}
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

      <div className="keypad-container">
        <NumericKeypad
          onDigitClick={
            currentQuestion.question_type === 'columnar'
              ? handleColumnarKeypadDigit
              : handleKeypadDigit
          }
          onClear={
            currentQuestion.question_type === 'columnar'
              ? handleColumnarKeypadClear
              : handleKeypadClear
          }
          onConfirm={
            currentQuestion.question_type === 'columnar'
              ? handleSubmitColumnarAnswer
              : handleSubmitAnswer
          }
          disabled={isAnswerSubmitted || isLoading}
        />
      </div>

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
