import React from 'react';
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
    externalOperandDigits,
    externalResultDigits,
  });
  const {
    columnar_operands,
    columnar_operation,
    columnar_result_placeholders,
  } = question;

  const baseOperands = columnar_operands || [];
  const baseResultPlaceholders = columnar_result_placeholders || [];

  const displayOperands = externalOperandDigits || baseOperands;
  const displayResult = externalResultDigits || baseResultPlaceholders;

  console.log('[ColumnarCalculation] Data analysis:', {
    baseOperands,
    baseResultPlaceholders,
    displayOperands,
    displayResult,
  });

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

    const iconSize: 'small' | 'medium' | 'large' = 'medium'; // Changed back to medium
    // Operator can be slightly larger if desired, but small should be consistent
    // if (type === 'operator') iconSize = 'medium';

    const iconColorFinal = undefined;

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

    // Actual digit
    return (
      <div
        className={`digit-cell digit-entry ${isActive ? 'active' : ''} ${
          isInteractive ? 'interactive-digit' : ''
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
