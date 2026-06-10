import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getRecommendedDishes, createReview } from '../mock/mockApi';
import type { Dish } from '../types';

const QUICK_TAGS = ['推荐', '分量足', '性价比高', '太咸', '太辣', '排队久', '口味好', '环境好'];

interface ReviewFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  preselectedDishId?: string;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ onSuccess, onCancel, preselectedDishId }) => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [dishId, setDishId] = useState(preselectedDishId || '');
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getRecommendedDishes().then(setDishes).catch(() => {});
  }, []);

  if (!isLoggedIn) {
    return (
      <div className="review-form-login-prompt">
        <p>登录后才能发表评价</p>
        <button className="login-btn" onClick={() => navigate('/login')}>
          去登录
        </button>
        <button className="review-form-cancel" onClick={onCancel}>取消</button>
      </div>
    );
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 3 - images.length;
    const toAdd = files.slice(0, remaining);

    for (const file of toAdd) {
      if (file.size > 5 * 1024 * 1024) {
        setError('单张图片不能超过 5MB');
        return;
      }
    }

    const newImages = [...images, ...toAdd];
    setImages(newImages);
    setPreviews(newImages.map((f) => URL.createObjectURL(f)));
    setError('');
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    setPreviews(newImages.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async () => {
    if (!dishId) { setError('请选择菜品'); return; }
    if (rating === 0) { setError('请选择评分'); return; }

    setError('');
    setLoading(true);
    try {
      await createReview({
        dishId,
        rating,
        content: content.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        images: images.length > 0 ? images : undefined,
      });
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '提交失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="review-form">
      <h3 className="review-form-title">写评价</h3>

      {/* 选择菜品 */}
      <div className="review-form-field">
        <label htmlFor="review-dish">菜品</label>
        <select
          id="review-dish"
          value={dishId}
          onChange={(e) => setDishId(e.target.value)}
          className="review-form-select"
        >
          <option value="">选择要评价的菜品</option>
          {dishes.map((d) => (
            <option key={d.id} value={d.id}>
              {d.emoji} {d.name} ({d.canteen})
            </option>
          ))}
        </select>
      </div>

      {/* 评分 */}
      <div className="review-form-field">
        <label id="review-rating-label">评分</label>
        <div className="review-form-stars" role="group" aria-labelledby="review-rating-label">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`star-btn ${star <= rating ? 'active' : ''}`}
              onClick={() => setRating(star)}
              aria-label={`${star} 星`}
            >
              {star <= rating ? '★' : '☆'}
            </button>
          ))}
        </div>
      </div>

      {/* 文字评价 */}
      <div className="review-form-field">
        <label htmlFor="review-content">评价内容（选填）</label>
        <textarea
          id="review-content"
          className="review-form-textarea"
          placeholder="分享你的用餐体验…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={500}
          rows={3}
        />
      </div>

      {/* 快捷标签 */}
      <div className="review-form-field">
        <label id="review-tags-label">快捷标签</label>
        <div className="review-form-tags" role="group" aria-labelledby="review-tags-label">
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`tag-btn ${selectedTags.includes(tag) ? 'active' : ''}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* 图片上传 */}
      <div className="review-form-field">
        <label id="review-images-label">图片（最多3张）</label>
        <div className="review-form-images" role="group" aria-labelledby="review-images-label">
          {previews.map((src, i) => (
            <div key={i} className="review-form-image-item">
              <img src={src} alt={`预览${i + 1}`} />
              <button
                type="button"
                className="review-form-image-remove"
                onClick={() => removeImage(i)}
                aria-label="删除图片"
              >
                ✕
              </button>
            </div>
          ))}
          {images.length < 3 && (
            <button
              type="button"
              className="review-form-image-add"
              onClick={() => fileInputRef.current?.click()}
            >
              +
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {error && <p className="review-form-error">{error}</p>}

      <div className="review-form-actions">
        <button className="review-form-cancel" onClick={onCancel}>
          取消
        </button>
        <button
          className="review-form-submit"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? '提交中…' : '发表评价'}
        </button>
      </div>
    </div>
  );
};

export default ReviewForm;
