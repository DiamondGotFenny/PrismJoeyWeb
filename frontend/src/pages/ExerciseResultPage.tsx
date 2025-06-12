import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePracticeStore, useNavigationStore } from '../stores';
import '../styles/ExerciseResultPage.css';

const ExerciseResultPage: React.FC = () => {
  const navigate = useNavigate();
  const sessionDataForSummary = usePracticeStore(
    (state) => state.sessionDataForSummary
  );
  const isLoading = usePracticeStore((state) => state.isLoading);
  const error = usePracticeStore((state) => state.error);
  const resetSession = usePracticeStore((state) => state.reset);
  const resetNavigation = useNavigationStore((state) => state.reset);

  useEffect(() => {
    // If no summary data, redirect back to difficulty selection
    if (!sessionDataForSummary && !isLoading) {
      console.log(
        '[ExerciseResultPage] No session data found, redirecting to difficulty selection'
      );
      navigate('/difficulty-selection');
    }
  }, [sessionDataForSummary, isLoading, navigate]);

  const handleTryAgain = () => {
    console.log('[ExerciseResultPage] Try again clicked, resetting stores');
    resetSession();
    resetNavigation();
    navigate('/grade-selection');
  };

  const handleBackToHome = () => {
    console.log('[ExerciseResultPage] Back to home clicked, resetting stores');
    resetSession();
    resetNavigation();
    navigate('/');
  };

  const handleBackToDifficulty = () => {
    console.log(
      '[ExerciseResultPage] Back to difficulty clicked, resetting stores'
    );
    resetSession();
    resetNavigation();
    navigate('/difficulty-selection');
  };

  if (isLoading) {
    return (
      <div className="result-page loading" data-testid="loading-state">
        <div className="loading-message">正在加载练习结果...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="result-page error" data-testid="error-state">
        <div className="error-message">
          <h2>加载结果时出错</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button className="retry-button" onClick={handleTryAgain}>
              重新开始
            </button>
            <button className="home-button" onClick={handleBackToHome}>
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionDataForSummary) {
    return null;
  }

  const { score, total_questions_planned, questions } = sessionDataForSummary;
  const correctAnswers = questions.filter((q) => q.is_correct).length;
  const accuracy =
    total_questions_planned > 0
      ? (correctAnswers / total_questions_planned) * 100
      : 0;

  // Determine performance level
  let performanceLevel = '';
  let performanceColor = '';
  if (accuracy >= 90) {
    performanceLevel = '优秀';
    performanceColor = '#28a745';
  } else if (accuracy >= 80) {
    performanceLevel = '良好';
    performanceColor = '#17a2b8';
  } else if (accuracy >= 70) {
    performanceLevel = '及格';
    performanceColor = '#ffc107';
  } else {
    performanceLevel = '需要努力';
    performanceColor = '#dc3545';
  }

  // Determine encouraging message based on user's suggestion
  let encouragingMessage = '继续努力，下次会更好！💪';
  if (accuracy >= 80) {
    encouragingMessage = '太棒了！你真是个数学小天才！🎉';
  } else if (accuracy >= 60) {
    encouragingMessage = '做得不错！继续加油哦！🚀';
  }

  return (
    <div className="result-page" data-testid="result-page">
      <div className="result-header">
        <h1>🎉 练习完成！</h1>
        <p className="encouraging-message" data-testid="encouraging-message">
          {encouragingMessage}
        </p>
        <div
          className="performance-badge"
          style={{ backgroundColor: performanceColor }}
        >
          {performanceLevel}
        </div>
      </div>

      <div className="score-section" data-testid="score-section">
        <div className="score-main">
          <h2>最终得分</h2>
          <div className="score-value">{score}</div>
        </div>

        <div className="score-details">
          <div className="detail-item">
            <span className="detail-label">总题数</span>
            <span className="detail-value">{total_questions_planned}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">正确答题</span>
            <span className="detail-value correct">{correctAnswers}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">错误答题</span>
            <span className="detail-value incorrect">
              {total_questions_planned - correctAnswers}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">正确率</span>
            <span className="detail-value accuracy">
              {accuracy.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      <div className="question-review" data-testid="question-review-section">
        <h3>📝 题目回顾</h3>
        <div className="questions-grid">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className={`question-item ${question.is_correct ? 'correct' : 'incorrect'}`}
              data-testid={`question-review-item-${index}`}
            >
              <div className="question-header">
                <span className="question-number">第 {index + 1} 题</span>
                <span
                  className={`status-icon ${question.is_correct ? 'correct' : 'incorrect'}`}
                >
                  {question.is_correct ? '✓' : '✗'}
                </span>
              </div>
              <div className="question-content">{question.question_string}</div>
              <div className="answer-section">
                <div className="answer-row">
                  <span className="answer-label">你的答案:</span>
                  <span
                    className={`answer-value ${question.is_correct ? 'correct' : 'incorrect'}`}
                  >
                    {question.question_type === 'columnar'
                      ? (() => {
                          // Priority: use user_filled_operands/result if available
                          if (
                            question.user_filled_operands &&
                            question.user_filled_result
                          ) {
                            const opSymbol =
                              question.operations?.[0] ||
                              question.columnar_operation ||
                              '+';
                            const operandStrings =
                              question.user_filled_operands.map(
                                (digitsArr: number[]) => digitsArr.join('')
                              );
                            const resultStr =
                              question.user_filled_result.join('');
                            if (operandStrings.length >= 2) {
                              return `${operandStrings[0]} ${opSymbol} ${operandStrings[1]} = ${resultStr}`;
                            }
                          }

                          // Fallback: only show user_answer (not complete expression)
                          return question.user_answer ?? '未作答';
                        })()
                      : (question.user_answer ?? '未作答')}
                  </span>
                </div>
                {!question.is_correct && (
                  <div className="answer-row">
                    <span className="answer-label">正确答案:</span>
                    <span className="answer-value correct">
                      {question.question_type === 'columnar'
                        ? (() => {
                            // Build full expression like "82+09=91"
                            const opSymbol =
                              question.operations?.[0] ||
                              question.columnar_operation ||
                              '+';
                            // Build operand strings with zero-padding according to columnar_operands lengths
                            const operandStrings = question.operands.map(
                              (operand, idx) => {
                                const desiredLength =
                                  question.columnar_operands?.[idx]?.length ??
                                  undefined;
                                return desiredLength
                                  ? operand
                                      .toString()
                                      .padStart(desiredLength, '0')
                                  : operand.toString();
                              }
                            );
                            // Compute result number
                            let resultNumber: number = 0;
                            if (opSymbol === '+') {
                              resultNumber = question.operands.reduce(
                                (sum, n) => sum + n,
                                0
                              );
                            } else if (
                              opSymbol === '-' &&
                              question.operands.length >= 2
                            ) {
                              resultNumber =
                                question.operands[0] - question.operands[1];
                            } else if (
                              opSymbol === '*' &&
                              question.operands.length >= 2
                            ) {
                              resultNumber = question.operands.reduce(
                                (prod, n) => prod * n,
                                1
                              );
                            } else {
                              // Fallback to first operand if operation unsupported
                              resultNumber = question.operands[0];
                            }
                            // Zero-pad result according to placeholders length
                            const resultLength =
                              question.columnar_result_placeholders?.length ??
                              undefined;
                            const resultStr = resultLength
                              ? resultNumber
                                  .toString()
                                  .padStart(resultLength, '0')
                              : resultNumber.toString();
                            return `${operandStrings[0]} ${opSymbol} ${operandStrings[1]} = ${resultStr}`;
                          })()
                        : question.correct_answer}
                    </span>
                  </div>
                )}
              </div>
              {question.time_spent && (
                <div className="time-spent">
                  用时: {question.time_spent.toFixed(1)}秒
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="action-buttons" data-testid="action-buttons">
        <button
          className="try-again-button"
          onClick={handleTryAgain}
          data-testid="try-again-button"
        >
          🔄 再来一次
        </button>
        <button
          className="difficulty-button"
          onClick={handleBackToDifficulty}
          data-testid="difficulty-button"
        >
          返回难度选择
        </button>
        <button
          className="home-button"
          onClick={handleBackToHome}
          data-testid="home-button"
        >
          🏠 返回首页
        </button>
      </div>
    </div>
  );
};

export default ExerciseResultPage;
