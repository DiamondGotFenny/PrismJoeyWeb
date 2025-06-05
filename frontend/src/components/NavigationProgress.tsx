import React from 'react';
import { useNavigationSummary } from '../stores';
import type { NavigationStep } from '../stores';
import '../styles/NavigationProgress.css';

const NavigationProgress: React.FC = () => {
  const { currentStep, completedSteps, progress } = useNavigationSummary();

  const stepLabels: Record<NavigationStep, string> = {
    welcome: '欢迎',
    'grade-selection': '选择年级',
    'subject-selection': '选择科目',
    'mathematics-options': '数学选项',
    'english-development': '英语开发',
    'general-knowledge-development': '常识开发',
    'difficulty-selection': '选择难度',
    practice: '练习',
    summary: '总结',
  };

  return (
    <div className="navigation-progress">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="progress-steps">
        {Object.entries(stepLabels).map(([step, label]) => (
          <div
            key={step}
            className={`progress-step ${
              completedSteps.includes(step as NavigationStep)
                ? 'completed'
                : currentStep === step
                  ? 'current'
                  : 'pending'
            }`}
          >
            {label}
          </div>
        ))}
      </div>
      <div className="progress-text">进度: {Math.round(progress)}%</div>
    </div>
  );
};

export default NavigationProgress;
