import React from 'react';

interface HeaderProps {
  searchKeyword: string;
  onSearchChange: (keyword: string) => void;
  onSearchFocus: () => void;
}

/** 顶部区域：定位、问候语、搜索框 */
const Header: React.FC<HeaderProps> = ({ searchKeyword, onSearchChange, onSearchFocus }) => {
  return (
    <header className="header">
      <div className="header-top">
        <div className="header-location">
          <span className="location-icon">📍</span>
          <span className="location-text">南京大学 · 仙林校区</span>
        </div>
        <div className="header-avatar">🍚</div>
      </div>
      <h1 className="header-greeting">今天想吃点什么？</h1>
      <div className="search-bar" onClick={onSearchFocus}>
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="搜索菜品 / 食堂 / 窗口"
          value={searchKeyword}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={onSearchFocus}
          readOnly
        />
      </div>
    </header>
  );
};

export default Header;
