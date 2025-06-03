import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/DevelopmentPage.css';
import joeyThinking from '../assets/mascot/PrismJoey_Mascot_Thinking Pose.png';

const EnglishDevelopmentPage: React.FC = () => {
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
        <h1 className="page-title">英语学习</h1>
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
            英语学习模块正在紧锣密鼓地开发中，
            <br />
            敬请期待更多精彩内容！
          </p>
          <div className="coming-soon-features">
            <h3>即将推出的功能：</h3>
            <ul>
              <li>📖 英语单词学习</li>
              <li>🗣️ 发音练习</li>
              <li>✍️ 语法练习</li>
              <li>📚 阅读理解</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EnglishDevelopmentPage;
