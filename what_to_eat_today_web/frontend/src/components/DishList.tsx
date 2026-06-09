import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Dish } from '../types';

interface DishListProps {
  dishes: Dish[];
}

/** 今日推荐菜品列表 */
const DishList: React.FC<DishListProps> = ({ dishes }) => {
  const navigate = useNavigate();
  // 记录哪些菜品已点击"想吃"
  const [liked, setLiked] = useState<Set<string>>(new Set());

  const handleLike = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 热度状态对应的颜色
  const heatColor: Record<string, string> = {
    '空闲': '#8BC34A',
    '正常': '#FF9800',
    '拥挤': '#F44336',
  };

  if (dishes.length === 0) {
    return (
      <div className="dish-list-empty">
        <span>🍽️</span>
        <p>没有找到匹配的菜品</p>
      </div>
    );
  }

  return (
    <div className="dish-list">
      <h3 className="section-title">今日推荐</h3>
      {dishes.map((dish) => (
        <div key={dish.id} className="dish-card" onClick={() => navigate(`/dish/${dish.id}`)} style={{ cursor: 'pointer' }}>
          <div className="dish-card-left">
            <span className="dish-emoji">{dish.emoji}</span>
          </div>
          <div className="dish-card-center">
            <div className="dish-name-row">
              <span className="dish-name">{dish.name}</span>
              <span className="dish-price">¥{dish.price}</span>
            </div>
            <div className="dish-location">
              {dish.canteen} · {dish.window}
            </div>
            <div className="dish-meta">
              <span className="dish-rating">⭐ {dish.rating}</span>
              <span className="dish-reviews">{dish.reviewCount}条评价</span>
              <span
                className="dish-heat"
                style={{ backgroundColor: heatColor[dish.heatStatus] + '22', color: heatColor[dish.heatStatus] }}
              >
                {dish.heatStatus}
              </span>
            </div>
            <div className="dish-tags">
              {dish.tags.map((tag) => (
                <span key={tag} className="dish-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="dish-card-right">
            <button
              className={`dish-like-btn ${liked.has(dish.id) ? 'liked' : ''}`}
              onClick={(e) => handleLike(e, dish.id)}
            >
              {liked.has(dish.id) ? '已选择 ✓' : '想吃'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DishList;
