import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ColumnarCalculation from './ColumnarCalculation';
import { Question } from '../services/api'; // Assuming path is correct

// Mock the CSS import
jest.mock('../styles/ColumnarCalculation.css', () => ({}));

describe('ColumnarCalculation Component', () => {
  const mockOnAnswerChange = jest.fn();

  const sampleQuestion: Question = {
    id: 'q1',
    session_id: 's1',
    operands: [12, 34], // For string "12 + 34"
    operations: ['+'],
    question_string: '12 + 34',
    correct_answer: 46,
    difficulty_level_id: 1,
    created_at: new Date().toISOString(),
    question_type: 'columnar',
    columnar_operands: [[1, 2], [3, 4]], // Represents 12 and 34
    columnar_operation: '+',
    // For 12 + 34 = 46. Let's say placeholders are [0, 4, null] meaning result is expected to be like "04X" initially
    // Or, more realistically for 46, placeholders might be [null, null] or [0, null, 6] if padding to 3 digits
    // Let's use a simpler case: 12+34 = 46. Placeholders: [null, 6] (user fills the tens digit)
    // Or even better for testing: result 46, placeholders [null, null]
    // Let's try with 12+34 = 46. Placeholders [null,null]
    columnar_result_placeholders: [null, null] 
  };
  
  const sampleQuestionWithPaddedResult: Question = {
    ...sampleQuestion,
    correct_answer: 46, // e.g. 12 + 34 = 46
    // operands might be padded to 3 digits if result is 100+
    // for 46, if result is padded to 3 digits like 046
    columnar_result_placeholders: [0, null, 6] // User needs to fill the middle '4'
  };


  beforeEach(() => {
    mockOnAnswerChange.mockClear();
  });

  test('Basic Rendering Test: Renders operands, operation, and placeholders correctly', () => {
    render(
      <ColumnarCalculation
        question={sampleQuestion}
        onAnswerChange={mockOnAnswerChange}
      />
    );

    // Check operands
    // First operand "12"
    const firstOperandRow = screen.getByText(/1\s*2/).closest('.columnar-operand-row');
    expect(firstOperandRow).toBeInTheDocument();
    if (firstOperandRow) { // Check only if found
        expect(within(firstOperandRow).getByText('1')).toBeInTheDocument();
        expect(within(firstOperandRow).getByText('2')).toBeInTheDocument();
    }


    // Second operand "34"
    // The structure might be tricky if digits are separate spans.
    // A better way is to look for the row and then digits within.
    const secondOperandRow = screen.getByText(/3\s*4/).closest('.columnar-operand-row');
    expect(secondOperandRow).toBeInTheDocument();
    if (secondOperandRow) {
        expect(within(secondOperandRow).getByText('3')).toBeInTheDocument();
        expect(within(secondOperandRow).getByText('4')).toBeInTheDocument();
        // Check for operation symbol in the second operand row (or wherever it's placed)
        expect(within(secondOperandRow).getByText('+')).toBeInTheDocument();
    }


    // Check result placeholders - for sampleQuestion, two input fields
    const resultRow = screen.getByRole('group', { name: /result/i }); // Assuming result section has an accessible name or use a test-id
    // For now, let's query all inputs. ColumnarCalculation might need a wrapper with aria-label for result for better querying.
    // Or query by class if structure is stable.
    const inputs = screen.getAllByRole('textbox'); // type=text implies textbox role
    expect(inputs).toHaveLength(sampleQuestion.columnar_result_placeholders?.filter(p => p === null).length || 0);
    
    // Check for pre-filled digits if any (not in sampleQuestion, but in sampleQuestionWithPaddedResult)
  });

  test('Basic Rendering Test: Renders with pre-filled result digits and one input', () => {
    render(
        <ColumnarCalculation
          question={sampleQuestionWithPaddedResult}
          onAnswerChange={mockOnAnswerChange}
        />
      );
      // Result placeholders: [0, null, 6]
      // Expect '0' and '6' to be displayed as text, and one input field.
      expect(screen.getByText('0')).toBeInTheDocument(); // This is the pre-filled '0'
      expect(screen.getByText('6')).toBeInTheDocument(); // This is the pre-filled '6'
  
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(1); // Only one null placeholder
  });


  test('Input Change Test: Typing into an input field calls onAnswerChange correctly', () => {
    render(
      <ColumnarCalculation
        question={sampleQuestion} // columnar_result_placeholders: [null, null]
        onAnswerChange={mockOnAnswerChange}
      />
    );

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(2);

    // Simulate typing '4' into the first input field
    fireEvent.change(inputs[0], { target: { value: '4' } });
    // Expected: resultDigits = [4, null], answerString = "4" (or "4 " if we join with space for nulls)
    // The component joins with empty string for null: "4"
    expect(mockOnAnswerChange).toHaveBeenLastCalledWith("4", [4, null]);

    // Simulate typing '6' into the second input field
    fireEvent.change(inputs[1], { target: { value: '6' } });
    // Expected: resultDigits = [4, 6] (assuming state from previous change is maintained, which it should)
    // answerString = "46"
    expect(mockOnAnswerChange).toHaveBeenLastCalledWith("46", [4, 6]);
  });

  test('Input Change Test: Typing into the input for the padded question', () => {
    render(
        <ColumnarCalculation
          question={sampleQuestionWithPaddedResult} // placeholders: [0, null, 6]
          onAnswerChange={mockOnAnswerChange}
        />
      );
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(1); // Only one input field

      // Simulate typing '4' into the input field
      fireEvent.change(inputs[0], { target: { value: '4' } });
      // Expected: resultDigits = [0, 4, 6], answerString = "046"
      expect(mockOnAnswerChange).toHaveBeenCalledWith("046", [0, 4, 6]);
  });

  test('Input Validation: Accepts only single digits', () => {
    render(
      <ColumnarCalculation
        question={sampleQuestion} // placeholders: [null, null]
        onAnswerChange={mockOnAnswerChange}
      />
    );
    const inputs = screen.getAllByRole('textbox');
    
    // Try typing '12' (invalid)
    fireEvent.change(inputs[0], { target: { value: '12' } });
    // onAnswerChange should not have been called with '12'
    // The component's handleInputChange prevents value from being set beyond 1 char
    // So, the value of inputs[0] should remain empty or its previous single-digit value.
    // Let's check if onAnswerChange was called with an empty string or a single digit.
    // If it was initially [null,null], after '12', it should effectively ignore '12'.
    // The mock was cleared, so it should not have been called if '12' is rejected.
    // However, our component logic allows value="", then calls onAnswerChange with ("",[null,null]) or similar.
    // The current test setup for onAnswerChange for "12" depends on exact component logic.
    // The component's `handleInputChange` has `if (value === '' || (/^\d$/.test(value) && value.length <= 1))`
    // So "12" will not pass this. `onAnswerChange` will not be called with "12".
    // Let's verify the input value itself.
    expect(inputs[0]).toHaveValue(''); // It should not accept "12"

    // Try typing 'a' (invalid)
    fireEvent.change(inputs[0], { target: { value: 'a' } });
    expect(inputs[0]).toHaveValue(''); // Should not accept "a"
    
    // Try typing '5' (valid)
    fireEvent.change(inputs[0], { target: { value: '5' } });
    expect(inputs[0]).toHaveValue('5'); // Should accept "5"
    expect(mockOnAnswerChange).toHaveBeenLastCalledWith("5", [5, null]);
  });
  
  test('Focus Management: Auto-focus next input on digit entry', () => {
    render(
      <ColumnarCalculation
        question={sampleQuestion} // placeholders: [null, null]
        onAnswerChange={mockOnAnswerChange}
      />
    );
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(2);

    // Type into the first input
    fireEvent.change(inputs[0], { target: { value: '4' } });
    // Check if the second input field has focus
    expect(inputs[1]).toHaveFocus();
  });

  test('Focus Management: Backspace moves focus to previous input if current is empty', () => {
    render(
      <ColumnarCalculation
        question={sampleQuestion} // placeholders: [null, null]
        onAnswerChange={mockOnAnswerChange}
      />
    );
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(2);

    // Focus the second input first
    inputs[1].focus();
    expect(inputs[1]).toHaveFocus(); // Ensure it's focused

    // Simulate typing then deleting to make it empty (if needed, but starts empty)
    // fireEvent.change(inputs[1], { target: { value: '6' } });
    // fireEvent.change(inputs[1], { target: { value: '' } });
    // expect(inputs[1]).toHaveValue('');


    // Press Backspace in the second (empty) input
    fireEvent.keyDown(inputs[1], { key: 'Backspace', code: 'Backspace' });
    
    // Check if the first input field has focus
    expect(inputs[0]).toHaveFocus();
  });

  test('Focus Management: Backspace in first empty input does not error', () => {
    render(
      <ColumnarCalculation
        question={sampleQuestion} // placeholders: [null, null]
        onAnswerChange={mockOnAnswerChange}
      />
    );
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(2);

    // Focus the first input
    inputs[0].focus();
    // Press Backspace in the first (empty) input
    fireEvent.keyDown(inputs[0], { key: 'Backspace', code: 'Backspace' });
    // No error should occur, and focus should remain on the first input
    expect(inputs[0]).toHaveFocus(); 
  });
  
  test('Focus Management: Auto-focus skips pre-filled digits', () => {
    const questionWithMixedPlaceholders: Question = {
        ...sampleQuestion,
        columnar_result_placeholders: [null, 5, null] // Input, Text, Input
    };
    render(
        <ColumnarCalculation
          question={questionWithMixedPlaceholders}
          onAnswerChange={mockOnAnswerChange}
        />
      );
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(2); // Two input fields

      // Type into the first input
      fireEvent.change(inputs[0], { target: { value: '1' } });
      // The digit '5' is pre-filled at index 1.
      // Focus should move to the input at index 2 (which is inputs[1] in the array of inputs)
      expect(inputs[1]).toHaveFocus();
  });

});
