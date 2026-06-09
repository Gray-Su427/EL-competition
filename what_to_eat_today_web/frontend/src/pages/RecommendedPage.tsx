import { useState, useEffect } from 'react';
import type { Dish } from '../types';
import { getRecommendedDishes } from '../mock/mockApi';

const heatColor: Record<string, string> = {
  '空闲': '#8BC34A',
  '正常': '#FF9800',
  '拥挤': '#F44336',
};

const RecommendedPage: React.FC = () => {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getRecommendedDishes()
      .then(setDishes)
      .catch(() => setError('加载推荐菜品失败'))
      .finally(() => setLoading(false));
  }, []);

  const toggleLike = (id: string) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-emoji">🍚</span>
        <p>正在加载推荐菜品...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-screen">
        <span className="loading-emoji">😅</span>
        <p>{error}</p>
      </div>
    );
  }

  if (dishes.length === 0) {
    return (
      <div className="dish-list-empty" style={{ paddingTop: 40 }}>
        <span>🍽️</span>
        <p>暂无推荐菜品</p>
      </div>
    );
  }

  return (
    <div className="dish-list">
      <h3 className="section-title" style={{ paddingTop: 16 }}>⭐ 今日推荐</h3>
      {dishes.map((dish) => (
        <div key={dish.id} className="dish-card">
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
                style={{
                  backgroundColor: heatColor[dish.heatStatus] + '22',
                  color: heatColor[dish.heatStatus],
                }}
              >
                {dish.heatStatus}
              </span>
            </div>
            <div className="dish-tags">
              {dish.tags.map((tag) => (
                <span key={tag} className="dish-tag">{tag}</span>
              ))}
            </div>
          </div>
          <div className="dish-card-right">
            <button
              className={`dish-like-btn ${liked.has(dish.id) ? 'liked' : ''}`}
              onClick={() => toggleLike(dish.id)}
            >
              {liked.has(dish.id) ? '已选择 ✓' : '想吃'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecommendedPage;
