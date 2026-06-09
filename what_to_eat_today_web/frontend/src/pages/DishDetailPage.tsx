import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Dish, Review } from '../types';
import { getRecommendedDishes, getReviews } from '../mock/mockApi';
import { useAuth } from '../contexts/AuthContext';
import ReviewForm from '../components/ReviewForm';

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="review-stars">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
  return date.toLocaleDateString('zh-CN');
}

const DishDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const [dish, setDish] = useState<Dish | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadData = () => {
    if (!id) return;
    Promise.all([
      getRecommendedDishes(),
      getReviews(id),
    ]).then(([dishes, revs]) => {
      const found = dishes.find((d) => d.id === id) || null;
      setDish(found);
      setReviews(revs);
    }).catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleReviewSuccess = () => {
    setShowForm(false);
    if (id) {
      getReviews(id).then(setReviews).catch(() => {});
    }
  };

  if (loading) {
    return <div className="dish-detail-loading">加载中...</div>;
  }

  if (!dish) {
    return (
      <div className="dish-detail-empty">
        <p>菜品不存在</p>
        <button onClick={() => navigate(-1)}>返回</button>
      </div>
    );
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="dish-detail-page">
      {/* 顶部返回 */}
      <div className="dish-detail-nav">
        <button className="dish-detail-back" onClick={() => navigate(-1)}>← 返回</button>
      </div>

      {/* 菜品信息卡 */}
      <div className="dish-detail-card">
        <div className="dish-detail-emoji">{dish.emoji}</div>
        <div className="dish-detail-info">
          <h2 className="dish-detail-name">{dish.name}</h2>
          <p className="dish-detail-location">{dish.canteen} · {dish.window}</p>
          <div className="dish-detail-meta">
            <span className="dish-detail-price">¥{dish.price}</span>
            {avgRating && (
              <span className="dish-detail-rating">
                <span className="review-stars">★</span> {avgRating}
              </span>
            )}
            <span className="dish-detail-review-count">{reviews.length} 条评价</span>
          </div>
          <div className="dish-detail-tags">
            {dish.tags.map((tag) => (
              <span key={tag} className="review-tag">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* 评价列表 */}
      <div className="dish-detail-reviews">
        <div className="dish-detail-reviews-header">
          <h3>评价 ({reviews.length})</h3>
        </div>

        {reviews.length === 0 ? (
          <div className="dish-detail-no-reviews">
            <p>暂无评价，来第一个分享吧</p>
          </div>
        ) : (
          <div className="dish-detail-reviews-list">
            {reviews.map((review) => (
              <div key={review.id} className="comment-card">
                <div className="comment-card-header">
                  <span className="comment-card-user">{review.nickname}</span>
                  <StarRating rating={review.rating} />
                  {review.createdAt && (
                    <span className="comment-card-time">{timeAgo(review.createdAt)}</span>
                  )}
                </div>
                {review.content && (
                  <p className="comment-card-content">{review.content}</p>
                )}
                {review.tags.length > 0 && (
                  <div className="comment-card-tags">
                    {review.tags.map((tag) => (
                      <span key={tag} className="review-tag">{tag}</span>
                    ))}
                  </div>
                )}
                {review.images.length > 0 && (
                  <div className="comment-card-images">
                    {review.images.map((src, i) => (
                      <img key={i} src={src} alt={`评价图片${i + 1}`} className="comment-card-img" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 写评价浮动按钮 */}
      <button
        className="dish-detail-fab"
        onClick={() => {
          if (!isLoggedIn) {
            navigate('/login');
          } else {
            setShowForm(true);
          }
        }}
      >
        ✍️ 写评价
      </button>

      {/* 评价表单弹层 */}
      {showForm && (
        <div className="comments-form-overlay">
          <div className="comments-form-wrapper">
            <ReviewForm
              onSuccess={handleReviewSuccess}
              onCancel={() => setShowForm(false)}
              preselectedDishId={id}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DishDetailPage;
