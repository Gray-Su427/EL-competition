import React, { useState, useEffect, useCallback } from 'react';
import type { Dish, Canteen } from '../types';
import { getCanteens, getRecommendedDishes, getTodaySuggestion } from '../mock/mockApi';
import Header from '../components/Header';
import RecommendCard from '../components/RecommendCard';
import DishList from '../components/DishList';
import CanteenHeat from '../components/CanteenHeat';
import AISuggestion from '../components/AISuggestion';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [highlightDish, setHighlightDish] = useState<Dish | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      try {
        const [dishData, canteenData, suggestionData] = await Promise.all([
          getRecommendedDishes(),
          getCanteens(),
          getTodaySuggestion(),
        ]);
        if (cancelled) return;
        setDishes(dishData);
        setCanteens(canteenData);
        setHighlightDish(suggestionData.highlightDish ?? null);
      } catch (error) {
        if (!cancelled) console.error('加载数据失败:', error);
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, []);

  const handleRecommend = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTodaySuggestion();
      setHighlightDish(data.highlightDish ?? null);
    } catch (error) {
      console.error('获取推荐失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  if (initialLoading) {
    return (
      <div className="loading-screen">
        <span className="loading-emoji" aria-hidden="true">🍚</span>
        <p>正在加载美味推荐…</p>
      </div>
    );
  }

  return (
    <>
      <Header onSearchFocus={() => navigate('/search')} />
      <RecommendCard
          highlightDish={highlightDish}
        loading={loading}
        onRecommend={handleRecommend}
      />
      <CanteenHeat canteens={canteens} onCanteenClick={(id) => navigate(`/canteens?expand=${id}`)} />
      <DishList dishes={dishes.slice(0, 3)} />
      <AISuggestion onOpenChat={() => navigate('/ai')} />
    </>
  );
};

export default HomePage;
