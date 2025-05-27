import React, { useState, useEffect, useRef } from 'react';
import { Question } from '../services/api';
import '../styles/ColumnarCalculation.css';

interface ColumnarCalculationProps {
  question: Question;
  onAnswerChange: (answer: string, resultDigits: (number | null)[]) => void;
}

const ColumnarCalculation: React.FC<ColumnarCalculationProps> = ({
  question,
  onAnswerChange,
}) => {
  const {
    columnar_operands,
    columnar_operation,
    columnar_result_placeholders,
  } = question;

  // Initialize resultDigits state from columnar_result_placeholders
  // User input will update this state.
  const [resultDigits, setResultDigits] = useState<(number | null)[]>([]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (columnar_result_placeholders) {
      setResultDigits([...columnar_result_placeholders]);
      // Initialize refs array based on placeholders
      inputRefs.current = columnar_result_placeholders.map(() => null);
    } else {
      setResultDigits([]);
      inputRefs.current = [];
    }
  }, [columnar_result_placeholders]);

  const handleInputChange = (
    index: number,
    value: string
  ) => {
    // Allow only single digit or empty string to clear
    if (value === '' || (/^\d$/.test(value) && value.length <= 1)) {
      const newDigit = value === '' ? null : parseInt(value, 10);
      const newResultDigits = [...resultDigits];
      newResultDigits[index] = newDigit;
      setResultDigits(newResultDigits);

      // Convert to string for onAnswerChange, treating nulls as empty for now or a specific char
      // The parent component might decide how to interpret this fully (e.g. if all must be filled)
      const answerString = newResultDigits
        .map((digit) => (digit !== null ? digit.toString() : ''))
        .join('');
      onAnswerChange(answerString, newResultDigits);

      // Focus next input if a digit was entered and it's not the last input
      if (value !== '' && index < newResultDigits.length - 1) {
        const nextInput = inputRefs.current[index + 1];
        if (nextInput && newResultDigits[index+1] === null) { // Only jump if next is an input field
          nextInput.focus();
        } else {
          // If next is not an input (pre-filled) or it's the last one,
          // try to find the *next actual input field*
          for(let i = index + 1; i < inputRefs.current.length; i++) {
            if(inputRefs.current[i] && newResultDigits[i] === null) {
              inputRefs.current[i]?.focus();
              break;
            }
          }
        }
      }
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && resultDigits[index] === null && index > 0) {
        // If current input is empty and backspace is pressed, move to previous input
        const prevInput = inputRefs.current[index - 1];
        if (prevInput && resultDigits[index-1] === null) { // Only jump if prev is an input field
          prevInput.focus();
        } else {
           for(let i = index - 1; i >= 0; i--) {
            if(inputRefs.current[i] && newResultDigits[i] === null) {
              inputRefs.current[i]?.focus();
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
        {columnar_operands.map((operandDigits, rowIndex) => (
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
            {operandDigits.map((digit, digitIndex) => (
              <span
                key={`operand-${rowIndex}-digit-${digitIndex}`}
                className="columnar-operand-digit"
              >
                {digit !== null ? digit : ''} {/* Handle potential nulls if any */}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="columnar-line"></div>
      <div className="columnar-result">
        {/* Invisible symbol for alignment with result */}
        <span className="columnar-operation-symbol">&nbsp;</span> 
        {resultDigits.map((digit, index) =>
          digit !== null ? (
            <span key={`result-digit-${index}`} className="columnar-result-digit">
              {digit}
            </span>
          ) : (
            <input
              key={`result-input-${index}`}
              ref={el => inputRefs.current[index] = el}
              type="text" // Using text to allow single char and better control
              maxLength={1}
              className="columnar-result-input"
              value={resultDigits[index] === null ? '' : resultDigits[index]?.toString()} // Controlled component
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              pattern="\d*" // Hint for numeric input, though validation is in JS
              inputMode="numeric" // Show numeric keyboard on mobile
            />
          )
        )}
      </div>
    </div>
  );
};

export default ColumnarCalculation;
