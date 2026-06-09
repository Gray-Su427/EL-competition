import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Dish } from '../types';
import { getRecommendedDishes } from '../mock/mockApi';
import { useAuth } from '../contexts/AuthContext';
import { getMyReviews } from '../mock/mockApi';
import type { Review } from '../types';

const FAVORITES_KEY = 'liked_dishes';

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFavorites(ids: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="review-stars">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}

const UserPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoggedIn, logout } = useAuth();

  const [favIds, setFavIds] = useState<string[]>(loadFavorites);
  const [allDishes, setAllDishes] = useState<Dish[]>([]);
  const [dishesLoaded, setDishesLoaded] = useState(false);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);

  useEffect(() => {
    if (favIds.length === 0) {
      setDishesLoaded(true);
    } else {
      getRecommendedDishes()
        .then((dishes) => setAllDishes(dishes))
        .catch(() => {})
        .finally(() => setDishesLoaded(true));
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      getMyReviews()
        .then(setMyReviews)
        .catch(() => {})
        .finally(() => setReviewsLoaded(true));
    } else {
      setReviewsLoaded(true);
    }
  }, [isLoggedIn]);

  const removeFavorite = (id: string) => {
    const next = favIds.filter((fid) => fid !== id);
    setFavIds(next);
    saveFavorites(next);
  };

  const favoriteDishes = allDishes.filter((d) => favIds.includes(d.id));

  return (
    <div className="user-page">
      {/* 头像信息 */}
      <div className="user-page-section user-page-profile">
        <div className="user-page-avatar">
          {isLoggedIn ? '😊' : '👤'}
        </div>
        <div className="user-page-info">
          <div className="user-page-nickname">
            {isLoggedIn ? (user?.nickname || user?.email) : '未登录'}
          </div>
          <div className="user-page-hint">
            {isLoggedIn ? user?.email : '登录后同步收藏和评价'}
          </div>
        </div>
        {isLoggedIn ? (
          <button className="user-page-logout-btn" onClick={logout}>
            退出
          </button>
        ) : (
          <button
            className="user-page-login-btn"
            onClick={() => navigate('/login')}
          >
            去登录
          </button>
        )}
      </div>

      {/* 我的收藏 */}
      <div className="user-page-section">
        <div className="user-page-section-header">
          <h4>⭐ 我的收藏</h4>
          {favIds.length > 0 && (
            <span className="user-page-count">{favIds.length} 个</span>
          )}
        </div>
        {!dishesLoaded ? (
          <div className="user-page-loading">加载中...</div>
        ) : favoriteDishes.length === 0 ? (
          <div className="user-page-empty">
            <span>📭</span>
            <p>还没有收藏的菜品</p>
            <span className="user-page-hint">去首页点点「想吃」吧</span>
          </div>
        ) : (
          <div className="user-page-fav-list">
            {favoriteDishes.map((dish) => (
              <div key={dish.id} className="user-page-fav-item">
                <span className="user-page-fav-emoji">{dish.emoji}</span>
                <div className="user-page-fav-info">
                  <span className="user-page-fav-name">{dish.name}</span>
                  <span className="user-page-fav-location">
                    {dish.canteen} · {dish.window}
                  </span>
                </div>
                <button
                  className="user-page-fav-remove"
                  onClick={() => removeFavorite(dish.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 我的评价 */}
      <div className="user-page-section">
        <h4 className="user-page-section-header">📝 我的评价</h4>
        {!isLoggedIn ? (
          <div className="user-page-empty">
            <span>✍️</span>
            <p>登录后查看你的评价</p>
          </div>
        ) : !reviewsLoaded ? (
          <div className="user-page-loading">加载中...</div>
        ) : myReviews.length === 0 ? (
          <div className="user-page-empty">
            <span>✍️</span>
            <p>暂无评价</p>
            <span className="user-page-hint">去评价页分享你的用餐体验</span>
          </div>
        ) : (
          <div className="user-page-review-list">
            {myReviews.map((review) => (
              <div key={review.id} className="user-page-review-item">
                <div className="user-page-review-header">
                  <span>{review.dishEmoji} {review.dishName}</span>
                  <StarRating rating={review.rating} />
                </div>
                {review.content && (
                  <p className="user-page-review-content">{review.content}</p>
                )}
                {review.tags.length > 0 && (
                  <div className="user-page-review-tags">
                    {review.tags.map((tag) => (
                      <span key={tag} className="review-tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 设置 */}
      <div className="user-page-section">
        <h4 className="user-page-section-header">⚙️ 设置</h4>
        <div className="user-page-setting-list">
          <div className="user-page-setting-item">
            <span>关于应用</span>
            <span className="user-page-setting-value">今天吃什么 v1.0</span>
          </div>
          <div className="user-page-setting-item">
            <span>服务校区</span>
            <span className="user-page-setting-value">南京大学 · 鼓楼校区</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPage;
