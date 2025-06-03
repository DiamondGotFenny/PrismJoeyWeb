import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/DevelopmentPage.css';
import joeyThinking from '../assets/mascot/PrismJoey_Mascot_Thinking Pose.png';

const GeneralKnowledgeDevelopmentPage: React.FC = () => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate('/subject-selection');
  };

  return (
    <div className="development-container">
      <header className="development-header">
        <button className="back-button" onClick={handleBackClick}>
          ← 返回
        </button>
        <h1 className="page-title">通识知识</h1>
      </header>

      <main className="development-main">
        <div className="development-content">
          <img
            src={joeyThinking}
            alt="Joey Thinking"
            className="mascot-large"
          />
          <h2 className="development-title">正在开发....</h2>
          <p className="development-message">
            通识知识学习模块正在紧锣密鼓地开发中，
            <br />
            敬请期待更多精彩内容！
          </p>
          <div className="coming-soon-features">
            <h3>即将推出的功能：</h3>
            <ul>
              <li>🌍 地理知识</li>
              <li>🏛️ 历史故事</li>
              <li>🔬 科学探索</li>
              <li>🎨 艺术欣赏</li>
              <li>🌱 自然常识</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GeneralKnowledgeDevelopmentPage;
