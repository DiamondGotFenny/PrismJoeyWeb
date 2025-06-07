import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNavigationStore, useDifficultyLevels } from '../stores';
import '../styles/DifficultySelectionPage.css'; // Corrected path

const DifficultySelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { gradeId, subjectId } = useParams<{
    gradeId: string;
    subjectId: string;
  }>();
  const { levels, isLoading, error, refetch } = useDifficultyLevels();

  const { setDifficulty, navigateToStep, goBack } = useNavigationStore();

  useEffect(() => {
    // Fetch difficulty levels using the API store
    refetch();
  }, [refetch]);

  const handleLevelSelect = (level: NonNullable<typeof levels>[0]) => {
    console.log('Selected difficulty:', level);

    // Update navigation store with selected difficulty
    setDifficulty(level);
    navigateToStep('practice');

    // Navigate to practice page
    navigate(`/grades/${gradeId}/subjects/${subjectId}/practice/session`);
  };

  const handleBackClick = () => {
    goBack();
    navigate(`/grades/${gradeId}/subjects/${subjectId}`);
  };

  if (isLoading)
    return <div className="loading-message">正在加载难度级别...</div>;
  if (error)
    return (
      <div className="error-message">
        {error.message}{' '}
        <button className="back-button" onClick={handleBackClick}>
          返回
        </button>
      </div>
    );

  return (
    <div className="difficulty-selection-container">
      <h1>选择练习难度</h1>
      <div className="difficulty-grid">
        {levels?.map((level) => (
          <button
            key={level.id}
            className="difficulty-button button-interactive"
            onClick={() => handleLevelSelect(level)}
            title={`最大数: ${level.max_number}, ${level.allow_carry ? '允许进位' : '不许进位'}, ${level.allow_borrow ? '允许退位' : '不许退位'}\n操作: ${level.operation_types.join(', ')}`}
          >
            {level.name}
          </button>
        )) || <div>暂无难度级别数据</div>}
      </div>
      <button
        className="back-button button-interactive"
        onClick={handleBackClick}
      >
        返回
      </button>
    </div>
  );
};

export default DifficultySelectionPage;
