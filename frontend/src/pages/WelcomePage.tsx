import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import './../styles/WelcomePage.css'; // Adjusted path
import prismJoeyLogo from '../assets/images/prism_joey_logo.png'; // Corrected import path for the logo
import joeyWaving from '../assets/mascot/PrismJoey_Mascot_Waving Pose.png'; // Import joey waving mascot

const WelcomePage: React.FC = () => {
  const navigate = useNavigate(); // Initialize useNavigate

  const handleStartLearning = () => {
    navigate('/difficulty-selection'); // Navigate to difficulty selection
  };

  const handleAchievements = () => {
    // TODO: Navigate to achievements page when it's created
    alert('成就页面正在开发中！');
  };

  return (
    <div className="welcome-container">
      <header className="welcome-header">
        <img src={prismJoeyLogo} alt="PrismJoey Logo" className="app-logo" />
      </header>
      <main className="welcome-main">
        <div className="welcome-buttons">
          <button
            className="button-prism button-blue"
            onClick={handleStartLearning}
          >
            <img src={joeyWaving} alt="Joey Waving" className="button-mascot" />
            开始学习
          </button>
          <button
            className="button-prism button-orange"
            onClick={handleAchievements}
          >
            我的成就
          </button>
        </div>
      </main>
      <footer className="welcome-footer">
        <p>为小 Joey 打造的互动学习乐园！</p>
        <p>Interactive learning for Joey!</p>
      </footer>
    </div>
  );
};

export default WelcomePage;
