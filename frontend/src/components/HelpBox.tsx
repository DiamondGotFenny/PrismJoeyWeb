import React from 'react';
import type { HelpResponse } from '../services/api';
import '../styles/HelpBox.css';

interface HelpBoxProps {
  helpData: HelpResponse | null;
  isVisible: boolean;
  onClose: () => void;
}

const HelpBox: React.FC<HelpBoxProps> = ({ helpData, isVisible, onClose }) => {
  if (!isVisible || !helpData) {
    return null;
  }

  return (
    <div className="help-box-overlay">
      <div className="help-box">
        <div className="help-box-header">
          <h3>🤔 解题帮助</h3>
          <button className="help-close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="help-box-content">
          <div className="help-section">
            <h4>💡 题目分析</h4>
            <p className="help-content">{helpData.help_content}</p>
          </div>

          <div className="help-section">
            <h4>🧠 思考过程</h4>
            <p className="thinking-process">{helpData.thinking_process}</p>
          </div>

          <div className="help-section">
            <h4>📝 解题步骤</h4>
            <ol className="solution-steps">
              {helpData.solution_steps.map((step, index) => (
                <li key={index} className="solution-step">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="help-box-footer">
          <button className="help-got-it-button" onClick={onClose}>
            我明白了
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpBox;
