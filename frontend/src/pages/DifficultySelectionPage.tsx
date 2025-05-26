import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DifficultyLevel, getDifficultyLevels } from '../services/api';
import '../styles/DifficultySelectionPage.css'; // Corrected path

const DifficultySelectionPage: React.FC = () => {
    const [levels, setLevels] = useState<DifficultyLevel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLevels = async () => {
            try {
                setIsLoading(true);
                const data = await getDifficultyLevels();
                // Sort levels by 'order' field before setting state
                data.sort((a, b) => a.order - b.order);
                setLevels(data);
                setError(null);
            } catch (err) {
                setError('无法加载难度级别，请稍后再试。');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLevels();
    }, []);

    const handleLevelSelect = (level: DifficultyLevel) => {
        console.log('Selected difficulty:', level);
        // Navigate to a placeholder practice route, passing state
        navigate('/practice-start-placeholder', { state: { difficultyLevelId: level.id, difficultyName: level.name } });
    };

    if (isLoading) return <div className="loading-message">正在加载难度级别...</div>;
    if (error) return <div className="error-message">{error} <button className="back-button" onClick={() => navigate('/')}>返回主页</button></div>;

    return (
        <div className="difficulty-selection-container">
            <h1>选择练习难度</h1>
            <div className="difficulty-grid">
                {levels.map((level) => (
                    <button
                        key={level.id}
                        className="difficulty-button button-interactive"
                        onClick={() => handleLevelSelect(level)}
                        title={`最大数: ${level.max_number}, ${level.allow_carry ? '允许进位' : '不许进位'}, ${level.allow_borrow ? '允许退位' : '不许退位'}\n操作: ${level.operation_types.join(', ')}`}
                    >
                        {level.name}
                    </button>
                ))}
            </div>
            <button className="back-button button-interactive" onClick={() => navigate('/')}>
                返回主页
            </button>
        </div>
    );
};

export default DifficultySelectionPage;
