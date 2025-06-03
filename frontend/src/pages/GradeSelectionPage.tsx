import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/GradeSelectionPage.css';
import joeyWaving from '../assets/mascot/PrismJoey_Mascot_Waving Pose.png';

const GradeSelectionPage: React.FC = () => {
  const navigate = useNavigate();

  const grades = [
    { value: '1', label: '一年级', color: 'red' },
    { value: '2', label: '二年级', color: 'orange' },
    { value: '3', label: '三年级', color: 'yellow' },
    { value: '4', label: '四年级', color: 'green' },
    { value: '5', label: '五年级', color: 'blue' },
    { value: '6', label: '六年级', color: 'violet' },
  ];

  const handleGradeSelect = (grade: string) => {
    // Navigate to subject selection with selected grade
    navigate('/subject-selection', { state: { selectedGrade: grade } });
  };

  const handleBackClick = () => {
    navigate('/');
  };

  return (
    <div className="grade-selection-container">
      <header className="grade-selection-header">
        <button className="back-button" onClick={handleBackClick}>
          ← 返回
        </button>
        <h1 className="page-title">选择年级</h1>
        <img src={joeyWaving} alt="Joey Waving" className="mascot-waving" />
      </header>

      <main className="grade-selection-main">
        <div className="grade-intro">
          <p>请选择你的年级开始学习之旅！</p>
        </div>

        <div className="grades-grid">
          {grades.map((grade) => (
            <button
              key={grade.value}
              className={`grade-card grade-${grade.color}`}
              onClick={() => handleGradeSelect(grade.value)}
            >
              <div className="grade-number">{grade.value}</div>
              <h2 className="grade-label">{grade.label}</h2>
              <div className="grade-description">
                适合{grade.label}的学习内容
              </div>
            </button>
          ))}
        </div>
      </main>

      <footer className="grade-selection-footer">
        <p>选择适合你的年级，获得最佳学习体验！</p>
      </footer>
    </div>
  );
};

export default GradeSelectionPage;
