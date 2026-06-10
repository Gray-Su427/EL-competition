import React from 'react';

interface HeaderProps {
  onSearchFocus: () => void;
}

/** 顶部区域：定位、问候语、搜索框 */
const Header: React.FC<HeaderProps> = ({ onSearchFocus }) => {
  return (
    <header className="header">
      <div className="header-top">
        <div className="header-location">
          <span className="location-icon" aria-hidden="true">📍</span>
          <span className="location-text">南京大学 · 鼓楼校区</span>
        </div>
        <div className="header-avatar" aria-hidden="true">🍚</div>
      </div>
      <h1 className="header-greeting">今天想吃点什么？</h1>
      <div className="search-bar" onClick={onSearchFocus}>
        <span className="search-icon" aria-hidden="true">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="搜索菜品 / 食堂 / 窗口"
          readOnly
          onFocus={onSearchFocus}
        />
      </div>
    </header>
  );
};

export default React.memo(Header);
