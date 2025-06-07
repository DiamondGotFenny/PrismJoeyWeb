import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNavigationStore, useNavigationFlow } from '../stores';
import '../styles/SubjectSelectionPage.css';
import joeyThinking from '../assets/mascot/PrismJoey_Mascot_Thinking Pose.png';

const SubjectSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { gradeId } = useParams<{ gradeId: string }>();
  const { setSubject, navigateToStep, goBack } = useNavigationStore();
  const { grade } = useNavigationFlow();

  const selectedGrade = gradeId || grade || '1';

  const gradeLabels: { [key: string]: string } = {
    '1': '一年级',
    '2': '二年级',
    '3': '三年级',
    '4': '四年级',
    '5': '五年级',
    '6': '六年级',
  };

  const handleSubjectSelect = (subjectId: string) => {
    setSubject(subjectId);
    if (subjectId === 'mathematics') {
      navigateToStep('mathematics-options');
    } else if (subjectId === 'english') {
      navigateToStep('english-development');
    } else if (subjectId === 'general-knowledge') {
      navigateToStep('general-knowledge-development');
    }
    navigate(`/grades/${selectedGrade}/subjects/${subjectId}`);
  };

  const handleBackClick = () => {
    goBack();
    navigate(`/grades`);
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
            onClick={() => handleSubjectSelect('mathematics')}
          >
            <div className="subject-icon">📊</div>
            <h2>数学</h2>
            <p>练习数学基础知识</p>
          </button>

          <button
            className="subject-card subject-english"
            onClick={() => handleSubjectSelect('english')}
          >
            <div className="subject-icon">📚</div>
            <h2>英语</h2>
            <p>学习英语语言技能</p>
          </button>

          <button
            className="subject-card subject-general"
            onClick={() => handleSubjectSelect('general-knowledge')}
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
