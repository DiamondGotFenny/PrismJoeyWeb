import React, { useState, useEffect, useRef } from 'react';
import type { Question } from '../services/api';
import '../styles/ColumnarCalculation.css';

interface ColumnarCalculationProps {
  question: Question;
  onAnswerChange: (
    answer: string,
    operandsWithBlanks: (number | null)[][],
    resultDigits: (number | null)[]
  ) => void;
  showCorrectAnswer?: boolean;
  onInputFocus?: (
    type: 'operand' | 'result',
    digitIndex: number,
    rowIndex?: number
  ) => void;
  activeInput?: {
    type: 'operand' | 'result';
    rowIndex?: number;
    digitIndex: number;
  } | null;
  // Allow parent to control the component's state
  externalOperandDigits?: (number | null)[][];
  externalResultDigits?: (number | null)[];
}

const ColumnarCalculation: React.FC<ColumnarCalculationProps> = ({
  question,
  onAnswerChange,
  showCorrectAnswer = false,
  onInputFocus,
  activeInput,
  externalOperandDigits,
  externalResultDigits,
}) => {
  const {
    columnar_operands,
    columnar_operation,
    columnar_result_placeholders,
  } = question;

  // Initialize state for both operands and result
  const [operandDigits, setOperandDigits] = useState<(number | null)[][]>([]);
  const [resultDigits, setResultDigits] = useState<(number | null)[]>([]);
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);
  const resultInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (columnar_operands) {
      if (showCorrectAnswer) {
        // Logic to show correct answer (reconstruct from question.operands and question.correct_answer)
        // This part needs to be careful as question.correct_answer is now Optional[int]
        // For columnar, if we want to show a "filled" state, it would be based on original operands and their sum.
        const originalOperands = question.operands || []; // These are the full numbers
        if (originalOperands.length > 0 && columnar_operands.length > 0) {
          const overallMaxDigits = Math.max(
            ...columnar_operands.map((row) => row.length),
            columnar_result_placeholders?.length || 0
          );

          const displayedOperands = originalOperands.map((num) =>
            num
              .toString()
              .padStart(overallMaxDigits, '0')
              .split('')
              .map((d) => parseInt(d, 10))
          );
          setOperandDigits(displayedOperands);

          if (question.columnar_operation === '+') {
            const sum = originalOperands.reduce((acc, val) => acc + val, 0);
            const displayedResult = sum
              .toString()
              .padStart(overallMaxDigits, '0')
              .split('')
              .map((d) => parseInt(d, 10));
            setResultDigits(displayedResult);
          } // Add other operations if needed for showCorrectAnswer
          else {
            // Fallback for showing correct answer if operation not handled or result not available
            setResultDigits((columnar_result_placeholders || []).map(() => 0));
          }
        } else {
          // Fallback if original operands are not available
          setOperandDigits(
            columnar_operands.map((row) => row.map((d) => (d === null ? 0 : d)))
          );
          setResultDigits(
            (columnar_result_placeholders || []).map((d) =>
              d === null ? 0 : d
            )
          );
        }
      } else {
        const operandsWithBlanks = columnar_operands.map((row) => [...row]);
        setOperandDigits(operandsWithBlanks);
      }
      inputRefs.current = columnar_operands.map((row) => row.map(() => null));
    } else {
      setOperandDigits([]);
      inputRefs.current = [];
    }

    if (columnar_result_placeholders) {
      if (!showCorrectAnswer) {
        // only set if not showing correct answer, as above handles it
        setResultDigits([...columnar_result_placeholders]);
      }
      resultInputRefs.current = columnar_result_placeholders.map(() => null);
    } else {
      setResultDigits([]);
      resultInputRefs.current = [];
    }
  }, [
    columnar_operands,
    columnar_result_placeholders,
    showCorrectAnswer,
    question.operands, // Added dependency
    question.columnar_operation, // Added dependency
  ]);

  // Update internal state when external state changes (from keypad)
  useEffect(() => {
    if (externalOperandDigits && !showCorrectAnswer) {
      setOperandDigits(externalOperandDigits);
    }
  }, [externalOperandDigits, showCorrectAnswer]);

  useEffect(() => {
    if (externalResultDigits && !showCorrectAnswer) {
      setResultDigits(externalResultDigits);
    }
  }, [externalResultDigits, showCorrectAnswer]);

  const handleOperandInputChange = (
    rowIndex: number,
    digitIndex: number,
    value: string
  ) => {
    if (value === '' || (/^\d$/.test(value) && value.length <= 1)) {
      const newDigit = value === '' ? null : parseInt(value, 10);
      const newOperandDigits = operandDigits.map((row) => [...row]); // Ensure deep copy for state update
      newOperandDigits[rowIndex][digitIndex] = newDigit;
      setOperandDigits(newOperandDigits);
      notifyAnswerChange(newOperandDigits, resultDigits);

      if (value !== '' && digitIndex < newOperandDigits[rowIndex].length - 1) {
        const nextInput = inputRefs.current[rowIndex][digitIndex + 1];
        if (nextInput && newOperandDigits[rowIndex][digitIndex + 1] === null) {
          nextInput.focus();
        } else {
          findAndFocusNextInput(
            rowIndex,
            digitIndex,
            'forward',
            newOperandDigits,
            resultDigits
          );
        }
      }
    }
  };

  const handleResultInputChange = (index: number, value: string) => {
    if (value === '' || (/^\d$/.test(value) && value.length <= 1)) {
      const newDigit = value === '' ? null : parseInt(value, 10);
      const newResultDigits = [...resultDigits]; // Ensure copy for state update
      newResultDigits[index] = newDigit;
      setResultDigits(newResultDigits);
      notifyAnswerChange(operandDigits, newResultDigits);

      if (value !== '' && index < newResultDigits.length - 1) {
        const nextInput = resultInputRefs.current[index + 1];
        if (nextInput && newResultDigits[index + 1] === null) {
          nextInput.focus();
        } else {
          for (let i = index + 1; i < resultInputRefs.current.length; i++) {
            if (resultInputRefs.current[i] && newResultDigits[i] === null) {
              resultInputRefs.current[i]?.focus();
              break;
            }
          }
        }
      }
    }
  };

  const findAndFocusNextInput = (
    currentRow: number,
    currentDigit: number,
    direction: 'forward' | 'backward', // direction might not be fully used here yet
    currentOperandDigits: (number | null)[][],
    currentResultDigits: (number | null)[]
  ) => {
    if (direction === 'forward') {
      for (
        let i = currentDigit + 1;
        i < inputRefs.current[currentRow].length;
        i++
      ) {
        if (
          inputRefs.current[currentRow][i] &&
          currentOperandDigits[currentRow][i] === null
        ) {
          inputRefs.current[currentRow][i]?.focus();
          return;
        }
      }
      for (let row = currentRow + 1; row < inputRefs.current.length; row++) {
        for (let digit = 0; digit < inputRefs.current[row].length; digit++) {
          if (
            inputRefs.current[row][digit] &&
            currentOperandDigits[row][digit] === null
          ) {
            inputRefs.current[row][digit]?.focus();
            return;
          }
        }
      }
      for (let i = 0; i < resultInputRefs.current.length; i++) {
        if (resultInputRefs.current[i] && currentResultDigits[i] === null) {
          resultInputRefs.current[i]?.focus();
          return;
        }
      }
    }
  };

  const notifyAnswerChange = (
    newOperandDigits: (number | null)[][],
    newResultDigits: (number | null)[]
  ) => {
    const operandStrings = newOperandDigits.map((row) =>
      row.map((digit) => (digit !== null ? digit.toString() : '')).join('')
    );
    const resultString = newResultDigits
      .map((digit) => (digit !== null ? digit.toString() : ''))
      .join('');
    const combinedAnswer = `${operandStrings.join('|')}=${resultString}`;

    onAnswerChange(combinedAnswer, newOperandDigits, newResultDigits);
  };

  const handleOperandKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    digitIndex: number
  ) => {
    if (
      e.key === 'Backspace' &&
      operandDigits[rowIndex][digitIndex] === null &&
      digitIndex > 0
    ) {
      // If current input is empty and backspace is pressed, move to previous input
      const prevInput = inputRefs.current[rowIndex][digitIndex - 1];
      if (prevInput && operandDigits[rowIndex][digitIndex - 1] === null) {
        prevInput.focus();
      } else {
        for (let i = digitIndex - 1; i >= 0; i--) {
          if (
            inputRefs.current[rowIndex][i] &&
            operandDigits[rowIndex][i] === null
          ) {
            inputRefs.current[rowIndex][i]?.focus();
            break;
          }
        }
      }
    }
  };

  const handleResultKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === 'Backspace' && resultDigits[index] === null && index > 0) {
      // If current input is empty and backspace is pressed, move to previous input
      const prevInput = resultInputRefs.current[index - 1];
      if (prevInput && resultDigits[index - 1] === null) {
        prevInput.focus();
      } else {
        for (let i = index - 1; i >= 0; i--) {
          if (resultInputRefs.current[i] && resultDigits[i] === null) {
            resultInputRefs.current[i]?.focus();
            break;
          }
        }
      }
    }
  };

  if (!columnar_operands || columnar_operands.length === 0) {
    return <div>Error: Operands not provided for columnar calculation.</div>;
  }
  if (!columnar_result_placeholders) {
    return <div>Error: Result placeholders not provided.</div>;
  }

  const numOperands = columnar_operands.length;

  return (
    <div className="columnar-calculation-container">
      <div className="columnar-operands">
        {operandDigits.map((operandRow, rowIndex) => (
          <div key={`operand-row-${rowIndex}`} className="columnar-operand-row">
            {rowIndex === numOperands - 1 && (
              <span className="columnar-operation-symbol">
                {columnar_operation || '+'}
              </span>
            )}
            {rowIndex < numOperands - 1 && (
              <span className="columnar-operation-symbol">
                &nbsp; {/* Placeholder for alignment if not the last operand */}
              </span>
            )}
            {operandRow.map((digit, digitIndex) =>
              digit !== null || showCorrectAnswer ? (
                <span
                  key={`operand-${rowIndex}-digit-${digitIndex}`}
                  className="columnar-operand-digit"
                >
                  {digit}
                </span>
              ) : (
                <input
                  key={`operand-input-${rowIndex}-${digitIndex}`}
                  ref={(el) => {
                    inputRefs.current[rowIndex][digitIndex] = el;
                  }}
                  type="text"
                  maxLength={1}
                  className={`columnar-operand-input ${
                    activeInput?.type === 'operand' &&
                    activeInput?.rowIndex === rowIndex &&
                    activeInput?.digitIndex === digitIndex
                      ? 'active'
                      : ''
                  }`}
                  value={
                    operandDigits[rowIndex][digitIndex] === null
                      ? ''
                      : operandDigits[rowIndex][digitIndex]?.toString()
                  }
                  onChange={(e) =>
                    handleOperandInputChange(
                      rowIndex,
                      digitIndex,
                      e.target.value
                    )
                  }
                  onKeyDown={(e) =>
                    handleOperandKeyDown(e, rowIndex, digitIndex)
                  }
                  onFocus={() =>
                    onInputFocus?.('operand', digitIndex, rowIndex)
                  }
                  pattern="\d*"
                  inputMode="numeric"
                  disabled={showCorrectAnswer}
                />
              )
            )}
          </div>
        ))}
      </div>
      <div className="columnar-line"></div>
      <div className="columnar-result">
        {/* Invisible symbol for alignment with result */}
        <span className="columnar-operation-symbol">&nbsp;</span>
        {resultDigits.map((digit, index) =>
          digit !== null || showCorrectAnswer ? (
            <span
              key={`result-digit-${index}`}
              className="columnar-result-digit"
            >
              {digit}
            </span>
          ) : (
            <input
              key={`result-input-${index}`}
              ref={(el) => {
                resultInputRefs.current[index] = el;
              }}
              type="text" // Using text to allow single char and better control
              maxLength={1}
              className={`columnar-result-input ${
                activeInput?.type === 'result' &&
                activeInput?.digitIndex === index
                  ? 'active'
                  : ''
              }`}
              value={
                resultDigits[index] === null
                  ? ''
                  : resultDigits[index]?.toString()
              } // Controlled component
              onChange={(e) => handleResultInputChange(index, e.target.value)}
              onKeyDown={(e) => handleResultKeyDown(e, index)}
              onFocus={() => onInputFocus?.('result', index)}
              pattern="\d*" // Hint for numeric input, though validation is in JS
              inputMode="numeric" // Show numeric keyboard on mobile
              disabled={showCorrectAnswer}
            />
          )
        )}
      </div>
    </div>
  );
};

export default ColumnarCalculation;
