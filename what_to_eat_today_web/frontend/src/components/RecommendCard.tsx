import React from 'react';
import type { Dish } from '../types';

interface RecommendCardProps {
  highlightDish: Dish | null;
  loading: boolean;
  onRecommend: () => void;
}

/** 主推荐卡片 */
const RecommendCard: React.FC<RecommendCardProps> = ({
  highlightDish,
  loading,
  onRecommend,
}) => {
  return (
    <div className="recommend-card">
      <div className="recommend-card-bg" />
      <div className="recommend-card-content">
        <h2 className="recommend-title">今天吃什么？</h2>
        <p className="recommend-subtitle">
          根据距离、评分和就餐热度，为你推荐合适的一餐
        </p>

        {highlightDish && (
          <div className="highlight-dish">
            <span className="highlight-emoji">{highlightDish.emoji}</span>
            <div className="highlight-info">
              <span className="highlight-name">{highlightDish.name}</span>
              <span className="highlight-location">
                {highlightDish.canteen} · {highlightDish.window}
              </span>
              {highlightDish.tags && highlightDish.tags.length > 0 && (
                <span className="highlight-tags">
                  {highlightDish.tags.slice(0, 3).join(' · ')}
                </span>
              )}
            </div>
            <span className="highlight-price">¥{highlightDish.price}</span>
          </div>
        )}

        <button
          className="recommend-btn"
          onClick={onRecommend}
          disabled={loading}
        >
          {loading ? '正在为你挑选…' : <>帮我推荐 <span aria-hidden="true">🍀</span></>}
        </button>
      </div>
    </div>
  );
};

export default RecommendCard;
