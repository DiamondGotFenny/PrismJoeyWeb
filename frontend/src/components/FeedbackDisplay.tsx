import React, { useEffect, useState } from 'react';
import './../styles/FeedbackDisplay.css'; // Corrected path

interface FeedbackDisplayProps {
  isCorrect: boolean | null;
  correctMessage?: string;
  incorrectMessage?: string;
  correctAnswer?: string | number;
  show: boolean; // Prop to control visibility and trigger animation
}

const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({
  isCorrect,
  correctMessage = '答对了！🎉',
  incorrectMessage = '再想想哦 🤔',
  correctAnswer,
  show,
}) => {
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    if (show) {
      if (isCorrect === true) {
        setAnimationClass('feedback-correct feedback-pop');
      } else if (isCorrect === false) {
        setAnimationClass('feedback-incorrect feedback-shake');
      } else {
        setAnimationClass('');
      }
    } else {
      setAnimationClass('');
    }

    // Optional: Remove animation class after it plays to allow re-triggering
    // This depends on how `show` is managed. If `show` toggles, this might not be needed.
    // const timer = setTimeout(() => {
    //   if (animationClass) setAnimationClass(prev => prev.replace(' feedback-pop', '').replace(' feedback-shake', ''));
    // }, 500); // Duration of animation
    // return () => clearTimeout(timer);
  }, [show, isCorrect]); // Re-run effect if `show` or `isCorrect` changes

  if (!show || isCorrect === null) {
    return <div className="feedback-placeholder"></div>; // Takes up space but invisible
  }

  return (
    <div className={`feedback-display ${animationClass}`}>
      <div className="feedback-content">
        {isCorrect ? (
          <>
            <span className="feedback-icon">✔️</span>{' '}
            {/* Or use an image/SVG */}
            {correctMessage}
          </>
        ) : (
          <>
            <span className="feedback-icon">❌</span>{' '}
            {/* Or use an image/SVG */}
            {incorrectMessage}
            {correctAnswer !== undefined && (
              <span className="correct-answer-reveal">
                正确答案是: {correctAnswer}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FeedbackDisplay;
