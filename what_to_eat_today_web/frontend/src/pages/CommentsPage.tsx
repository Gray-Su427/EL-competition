import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Dish, Review } from '../types';
import { getRecommendedDishes, getRecentReviews } from '../mock/mockApi';

const CANTEEN_TABS = ['全部', '一食堂', '二食堂', '三食堂', '教工餐厅'];

function StarRating({ rating }: { rating: number }) {
  return <span className="review-stars">{'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}</span>;
}

const CommentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('全部');
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getRecommendedDishes(), getRecentReviews()])
      .then(([d, r]) => { setDishes(d); setReviews(r); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 按食堂筛选
  const filteredDishes = activeTab === '全部'
    ? dishes
    : dishes.filter((d) => d.canteen === activeTab);

  // 计算每个菜品的平均分
  const dishWithAvg = filteredDishes.map((dish) => {
    const dishReviews = reviews.filter((r) => r.dishId === dish.id);
    const avg = dishReviews.length > 0
      ? dishReviews.reduce((s, r) => s + r.rating, 0) / dishReviews.length
      : dish.rating;
    const latestReview = dishReviews[0] || null;
    return { dish, avg, reviewCount: dishReviews.length, latestReview };
  }).sort((a, b) => b.avg - a.avg);

  if (loading) {
    return <div className="comments-loading">加载中…</div>;
  }

  return (
    <div className="comments-page">
      <div className="comments-header">
        <h2><span aria-hidden="true">📝</span> 菜品评价</h2>
        <p>按食堂浏览，评分从高到低</p>
      </div>

      {/* 食堂筛选 tabs */}
      <div className="comments-tabs">
        {CANTEEN_TABS.map((tab) => (
          <button
            key={tab}
            className={`comments-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 菜品列表（按评分排序） */}
      {dishWithAvg.length === 0 ? (
        <div className="comments-empty">
          <span className="comments-empty-icon">📭</span>
          <p>该食堂暂无菜品</p>
        </div>
      ) : (
        <div className="comments-dish-list">
          {dishWithAvg.map(({ dish, avg, reviewCount, latestReview }) => (
            <Link
              key={dish.id}
              to={`/dish/${dish.id}`}
              className="comments-dish-card"
            >
              <div className="comments-dish-top">
                <span className="comments-dish-emoji">{dish.emoji}</span>
                <div className="comments-dish-info">
                  <span className="comments-dish-name">{dish.name}</span>
                  <span className="comments-dish-location">{dish.canteen} · {dish.window}</span>
                </div>
                <div className="comments-dish-score">
                  <span className="comments-dish-avg">{avg.toFixed(1)}</span>
                  <StarRating rating={Math.round(avg)} />
                  <span className="comments-dish-count">{reviewCount} 条</span>
                </div>
              </div>
              {latestReview && (
                <div className="comments-dish-preview">
                  <span className="comments-dish-preview-user">{latestReview.nickname}：</span>
                  <span className="comments-dish-preview-text">
                    {latestReview.content || latestReview.tags.join(' ')}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentsPage;
