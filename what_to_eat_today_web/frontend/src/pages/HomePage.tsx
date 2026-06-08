import React, { useState, useEffect } from 'react';
import type { Dish, Canteen } from '../types';
import { getCanteens, getRecommendedDishes, getTodaySuggestion } from '../mock/mockApi';
import Header from '../components/Header';
import RecommendCard from '../components/RecommendCard';
import QuickEntry from '../components/QuickEntry';
import DishList from '../components/DishList';
import CanteenHeat from '../components/CanteenHeat';
import AISuggestion from '../components/AISuggestion';
import BottomNav from '../components/BottomNav';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [suggestion, setSuggestion] = useState<string>('');
  const [highlightDish, setHighlightDish] = useState<Dish | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [dishData, canteenData, suggestionData] = await Promise.all([
          getRecommendedDishes(),
          getCanteens(),
          getTodaySuggestion(),
        ]);
        setDishes(dishData);
        setCanteens(canteenData);
        setSuggestion(suggestionData.text);
        setHighlightDish(suggestionData.highlightDish ?? null);
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setInitialLoading(false);
      }
    };
    loadData();
  }, []);

  const handleRecommend = async () => {
    setLoading(true);
    try {
      const data = await getTodaySuggestion();
      setSuggestion(data.text);
      setHighlightDish(data.highlightDish ?? null);
    } catch (error) {
      console.error('获取推荐失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="app-container">
        <div className="loading-screen">
          <span className="loading-emoji">🍚</span>
          <p>正在加载美味推荐...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="app-scroll">
        <Header
          searchKeyword={searchKeyword}
          onSearchChange={setSearchKeyword}
          onSearchFocus={() => navigate('/search')}
        />
        <RecommendCard
          suggestion={suggestion}
          highlightDish={highlightDish}
          loading={loading}
          onRecommend={handleRecommend}
        />
        <QuickEntry onAIClick={() => navigate('/ai')} />
        <DishList dishes={dishes.slice(0, 3)} />
        <CanteenHeat canteens={canteens} />
        <AISuggestion onOpenChat={() => navigate('/ai')} />
        <div className="bottom-spacer" />
      </div>
      <BottomNav />
    </div>
  );
};

export default HomePage;
