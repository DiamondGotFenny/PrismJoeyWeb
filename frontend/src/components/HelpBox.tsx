import React from 'react';
import type { HelpResponse } from '../services/api';
import '../styles/HelpBox.css';

interface HelpBoxProps {
  helpData: HelpResponse | null;
  isVisible: boolean;
  onClose: () => void;
  error?: {
    type: 'network' | 'server' | 'llm' | 'unknown';
    message: string;
    canRetry: boolean;
  } | null;
  onRetry?: () => void;
  isLoading?: boolean;
}

const HelpBox: React.FC<HelpBoxProps> = ({
  helpData,
  isVisible,
  onClose,
  error = null,
  onRetry,
  isLoading = false,
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="help-box-overlay">
      <div className="help-box">
        <div className="help-box-header">
          <h3>🤔 解题帮助</h3>
          <button className="help-close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="help-box-content">
          {isLoading ? (
            <div className="help-loading">
              <div className="loading-spinner"></div>
              <p>AI助手正在思考中...</p>
            </div>
          ) : error ? (
            <div className="help-error">
              <div className="error-icon">⚠️</div>
              <h4>获取帮助时遇到问题</h4>
              <p className="error-message">{error.message}</p>

              {error.type === 'network' && (
                <div className="error-details">
                  <p>💡 建议：</p>
                  <ul>
                    <li>检查网络连接</li>
                    <li>稍后再试</li>
                  </ul>
                </div>
              )}

              {error.type === 'server' && (
                <div className="error-details">
                  <p>💡 建议：</p>
                  <ul>
                    <li>服务器正在处理中，请稍等片刻</li>
                    <li>如果持续出现，请联系技术支持</li>
                  </ul>
                </div>
              )}

              {error.type === 'llm' && (
                <div className="error-details">
                  <p>💡 说明：</p>
                  <ul>
                    <li>AI助手暂时不可用</li>
                    <li>您仍可以尝试自己解决或寻求其他帮助</li>
                  </ul>
                </div>
              )}

              {error.canRetry && onRetry && (
                <button className="help-retry-button" onClick={onRetry}>
                  🔄 重试
                </button>
              )}
            </div>
          ) : helpData ? (
            <>
              <div className="help-section">
                <h4>💡 题目分析</h4>
                <p className="help-content">{helpData.help_content}</p>
              </div>

              <div className="help-section">
                <h4>🧠 思考过程</h4>
                <p className="thinking-process">{helpData.thinking_process}</p>
              </div>

              <div className="help-section">
                <h4>📝 解题步骤</h4>
                <ul className="solution-steps">
                  {helpData.solution_steps.map((step, index) => (
                    <li key={index} className="solution-step">
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="help-empty">
              <p>暂无帮助内容</p>
            </div>
          )}
        </div>

        <div className="help-box-footer">
          <button className="help-got-it-button" onClick={onClose}>
            {error ? '知道了' : '我明白了'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpBox;
