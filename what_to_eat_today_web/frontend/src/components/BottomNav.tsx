import React from 'react';
import { useLocation, Link } from 'react-router-dom';

const TABS = [
  { icon: '🏠', label: '首页', path: '/' },
  { icon: '🏫', label: '食堂', path: '/canteens' },
  { icon: '⭐', label: '推荐', path: '/recommended' },
  { icon: '📝', label: '评价', path: '/comments' },
  { icon: '👤', label: '我的', path: '/user' },
];

const BottomNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <Link
          key={tab.label}
          to={tab.path}
          className={`bottom-nav-item ${location.pathname === tab.path ? 'active' : ''}`}
        >
          <span className="bottom-nav-icon">{tab.icon}</span>
          <span className="bottom-nav-label">{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
};

export default BottomNav;
