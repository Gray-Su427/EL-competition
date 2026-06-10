import React from 'react';

interface AISuggestionProps {
  onOpenChat: () => void;
}

/** AI 场景化饮食建议卡片 */
const AISuggestion: React.FC<AISuggestionProps> = ({ onOpenChat }) => {
  return (
    <div className="ai-suggestion">
      <div className="ai-suggestion-header">
        <span className="ai-icon" aria-hidden="true">🤖</span>
        <div>
          <h3 className="ai-title">不知道吃什么？问问 AI</h3>
          <p className="ai-desc">
            告诉我你的口味、忌口、饥饿程度和当前状态，我来帮你推荐。
          </p>
        </div>
      </div>
      <button className="ai-btn" onClick={onOpenChat}>
        开始问问 <span aria-hidden="true">✨</span>
      </button>
    </div>
  );
};

export default AISuggestion;
