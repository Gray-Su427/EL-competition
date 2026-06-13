import React from 'react';
import { useNavigate } from 'react-router-dom';

interface QuickEntryProps {
  onAIClick: () => void;
}

/** 快捷入口 */
const QuickEntry: React.FC<QuickEntryProps> = ({ onAIClick }) => {
  const navigate = useNavigate();
  const entries = [
    { icon: '🏫', label: '附近食堂', action: () => navigate('/canteens') },
    { icon: '🤖', label: 'AI 问问', action: onAIClick },
    { icon: '✍️', label: '我要评价', action: () => navigate('/comments') },
  ];

  return (
    <div className="quick-entry">
      {entries.map((entry) => (
        <button
          key={entry.label}
          className="quick-entry-item"
          onClick={entry.action}
        >
          <span className="quick-entry-icon" aria-hidden="true">{entry.icon}</span>
          <span className="quick-entry-label">{entry.label}</span>
        </button>
      ))}
    </div>
  );
};

export default QuickEntry;
