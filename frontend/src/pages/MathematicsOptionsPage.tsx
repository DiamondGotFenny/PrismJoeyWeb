import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/MathematicsOptionsPage.css';
import joeyWaving from '../assets/mascot/PrismJoey_Mascot_Waving Pose.png';

const MathematicsOptionsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedGrade = location.state?.selectedGrade || '1';

  const gradeLabels: { [key: string]: string } = {
    '1': '一年级',
    '2': '二年级',
    '3': '三年级',
    '4': '四年级',
    '5': '五年级',
    '6': '六年级',
  };

  const handlePracticeExercisesClick = () => {
    if (selectedGrade === '1') {
      // Only Grade 1 has working practice exercises
      navigate('/difficulty-selection');
    } else {
      // Other grades show development message
      alert(`${gradeLabels[selectedGrade]}练习题正在开发中...`);
    }
  };

  const handleMentalArithmeticClick = () => {
    // Placeholder for future development
    alert(`${gradeLabels[selectedGrade]}心算练习正在开发中...`);
  };

  const handleMathScenariosClick = () => {
    // Placeholder for future development
    alert(`${gradeLabels[selectedGrade]}数学应用场景正在开发中...`);
  };

  const handleFunMathClick = () => {
    // Placeholder for future development
    alert(`${gradeLabels[selectedGrade]}趣味数学正在开发中...`);
  };

  const handleBackClick = () => {
    navigate('/subject-selection', { state: { selectedGrade } });
  };

  return (
    <div className="mathematics-options-container">
      <header className="mathematics-options-header">
        <button className="back-button" onClick={handleBackClick}>
          ← 返回
        </button>
        <div className="title-section">
          <h1 className="page-title">数学学习</h1>
          <div className="grade-indicator">
            {gradeLabels[selectedGrade]} 数学内容
          </div>
        </div>
        <img src={joeyWaving} alt="Joey Waving" className="mascot-waving" />
      </header>

      <main className="mathematics-options-main">
        <div className="math-options-grid">
          <button
            className={`math-option-card practice-exercises ${selectedGrade === '1' ? 'available' : 'developing'}`}
            onClick={handlePracticeExercisesClick}
          >
            <div className="math-option-icon">📝</div>
            <h3>练习题</h3>
            <p>基础数学练习题</p>
            {selectedGrade !== '1' && (
              <div className="developing-badge">开发中</div>
            )}
          </button>

          <button
            className="math-option-card mental-arithmetic developing"
            onClick={handleMentalArithmeticClick}
          >
            <div className="math-option-icon">🧠</div>
            <h3>心算</h3>
            <p>提高心算能力</p>
            <div className="developing-badge">开发中</div>
          </button>

          <button
            className="math-option-card math-scenarios developing"
            onClick={handleMathScenariosClick}
          >
            <div className="math-option-icon">🏪</div>
            <h3>小数学应用场景</h3>
            <p>实际生活中的数学应用</p>
            <div className="developing-badge">开发中</div>
          </button>

          <button
            className="math-option-card fun-math developing"
            onClick={handleFunMathClick}
          >
            <div className="math-option-icon">🎮</div>
            <h3>趣味数学</h3>
            <p>有趣的数学游戏</p>
            <div className="developing-badge">开发中</div>
          </button>
        </div>
      </main>

      <footer className="mathematics-options-footer">
        <p>选择你感兴趣的数学学习方式！</p>
      </footer>
    </div>
  );
};

export default MathematicsOptionsPage;
