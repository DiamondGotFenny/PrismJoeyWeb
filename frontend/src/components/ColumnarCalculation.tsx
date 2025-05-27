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
}

const ColumnarCalculation: React.FC<ColumnarCalculationProps> = ({
  question,
  onAnswerChange,
  showCorrectAnswer = false,
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
        // Show the complete correct answer by reconstructing from original operands
        const correctOperands = question.operands || [];
        const maxDigits = Math.max(
          ...columnar_operands.map((row) => row.length)
        );

        const reconstructedOperands = correctOperands.map((num) => {
          const digits = num
            .toString()
            .split('')
            .map((d) => parseInt(d, 10));
          // Pad with leading zeros to match the expected length
          while (digits.length < maxDigits) {
            digits.unshift(0);
          }
          return digits;
        });

        setOperandDigits(reconstructedOperands);
      } else {
        // Deep copy the operands to allow user input
        setOperandDigits(columnar_operands.map((row) => [...row]));
      }
      // Initialize refs array for operands
      inputRefs.current = columnar_operands.map((row) => row.map(() => null));
    } else {
      setOperandDigits([]);
      inputRefs.current = [];
    }

    if (columnar_result_placeholders) {
      if (showCorrectAnswer) {
        // Show the complete correct result
        const correctAnswer = question.correct_answer;
        const maxDigits = columnar_result_placeholders.length;
        const resultStr = correctAnswer.toString().padStart(maxDigits, '0');
        const correctResultDigits = resultStr
          .split('')
          .map((d) => parseInt(d, 10));
        setResultDigits(correctResultDigits);
      } else {
        setResultDigits([...columnar_result_placeholders]);
      }
      // Initialize refs array for result
      resultInputRefs.current = columnar_result_placeholders.map(() => null);
    } else {
      setResultDigits([]);
      resultInputRefs.current = [];
    }
  }, [
    columnar_operands,
    columnar_result_placeholders,
    showCorrectAnswer,
    question.operands,
    question.correct_answer,
  ]);

  const handleOperandInputChange = (
    rowIndex: number,
    digitIndex: number,
    value: string
  ) => {
    // Allow only single digit or empty string to clear
    if (value === '' || (/^\d$/.test(value) && value.length <= 1)) {
      const newDigit = value === '' ? null : parseInt(value, 10);
      const newOperandDigits = [...operandDigits];
      newOperandDigits[rowIndex][digitIndex] = newDigit;
      setOperandDigits(newOperandDigits);

      // Notify parent component
      notifyAnswerChange(newOperandDigits, resultDigits);

      // Focus management for operands
      if (value !== '' && digitIndex < newOperandDigits[rowIndex].length - 1) {
        const nextInput = inputRefs.current[rowIndex][digitIndex + 1];
        if (nextInput && newOperandDigits[rowIndex][digitIndex + 1] === null) {
          nextInput.focus();
        } else {
          // Find next input field in the same row or move to next row
          findAndFocusNextInput(rowIndex, digitIndex, 'forward');
        }
      }
    }
  };

  const handleResultInputChange = (index: number, value: string) => {
    // Allow only single digit or empty string to clear
    if (value === '' || (/^\d$/.test(value) && value.length <= 1)) {
      const newDigit = value === '' ? null : parseInt(value, 10);
      const newResultDigits = [...resultDigits];
      newResultDigits[index] = newDigit;
      setResultDigits(newResultDigits);

      // Notify parent component
      notifyAnswerChange(operandDigits, newResultDigits);

      // Focus next input if a digit was entered and it's not the last input
      if (value !== '' && index < newResultDigits.length - 1) {
        const nextInput = resultInputRefs.current[index + 1];
        if (nextInput && newResultDigits[index + 1] === null) {
          nextInput.focus();
        } else {
          // Find next available input field
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
    direction: 'forward' | 'backward'
  ) => {
    if (direction === 'forward') {
      // Try to find next input in same row
      for (
        let i = currentDigit + 1;
        i < inputRefs.current[currentRow].length;
        i++
      ) {
        if (
          inputRefs.current[currentRow][i] &&
          operandDigits[currentRow][i] === null
        ) {
          inputRefs.current[currentRow][i]?.focus();
          return;
        }
      }
      // Try next row
      for (let row = currentRow + 1; row < inputRefs.current.length; row++) {
        for (let digit = 0; digit < inputRefs.current[row].length; digit++) {
          if (
            inputRefs.current[row][digit] &&
            operandDigits[row][digit] === null
          ) {
            inputRefs.current[row][digit]?.focus();
            return;
          }
        }
      }
      // Try result row
      for (let i = 0; i < resultInputRefs.current.length; i++) {
        if (resultInputRefs.current[i] && resultDigits[i] === null) {
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
    // Create a combined answer string for validation (this might need adjustment based on backend expectations)
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
                  className="columnar-operand-input"
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
              className="columnar-result-input"
              value={
                resultDigits[index] === null
                  ? ''
                  : resultDigits[index]?.toString()
              } // Controlled component
              onChange={(e) => handleResultInputChange(index, e.target.value)}
              onKeyDown={(e) => handleResultKeyDown(e, index)}
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
