import { useState, useEffect } from 'react';
import type { Dish } from '../types';
import { getRecommendedDishes } from '../mock/mockApi';
import DishList from '../components/DishList';

const RecommendedPage: React.FC = () => {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getRecommendedDishes()
      .then(setDishes)
      .catch(() => setError('加载推荐菜品失败'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-emoji" aria-hidden="true">🍚</span>
        <p>正在加载推荐菜品…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-screen">
        <span className="loading-emoji" aria-hidden="true">😅</span>
        <p>{error}</p>
      </div>
    );
  }

  return <DishList dishes={dishes} title="⭐ 今日推荐" />;
};

export default RecommendedPage;
