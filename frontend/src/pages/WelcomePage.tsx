import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import './../styles/WelcomePage.css'; // Adjusted path

const WelcomePage: React.FC = () => {
  const navigate = useNavigate(); // Initialize useNavigate

  const handleStartLearning = () => {
    navigate('/difficulty-selection'); // Navigate to difficulty selection
  };

  return (
    <div className="welcome-container">
      <header className="welcome-header">
        <div className="logo-placeholder">
          <span role="img" aria-label="Rainbow emoji" style={{fontSize: '3em'}}>🌈</span>
          <span role="img" aria-label="Stairs emoji" style={{fontSize: '3em', marginLeft: '0.2em'}}>🪜</span>
        </div>
        <h1 className="app-title-chinese">七彩阶梯</h1>
        <h2 className="app-title-english">PrismJoey</h2>
      </header>
      <main className="welcome-main">
        <button className="start-button button-interactive" onClick={handleStartLearning}>
          开始学习
        </button>
      </main>
      <footer className="welcome-footer">
        <p>为小 Joey 打造的互动学习乐园！</p>
        <p>Interactive learning for Joey!</p>
      </footer>
    </div>
  );
};

export default WelcomePage;
