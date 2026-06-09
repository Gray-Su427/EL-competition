import { useState, useEffect } from 'react';
import type { Dish } from '../types';
import { getRecommendedDishes } from '../mock/mockApi';

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

const UserPage: React.FC = () => {
  const [favIds, setFavIds] = useState<string[]>(loadFavorites);
  const [allDishes, setAllDishes] = useState<Dish[]>([]);
  const [dishesLoaded, setDishesLoaded] = useState(false);

  useEffect(() => {
    if (favIds.length === 0) {
      setDishesLoaded(true);
      return;
    }
    getRecommendedDishes()
      .then((dishes) => setAllDishes(dishes))
      .catch(() => {})
      .finally(() => setDishesLoaded(true));
  }, []);

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
        <div className="user-page-avatar">👤</div>
        <div className="user-page-info">
          <div className="user-page-nickname">未登录</div>
          <div className="user-page-hint">登录后同步收藏和评价</div>
        </div>
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
        <div className="user-page-empty">
          <span>✍️</span>
          <p>暂无评价</p>
        </div>
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
