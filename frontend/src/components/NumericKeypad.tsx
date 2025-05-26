import React from 'react';
import './../styles/NumericKeypad.css'; // Corrected path

interface NumericKeypadProps {
  onDigitClick: (digit: string) => void;
  onClear: () => void;
  onConfirm: () => void;
  disabled?: boolean;
}

const NumericKeypad: React.FC<NumericKeypadProps> = ({
  onDigitClick,
  onClear,
  onConfirm,
  disabled = false,
}) => {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  return (
    <div className={`numeric-keypad ${disabled ? 'keypad-disabled' : ''}`}>
      <div className="keypad-grid">
        {digits.map((digit) => (
          <button
            key={digit}
            className="keypad-button digit-button button-interactive"
            onClick={() => onDigitClick(digit)}
            disabled={disabled}
          >
            {digit}
          </button>
        ))}
        <button
          className="keypad-button action-button clear-button button-interactive"
          onClick={onClear}
          disabled={disabled}
        >
          清空
        </button>
        <button
          className="keypad-button action-button confirm-button button-interactive"
          onClick={onConfirm}
          disabled={disabled}
        >
          确认
        </button>
      </div>
    </div>
  );
};

export default NumericKeypad;
