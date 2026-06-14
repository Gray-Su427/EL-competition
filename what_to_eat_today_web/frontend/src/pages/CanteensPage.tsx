import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCanteens, getRecommendedDishes } from '../mock/mockApi';
import type { Canteen, Dish } from '../types';

const statusConfig: Record<string, { color: string; bg: string }> = {
  空闲: { color: '#8BC34A', bg: '#E8F5E9' },
  正常: { color: '#FF9800', bg: '#FFF3E0' },
  拥挤: { color: '#F44336', bg: '#FFEBEE' },
};

const heatColor: Record<string, string> = {
  空闲: '#8BC34A',
  正常: '#FF9800',
  拥挤: '#F44336',
};

const CanteensPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(
    searchParams.get('expand')
  );
  const [selectedWindow, setSelectedWindow] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (expandedId) {
          next.set('expand', expandedId);
        } else {
          next.delete('expand');
        }
        return next;
      },
      { replace: true }
    );
  }, [expandedId, setSearchParams]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [canteenData, dishData] = await Promise.all([
          getCanteens(),
          getRecommendedDishes(),
        ]);
        if (cancelled) {
          return;
        }
        setCanteens(canteenData);
        setDishes(dishData);
      } catch {
        if (!cancelled) {
          setError('加载食堂数据失败');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setSelectedWindow(null);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-emoji" aria-hidden="true">🍥</span>
        <p>正在加载食堂数据...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-screen">
        <span className="loading-emoji" aria-hidden="true">😄</span>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="canteen-page">
      <h3 className="section-title" style={{ paddingTop: 16 }}>🏨 附近食堂</h3>
      {canteens.map((canteen) => {
        const config = statusConfig[canteen.status] ?? statusConfig.正常;
        const isOpen = expandedId === canteen.id;
        const canteenDishes = dishes.filter((dish) => dish.canteen === canteen.name);
        const windows = [...new Set(canteenDishes.map((dish) => dish.window))];
        const activeWindow = isOpen
          ? (selectedWindow && windows.includes(selectedWindow)
              ? selectedWindow
              : windows[0] ?? null)
          : null;

        return (
          <div key={canteen.id} className="canteen-page-card">
            <button
              className="canteen-page-header"
              onClick={() => toggleExpand(canteen.id)}
            >
              <div className="canteen-page-header-left">
                <div className="canteen-page-name">{canteen.name}</div>
                <div className="canteen-page-meta">
                  <span><span aria-hidden="true">📍</span> {canteen.distance}</span>
                  <span><span aria-hidden="true">🕒</span> {canteen.openTime}</span>
                </div>
              </div>
              <div className="canteen-page-header-right">
                <span
                  className="canteen-page-status"
                  style={{ backgroundColor: config.bg, color: config.color }}
                >
                  {canteen.status}
                </span>
                <span className={`canteen-page-arrow ${isOpen ? 'open' : ''}`}>
                  ▾
                </span>
              </div>
            </button>

            <div className={`canteen-page-dishes ${isOpen ? 'open' : ''}`}>
              <div className="canteen-page-dishes-inner">
                {canteenDishes.length === 0 ? (
                  <div className="canteen-page-empty">该食堂暂时没有菜品信息</div>
                ) : (
                  <div className="canteen-page-content">
                    <div className="canteen-page-windows">
                      {windows.map((window) => {
                        const count = canteenDishes.filter((dish) => dish.window === window).length;
                        return (
                          <button
                            key={window}
                            className={`canteen-page-window-item ${activeWindow === window ? 'active' : ''}`}
                            onClick={() => setSelectedWindow(window)}
                          >
                            <span className="canteen-page-window-name">{window}</span>
                            <span className="canteen-page-window-count">{count} 道</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="canteen-page-dish-list">
                      {canteenDishes
                        .filter((dish) => dish.window === activeWindow)
                        .map((dish) => (
                          <div
                            key={dish.id}
                            className="dish-card"
                            style={{ margin: '0 0 8px' }}
                            role="button"
                            tabIndex={0}
                            onClick={() => navigate(`/dish/${dish.id}`)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                navigate(`/dish/${dish.id}`);
                              }
                            }}
                          >
                            <div className="dish-card-left">
                              <span className="dish-emoji">{dish.emoji}</span>
                            </div>
                            <div className="dish-card-center">
                              <div className="dish-name-row">
                                <span className="dish-name">{dish.name}</span>
                                <span className="dish-price">¥{dish.price}</span>
                              </div>
                              <div className="dish-location">{dish.window}</div>
                              <div className="dish-meta">
                                <span className="dish-rating">★{dish.rating}</span>
                                <span className="dish-reviews">{dish.reviewCount} 条评价</span>
                                <span
                                  className="dish-heat"
                                  style={{
                                    backgroundColor: `${heatColor[dish.heatStatus] ?? heatColor.正常}22`,
                                    color: heatColor[dish.heatStatus] ?? heatColor.正常,
                                  }}
                                >
                                  {dish.heatStatus}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CanteensPage;
