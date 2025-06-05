import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigationStore, useNavigationFlow } from '../stores';
import '../styles/SubjectSelectionPage.css';
import joeyThinking from '../assets/mascot/PrismJoey_Mascot_Thinking Pose.png';

const SubjectSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { setSubject, navigateToStep, goBack } = useNavigationStore();
  const { grade } = useNavigationFlow();

  const selectedGrade = grade || '1';

  const gradeLabels: { [key: string]: string } = {
    '1': '一年级',
    '2': '二年级',
    '3': '三年级',
    '4': '四年级',
    '5': '五年级',
    '6': '六年级',
  };

  const handleMathematicsClick = () => {
    setSubject('mathematics');
    navigateToStep('mathematics-options');
    navigate('/mathematics-options');
  };

  const handleEnglishClick = () => {
    setSubject('english');
    navigateToStep('english-development');
    navigate('/english-development');
  };

  const handleGeneralKnowledgeClick = () => {
    setSubject('general-knowledge');
    navigateToStep('general-knowledge-development');
    navigate('/general-knowledge-development');
  };

  const handleBackClick = () => {
    const previousStep = goBack();
    if (previousStep) {
      navigate('/grade-selection');
    }
  };

  return (
    <div className="subject-selection-container">
      <header className="subject-selection-header">
        <button className="back-button" onClick={handleBackClick}>
          ← 返回
        </button>
        <div className="title-section">
          <h1 className="page-title">选择学习科目</h1>
          <div className="grade-indicator">
            {gradeLabels[selectedGrade]} 学习内容
          </div>
        </div>
        <img
          src={joeyThinking}
          alt="Joey Thinking"
          className="mascot-thinking"
        />
      </header>

      <main className="subject-selection-main">
        <div className="subjects-grid">
          <button
            className="subject-card subject-math"
            onClick={handleMathematicsClick}
          >
            <div className="subject-icon">📊</div>
            <h2>数学</h2>
            <p>练习数学基础知识</p>
          </button>

          <button
            className="subject-card subject-english"
            onClick={handleEnglishClick}
          >
            <div className="subject-icon">📚</div>
            <h2>英语</h2>
            <p>学习英语语言技能</p>
          </button>

          <button
            className="subject-card subject-general"
            onClick={handleGeneralKnowledgeClick}
          >
            <div className="subject-icon">🌟</div>
            <h2>通识知识</h2>
            <p>探索各种有趣的知识</p>
          </button>
        </div>
      </main>

      <footer className="subject-selection-footer">
        <p>选择你想要学习的科目开始学习之旅！</p>
      </footer>
    </div>
  );
};

export default SubjectSelectionPage;
