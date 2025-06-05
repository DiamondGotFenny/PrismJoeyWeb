import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigationStore, useNavigationFlow } from '../stores';
import NumericKeypad from '../components/NumericKeypad';
import FeedbackDisplay from '../components/FeedbackDisplay';
import ColumnarCalculation from '../components/ColumnarCalculation';
import HelpBox from '../components/HelpBox';
import MathIcon from '../components/MathIcon';
import '../styles/PracticePage.css';
import joeyThinking from '../assets/mascot/PrismJoey_Mascot_Thinking Pose.png';
import {
  usePracticeStore,
  usePracticeSession,
  usePracticeQuestion,
  usePracticeAnswer,
  usePracticeProgress,
  usePracticeUI,
  usePracticeHelp,
} from '../stores';

const PracticePage: React.FC = () => {
  const navigate = useNavigate();
  const { startSession, endSession } = useNavigationStore();
  const { difficulty, totalQuestions } = useNavigationFlow();

  const startPracticeSession = usePracticeStore((state) => state.startSession);
  const endPracticeSession = usePracticeStore((state) => state.endSession);
  const setError = usePracticeStore((state) => state.setError);
  const loadNextQuestion = usePracticeStore((state) => state.loadNextQuestion);
  const setCurrentAnswerAction = usePracticeStore(
    (state) => state.setCurrentAnswer
  );
  const submitCurrentAnswer = usePracticeStore(
    (state) => state.submitCurrentAnswer
  );
  const setColumnarResultDigits = usePracticeStore(
    (state) => state.setColumnarResultDigits
  );
  const setColumnarOperandDigits = usePracticeStore(
    (state) => state.setColumnarOperandDigits
  );
  const setActiveColumnarInput = usePracticeStore(
    (state) => state.setActiveColumnarInput
  );
  const updateColumnarDigit = usePracticeStore(
    (state) => state.updateColumnarDigit
  );
  const clearColumnarInputs = usePracticeStore(
    (state) => state.clearColumnarInputs
  );
  const findNextFocusableInput = usePracticeStore(
    (state) => state.findNextFocusableInput
  );
  const requestHelp = usePracticeStore((state) => state.requestHelp);
  const retryHelp = usePracticeStore((state) => state.retryHelp);
  const hideHelp = usePracticeStore((state) => state.hideHelp);
  const requestVoiceHelp = usePracticeStore((state) => state.requestVoiceHelp);

  const storeSessionId = usePracticeStore((state) => state.sessionId);
  const storeIsLoading = usePracticeStore((state) => state.isLoading);

  const {
    question: currentQuestion,
    questionNumber,
    totalQuestions: practiceTotal,
    animationKey: questionAnimationKey,
  } = usePracticeQuestion();

  const {
    currentAnswer,
    columnarResultDigits,
    columnarOperandDigits,
    activeColumnarInput,
    isAnswerSubmitted,
  } = usePracticeAnswer();

  const { score } = usePracticeProgress();
  const { error, feedback } = usePracticeUI();
  const { isSessionOver } = usePracticeSession();
  const { help, voiceHelp } = usePracticeHelp();

  // Get difficulty information from navigation store or URL parameters (fallback for testing)
  const urlParams = new URLSearchParams(location.search);
  const difficultyIdFromUrl = urlParams.get('difficultyId');
  const totalQuestionsFromUrl = urlParams.get('totalQuestions');
  const difficultyNameFromUrl = urlParams.get('difficultyName');
  const testMode = urlParams.get('testMode') === 'true';

  // Use navigation store as primary source, URL parameters as fallback for testing
  const effectiveDifficultyLevelId =
    difficulty?.id ||
    (difficultyIdFromUrl ? parseInt(difficultyIdFromUrl, 10) : undefined);
  const effectiveTotalQuestions =
    totalQuestions ||
    (totalQuestionsFromUrl ? parseInt(totalQuestionsFromUrl, 10) : 10);
  const effectiveDifficultyName = difficulty?.name || difficultyNameFromUrl;

  // In test mode, create a mock difficulty object if URL parameters are provided
  const mockDifficultyForTesting =
    testMode && difficultyIdFromUrl && difficultyNameFromUrl
      ? {
          id: parseInt(difficultyIdFromUrl, 10),
          name: difficultyNameFromUrl,
          code: 'TEST_DIFFICULTY',
          max_number: 100,
          allow_carry: true,
          allow_borrow: false,
          operation_types: ['+'],
          order: 1,
        }
      : null;

  console.log('[PracticePage] Component Render. Effective values:', {
    difficultyLevelId: effectiveDifficultyLevelId,
    totalQuestions: effectiveTotalQuestions,
    storeSessionId,
    storeIsLoading,
    testMode,
    usingMockDifficulty: !!mockDifficultyForTesting,
  });

  useEffect(() => {
    console.log(
      `[PracticePage] Session Init Effect. Effective Difficulty ID: ${effectiveDifficultyLevelId}, Existing Session ID: ${storeSessionId}, IsLoading: ${storeIsLoading}, Test Mode: ${testMode}`
    );

    if (effectiveDifficultyLevelId && !storeSessionId && !storeIsLoading) {
      const initializeSession = async () => {
        console.log(
          `[PracticePage] Condition met: Attempting to start session. Current isLoading: ${usePracticeStore.getState().isLoading}`
        );
        try {
          // Start navigation session tracking
          await startSession(`session_${Date.now()}`);

          // Start practice session with difficulty
          await startPracticeSession(
            effectiveDifficultyLevelId,
            effectiveTotalQuestions
          );
          console.log(
            '[PracticePage] startSession call completed. New Session ID (from store check): ',
            usePracticeStore.getState().sessionId,
            'isLoading (from store check):',
            usePracticeStore.getState().isLoading
          );
        } catch (err) {
          console.error(
            '[PracticePage] Failed to start session from useEffect:',
            err
          );
          setError('启动练习失败，请重试。');
        }
      };
      initializeSession();
    } else if (storeIsLoading) {
      console.log(
        '[PracticePage] Session initialization in progress or component is generally loading.'
      );
    } else if (storeSessionId) {
      console.log('[PracticePage] Session already exists. ID:', storeSessionId);
    } else if (!effectiveDifficultyLevelId) {
      console.log('[PracticePage] No effective difficulty level ID provided.');
      if (!testMode) {
        setError('请先选择难度级别。');
      }
    }

    // Cleanup function
    return () => {
      console.log('[PracticePage] useEffect cleanup triggered.');
      console.log(
        '[PracticePage] Cleanup: For now, not calling resetSession() here to prevent loops. Session end/reset should be handled by navigation or explicit actions.'
      );
    };
  }, [
    effectiveDifficultyLevelId,
    effectiveTotalQuestions,
    storeSessionId,
    storeIsLoading,
    testMode,
    startSession,
    startPracticeSession,
    setError,
  ]);

  // Handle keypad input for regular questions
  const handleKeypadDigit = useCallback(
    (digit: string) => {
      console.log('[PracticePage] handleKeypadDigit called with:', digit);
      console.log(
        '[PracticePage] currentQuestion?.question_type:',
        currentQuestion?.question_type
      );
      console.log('[PracticePage] currentAnswer before:', currentAnswer);
      if (currentQuestion?.question_type !== 'columnar') {
        setCurrentAnswerAction(currentAnswer + digit);
        console.log(
          '[PracticePage] setCurrentAnswerAction called with:',
          currentAnswer + digit
        );
      } else {
        console.log(
          '[PracticePage] Skipping digit input - question is columnar type'
        );
      }
    },
    [currentAnswer, currentQuestion?.question_type, setCurrentAnswerAction]
  );

  // Handle clear for regular questions
  const handleKeypadClear = useCallback(() => {
    if (currentQuestion?.question_type !== 'columnar') {
      setCurrentAnswerAction('');
    }
  }, [currentQuestion?.question_type, setCurrentAnswerAction]);

  // Handle answer submission for regular questions
  const handleSubmitAnswer = useCallback(async () => {
    if (
      !currentAnswer.trim() ||
      currentQuestion?.question_type === 'columnar'
    ) {
      return;
    }

    try {
      await submitCurrentAnswer();
    } catch (err) {
      console.error('[PracticePage] Failed to submit answer:', err);
      setError('提交答案失败，请重试');
    }
  }, [
    currentAnswer,
    currentQuestion?.question_type,
    submitCurrentAnswer,
    setError,
  ]);

  // Handle next question
  const handleNextQuestion = useCallback(async () => {
    try {
      await loadNextQuestion();
    } catch (err) {
      console.error('[PracticePage] Failed to load next question:', err);
      setError('加载下一题失败，请重试');
    }
  }, [loadNextQuestion, setError]);

  // Handle exit practice
  const handleExitPractice = useCallback(() => {
    // End both navigation session and practice session
    endSession(); // Navigation store
    endPracticeSession(); // Practice store
    navigate(-1);
  }, [endSession, endPracticeSession, navigate]);

  // Columnar calculation handlers
  const handleColumnarAnswerChange = useCallback(
    (
      answerString: string,
      operandsWithBlanks: (number | null)[][],
      resultDigits: (number | null)[]
    ) => {
      setCurrentAnswerAction(answerString);
      setColumnarOperandDigits(operandsWithBlanks);
      setColumnarResultDigits(resultDigits);
    },
    [setCurrentAnswerAction, setColumnarOperandDigits, setColumnarResultDigits]
  );

  const handleColumnarInputFocus = useCallback(
    (type: 'operand' | 'result', digitIndex: number, rowIndex?: number) => {
      console.log('[PracticePage] handleColumnarInputFocus called with:', {
        type,
        digitIndex,
        rowIndex,
      });
      setActiveColumnarInput({ type, digitIndex, rowIndex });
    },
    [setActiveColumnarInput]
  );

  const handleColumnarKeypadDigit = useCallback(
    (digit: string) => {
      console.log(
        '[PracticePage] handleColumnarKeypadDigit called with:',
        digit
      );
      console.log(
        '[PracticePage] currentQuestion?.question_type:',
        currentQuestion?.question_type
      );
      console.log('[PracticePage] activeColumnarInput:', activeColumnarInput);

      if (
        currentQuestion?.question_type === 'columnar' &&
        activeColumnarInput
      ) {
        const digitValue = parseInt(digit, 10);
        console.log('[PracticePage] Calling updateColumnarDigit with:', {
          digitValue,
          type: activeColumnarInput.type,
          digitIndex: activeColumnarInput.digitIndex,
          rowIndex: activeColumnarInput.rowIndex,
        });
        updateColumnarDigit(
          digitValue,
          activeColumnarInput.type,
          activeColumnarInput.digitIndex,
          activeColumnarInput.rowIndex
        );
        findNextFocusableInput();
      } else {
        console.log(
          '[PracticePage] Not calling updateColumnarDigit - conditions not met'
        );
      }
    },
    [
      currentQuestion?.question_type,
      activeColumnarInput,
      updateColumnarDigit,
      findNextFocusableInput,
    ]
  );

  const handleColumnarKeypadClear = useCallback(() => {
    if (currentQuestion?.question_type === 'columnar') {
      clearColumnarInputs();
    }
  }, [currentQuestion?.question_type, clearColumnarInputs]);

  const handleSubmitColumnarAnswer = useCallback(async () => {
    if (currentQuestion?.question_type === 'columnar') {
      try {
        await submitCurrentAnswer();
      } catch (err) {
        console.error('[PracticePage] Failed to submit columnar answer:', err);
        setError('提交答案失败，请重试');
      }
    }
  }, [currentQuestion?.question_type, submitCurrentAnswer, setError]);

  // Help handlers
  const handleHelpButtonClick = useCallback(() => {
    if (help.isVisible) {
      hideHelp();
    } else {
      requestHelp();
    }
  }, [help.isVisible, hideHelp, requestHelp]);

  const handleRetryHelp = useCallback(() => {
    retryHelp();
  }, [retryHelp]);

  const handleVoiceHelpButtonClick = useCallback(async () => {
    try {
      await requestVoiceHelp();
    } catch (err) {
      console.error('[PracticePage] Voice help failed:', err);
    }
  }, [requestVoiceHelp]);

  const handleCloseHelp = useCallback(() => {
    hideHelp();
  }, [hideHelp]);

  // Math expression parser (unchanged from original)
  const parseMathExpression = (expression: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let currentNumber = '';

    for (let i = 0; i < expression.length; i++) {
      const char = expression[i];

      if (/\d/.test(char)) {
        currentNumber += char;
      } else {
        if (currentNumber) {
          parts.push(
            <MathIcon
              key={`num-${i}`}
              character={parseInt(currentNumber, 10)}
              size="large"
              color="auto"
            />
          );
          currentNumber = '';
        }
        if (char === ' ') {
          parts.push(
            <span key={`space-${i}`} className="expression-space">
              {' '}
            </span>
          );
        } else {
          parts.push(
            <MathIcon
              key={`op-${i}`}
              character={char}
              size="large"
              color="auto"
            />
          );
        }
      }
    }
    if (currentNumber) {
      parts.push(
        <MathIcon
          key="num-last"
          character={parseInt(currentNumber, 10)}
          size="large"
          color="auto"
        />
      );
    }
    return parts;
  };

  // Early return for loading state
  if (storeIsLoading && !currentQuestion && !storeSessionId) {
    return (
      <div className="practice-container loading-state">
        <div className="loading-message">正在准备练习...</div>
      </div>
    );
  }

  // Early return for error state
  if (error && !currentQuestion) {
    return (
      <div className="practice-container error-state">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate(-1)} className="control-button">
          返回
        </button>
      </div>
    );
  }

  // Early return if no question (but session might exist)
  if (!currentQuestion && storeSessionId && !storeIsLoading) {
    return (
      <div className="practice-container">
        <div className="loading-message">正在加载题目...</div>
      </div>
    );
  }

  // If session doesn't exist and not loading, and no error, it might be a navigation issue
  if (
    !storeSessionId &&
    !storeIsLoading &&
    !error &&
    effectiveDifficultyLevelId
  ) {
    console.warn(
      '[PracticePage] No session ID, not loading, no error, but difficulty ID exists. Session init might have failed silently or is pending.'
    );
    // This case might indicate an issue if the useEffect for init isn't firing as expected, or startSession isn't setting sessionId.
  }

  if (!currentQuestion && !effectiveDifficultyLevelId) {
    // Handles case where user lands here without params
    return (
      <div className="practice-container error-state">
        <div className="error-message">缺少练习参数，请返回首页。</div>
        <button onClick={() => navigate('/')} className="control-button">
          返回首页
        </button>
      </div>
    );
  }

  // If, after all guards, we still don't have a question but expect one (session exists), show loading.
  // This might be redundant if the above !currentQuestion && storeSessionId handles it.
  if (!currentQuestion && storeSessionId) {
    return (
      <div className="practice-container">
        <div className="loading-message">题目加载中...</div>
      </div>
    );
  }

  // Final check: if no current question after all this, something is wrong
  if (!currentQuestion) {
    console.error(
      '[PracticePage] Critical error: No current question loaded despite passing guards.'
    );
    return (
      <div className="practice-container error-state">
        <div className="error-message">加载题目失败，请返回重试。</div>
        <button onClick={() => navigate(-1)} className="control-button">
          返回
        </button>
      </div>
    );
  }

  const displayedExpression = parseMathExpression(
    currentQuestion.question_string
  );

  return (
    <div className="practice-container">
      <header className="practice-header">
        <div className="progress-info">
          {effectiveDifficultyName && (
            <span className="difficulty-name-display">
              难度: {effectiveDifficultyName} |{' '}
            </span>
          )}
          题目: {questionNumber} / {practiceTotal}
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
            <div className="expression">
              {displayedExpression.map((part, index) => (
                <React.Fragment key={index}>{part}</React.Fragment>
              ))}
              {!isAnswerSubmitted &&
                currentQuestion.question_string.includes('=') && (
                  <MathIcon character="=" size="large" color="auto" />
                )}
              {isAnswerSubmitted && currentAnswer && (
                <>
                  <MathIcon character="=" size="large" color="auto" />
                  <MathIcon
                    character={parseInt(currentAnswer, 10)}
                    size="large"
                    color={feedback.isCorrect ? 'green' : 'red'}
                  />
                </>
              )}
            </div>
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

        {!isAnswerSubmitted && (
          <div className="help-button-container">
            <button
              onClick={handleHelpButtonClick}
              className="help-button button-prism button-violet"
              disabled={help.isLoading || storeIsLoading}
            >
              {help.isLoading ? (
                '加载中...'
              ) : (
                <>
                  <img
                    src={joeyThinking}
                    alt="Joey Thinking"
                    className="button-mascot"
                  />
                  帮我一下
                </>
              )}
            </button>
            <button
              onClick={handleVoiceHelpButtonClick}
              className="voice-help-button"
              disabled={voiceHelp.isLoading || storeIsLoading}
              title="语音提示"
            >
              {voiceHelp.isLoading ? '🔄' : '🔊 语音提示'}
            </button>
          </div>
        )}

        {voiceHelp.error && (
          <div className="voice-help-error">{voiceHelp.error}</div>
        )}
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
          disabled={isAnswerSubmitted || storeIsLoading}
        />
      </div>

      <footer className="practice-controls">
        {isAnswerSubmitted && !isSessionOver && (
          <button
            onClick={handleNextQuestion}
            className="control-button next-question-button button-interactive"
            disabled={storeIsLoading}
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

      <HelpBox
        helpData={help.data}
        isVisible={help.isVisible}
        onClose={handleCloseHelp}
        error={help.error}
        onRetry={handleRetryHelp}
        isLoading={help.isLoading}
      />
    </div>
  );
};

export default PracticePage;
