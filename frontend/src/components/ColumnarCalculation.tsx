import React, { useEffect, useCallback } from 'react';
import type { Question } from '../services/api';
import MathIcon from './MathIcon';
import '../styles/ColumnarCalculation.css';

interface ColumnarCalculationProps {
  question: Question;
  // onAnswerChange is utilized by the parent component (PracticePage)
  // to handle updates when the keypad interacts with this component's state.
  onAnswerChange: (
    answerString: string,
    operandsWithBlanks: (number | null)[][],
    resultDigits: (number | null)[]
  ) => void;
  showCorrectAnswer: boolean;
  onInputFocus: (
    type: 'operand' | 'result',
    digitIndex: number,
    rowIndex?: number
  ) => void;
  activeInput: {
    type: 'operand' | 'result';
    rowIndex?: number;
    digitIndex: number;
  } | null;
  externalOperandDigits?: (number | null)[][];
  externalResultDigits?: (number | null)[];
}

const ColumnarCalculation: React.FC<ColumnarCalculationProps> = ({
  question,
  onAnswerChange,
  showCorrectAnswer,
  onInputFocus,
  activeInput,
  externalOperandDigits,
  externalResultDigits,
}) => {
  console.log('[ColumnarCalculation] Rendered with props:', {
    questionId: question.id,
    questionType: question.question_type,
    hasOnAnswerChange: !!onAnswerChange,
    hasActiveInput: !!activeInput,
    showCorrectAnswer,
    externalOperandDigits,
    externalResultDigits,
  });

  const {
    columnar_operands,
    columnar_operation,
    columnar_result_placeholders,
    operands,
  } = question;

  const baseOperands = columnar_operands || [];
  const baseResultPlaceholders = columnar_result_placeholders || [];

  // When showCorrectAnswer is true, display the correct complete answer
  const getCorrectAnswerDigits = useCallback(() => {
    if (!showCorrectAnswer || !operands || operands.length < 2) {
      return null;
    }

    // Calculate the correct result based on the operation
    let correctResult = 0;
    if (columnar_operation === '+') {
      correctResult = operands.reduce((sum, num) => sum + num, 0);
    } else if (columnar_operation === '-' && operands.length >= 2) {
      correctResult = operands[0] - operands[1];
    } else if (columnar_operation === '*' && operands.length >= 2) {
      correctResult = operands.reduce((product, num) => product * num, 1);
    }

    // Convert result to digit array
    const resultStr = correctResult.toString();
    const maxLength = Math.max(
      ...baseOperands.map((op) => (op ? op.length : 0)),
      baseResultPlaceholders ? baseResultPlaceholders.length : 0,
      resultStr.length
    );

    const paddedStr = resultStr.padStart(maxLength, '0');
    return paddedStr.split('').map((digit) => parseInt(digit, 10));
  }, [
    showCorrectAnswer,
    operands,
    columnar_operation,
    baseOperands,
    baseResultPlaceholders,
  ]);

  // Get correct operands when showing correct answer
  const getCorrectOperandDigits = useCallback(() => {
    if (!showCorrectAnswer || !operands) {
      return baseOperands;
    }

    // Convert operands to digit arrays, filling in any null values
    const maxLength = Math.max(
      ...baseOperands.map((op) => (op ? op.length : 0)),
      baseResultPlaceholders ? baseResultPlaceholders.length : 0
    );

    return operands.map((operand, index) => {
      const operandStr = operand.toString().padStart(maxLength, '0');
      return operandStr.split('').map((digit, digitIndex) => {
        // If the base operand had a null at this position, show the correct digit
        const baseDigit = baseOperands[index]?.[digitIndex];
        return baseDigit === null ? parseInt(digit, 10) : baseDigit;
      });
    });
  }, [showCorrectAnswer, operands, baseOperands, baseResultPlaceholders]);

  const displayOperands = showCorrectAnswer
    ? getCorrectOperandDigits()
    : externalOperandDigits || baseOperands;
  const displayResult = showCorrectAnswer
    ? getCorrectAnswerDigits()
    : externalResultDigits || baseResultPlaceholders;

  console.log('[ColumnarCalculation] Data analysis:', {
    baseOperands,
    baseResultPlaceholders,
    displayOperands,
    displayResult,
    showCorrectAnswer,
  });

  // Keyboard event handler for numeric input
  const handleKeyboardInput = useCallback(
    (e: KeyboardEvent) => {
      // Only handle keyboard input when not showing correct answer and there's an active input
      if (showCorrectAnswer || !activeInput) {
        return;
      }

      const key = e.key;

      // Handle numeric keys (0-9)
      if (/^[0-9]$/.test(key)) {
        e.preventDefault();

        // Create a custom event to trigger the parent's handleColumnarKeypadDigit
        const digitEvent = new CustomEvent('columnarDigitInput', {
          detail: { digit: key },
        });
        document.dispatchEvent(digitEvent);
      }

      // Handle backspace/delete to clear current input
      else if (key === 'Backspace' || key === 'Delete') {
        e.preventDefault();

        // Trigger clear event
        const clearEvent = new CustomEvent('columnarClearInput');
        document.dispatchEvent(clearEvent);
      }

      // Handle Enter to submit answer
      else if (key === 'Enter') {
        e.preventDefault();

        // Trigger submit event
        const submitEvent = new CustomEvent('columnarSubmitInput');
        document.dispatchEvent(submitEvent);
      }

      // Handle Arrow keys for navigation
      else if (
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)
      ) {
        e.preventDefault();

        const navigationEvent = new CustomEvent('columnarNavigate', {
          detail: { direction: key.replace('Arrow', '').toLowerCase() },
        });
        document.dispatchEvent(navigationEvent);
      }
    },
    [showCorrectAnswer, activeInput]
  );

  // Add keyboard event listener
  useEffect(() => {
    if (!showCorrectAnswer) {
      document.addEventListener('keydown', handleKeyboardInput);

      return () => {
        document.removeEventListener('keydown', handleKeyboardInput);
      };
    }
  }, [handleKeyboardInput, showCorrectAnswer]);

  const getGridTemplateColumns = (maxLength: number) => {
    // Add 1 for the operator column
    return `repeat(${maxLength + 1}, auto)`; // Use auto for column width based on content
  };

  const maxOperandLength = Math.max(
    0,
    ...displayOperands.map((op) => (op ? op.length : 0)),
    displayResult ? displayResult.length : 0
  );

  const renderDigit = (
    digit: number | string | null,
    type: 'operand' | 'result' | 'operator' | 'placeholder',
    rowIndex?: number,
    digitIndex?: number,
    isInteractive: boolean = false
  ) => {
    const isActive =
      activeInput &&
      digitIndex !== undefined &&
      activeInput.digitIndex === digitIndex &&
      ((type === 'operand' &&
        activeInput.type === 'operand' &&
        activeInput.rowIndex === rowIndex) ||
        (type === 'result' && activeInput.type === 'result'));

    const charToRender =
      digit === null || digit === '' ? ' ' : digit.toString();
    const isPlaceholderChar = charToRender === ' ';

    const iconSize: 'small' | 'medium' | 'large' = 'medium';

    // Color coding for correct answers
    let iconColorFinal:
      | 'green'
      | 'auto'
      | 'red'
      | 'orange'
      | 'yellow'
      | 'blue'
      | 'indigo'
      | 'violet'
      | 'equals-special'
      | undefined = undefined;
    if (showCorrectAnswer && type !== 'operator' && type !== 'placeholder') {
      // Check if this digit was originally null (blank) in the base data
      const wasBlank =
        type === 'operand'
          ? baseOperands[rowIndex!]?.[digitIndex!] === null
          : baseResultPlaceholders[digitIndex!] === null;

      if (wasBlank) {
        iconColorFinal = 'green'; // Highlight correct filled-in answers
      }
    }

    const handleClick = () => {
      if (
        isInteractive &&
        !isPlaceholderChar &&
        type !== 'operator' &&
        digitIndex !== undefined
      ) {
        onInputFocus(type as 'operand' | 'result', digitIndex, rowIndex);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (
          isInteractive &&
          !isPlaceholderChar &&
          type !== 'operator' &&
          digitIndex !== undefined
        ) {
          onInputFocus(type as 'operand' | 'result', digitIndex, rowIndex);
        }
      }
    };

    const handlePlaceholderClick = () => {
      if (isInteractive && type !== 'operator' && digitIndex !== undefined) {
        onInputFocus(type as 'operand' | 'result', digitIndex, rowIndex);
      }
    };

    const handlePlaceholderKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (isInteractive && type !== 'operator' && digitIndex !== undefined) {
          onInputFocus(type as 'operand' | 'result', digitIndex, rowIndex);
        }
      }
    };

    if (type === 'operator') {
      return (
        <div className={`digit-cell operator-cell`}>
          <MathIcon
            character={charToRender}
            size={iconSize}
            color={iconColorFinal}
          />
        </div>
      );
    }

    if (type === 'placeholder' && !isInteractive) {
      // Non-interactive placeholder (padding)
      return <div className="digit-cell placeholder-padding">&nbsp;</div>;
    }

    if (isPlaceholderChar && isInteractive) {
      // Interactive placeholder (empty input)
      return (
        <div
          className={`digit-cell placeholder interactive-placeholder ${isActive ? 'active' : ''}`}
          onClick={handlePlaceholderClick}
          role="button"
          tabIndex={0}
          onKeyDown={handlePlaceholderKeyDown}
        >
          &nbsp; {/* Visual cue for emptiness */}
        </div>
      );
    }

    // Determine if this is a filled cell (was previously null/blank)
    const isFilledCell =
      type === 'operand'
        ? baseOperands[rowIndex!]?.[digitIndex!] === null && !isPlaceholderChar
        : type === 'result'
          ? baseResultPlaceholders[digitIndex!] === null && !isPlaceholderChar
          : false;

    // Actual digit
    return (
      <div
        className={`digit-cell digit-entry ${isActive ? 'active' : ''} ${
          isInteractive ? 'interactive-digit' : ''
        } ${isFilledCell ? 'filled-cell' : ''} ${
          showCorrectAnswer && iconColorFinal === 'green'
            ? 'correct-answer'
            : ''
        }`}
        onClick={handleClick}
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onKeyDown={handleKeyDown}
      >
        <MathIcon
          character={charToRender}
          size={iconSize}
          color={iconColorFinal}
        />
      </div>
    );
  };

  const gridStyle = {
    gridTemplateColumns: getGridTemplateColumns(maxOperandLength),
  };

  return (
    <div className="columnar-calculation-container">
      <div className="calculation-grid operand-grid" style={gridStyle}>
        {displayOperands.map((operand, opIndex) => (
          <React.Fragment key={`operand-row-${opIndex}`}>
            {/* Operator for the last operand row, in the first column */}
            {opIndex === displayOperands.length - 1 && columnar_operation ? (
              renderDigit(columnar_operation, 'operator')
            ) : (
              <div className="digit-cell operator-spacer">
                &nbsp;
              </div> /* Spacer for operator column */
            )}
            {/* Digits, padded with non-interactive placeholders */}
            {Array(maxOperandLength - (operand ? operand.length : 0))
              .fill(null)
              .map((_, padIndex) => (
                <React.Fragment key={`operand-${opIndex}-pad-${padIndex}`}>
                  {renderDigit(
                    ' ',
                    'placeholder',
                    opIndex,
                    padIndex + 1000,
                    false
                  )}
                </React.Fragment>
              ))}
            {(operand || []).map((digit, digitIndex) => (
              <React.Fragment key={`operand-${opIndex}-digit-${digitIndex}`}>
                {renderDigit(
                  digit,
                  'operand',
                  opIndex,
                  digitIndex,
                  baseOperands[opIndex]?.[digitIndex] === null &&
                    !showCorrectAnswer
                )}
              </React.Fragment>
            ))}
          </React.Fragment>
        ))}
      </div>

      <hr className="calculation-line" />

      <div className="calculation-grid result-grid" style={gridStyle}>
        {/* Spacer for operator column in result */}
        <div className="digit-cell operator-spacer">&nbsp;</div>

        {/* Digits, padded with non-interactive placeholders */}
        {Array(maxOperandLength - (displayResult ? displayResult.length : 0))
          .fill(null)
          .map((_, padIndex) => (
            <React.Fragment key={`result-pad-${padIndex}`}>
              {renderDigit(
                ' ',
                'placeholder',
                undefined,
                padIndex + 2000,
                false
              )}
            </React.Fragment>
          ))}
        {(displayResult || []).map((digit, digitIndex) => (
          <React.Fragment key={`result-digit-${digitIndex}`}>
            {renderDigit(
              digit,
              'result',
              undefined,
              digitIndex,
              baseResultPlaceholders[digitIndex] === null && !showCorrectAnswer
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ColumnarCalculation;
