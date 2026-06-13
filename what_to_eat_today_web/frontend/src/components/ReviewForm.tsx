import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createReview, getRecommendedDishes, updateReview } from '../mock/mockApi';
import type { Dish, Review } from '../types';

const QUICK_TAGS = ['推荐', '分量足', '性价比高', '太咸', '太辣', '排队久', '口味好', '环境好'];

interface ReviewFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  preselectedDishId?: string;
  editingReview?: Review | null;
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  onSuccess,
  onCancel,
  preselectedDishId,
  editingReview,
}) => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const isEditMode = !!editingReview;

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [dishId, setDishId] = useState(editingReview?.dishId ?? preselectedDishId ?? '');
  const [rating, setRating] = useState(editingReview?.rating ?? 0);
  const [content, setContent] = useState(editingReview?.content ?? '');
  const [selectedTags, setSelectedTags] = useState<string[]>(editingReview?.tags ?? []);
  const [existingImages, setExistingImages] = useState<string[]>(editingReview?.images ?? []);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getRecommendedDishes().then(setDishes).catch(() => {});
  }, []);

  const previewUrls = useMemo(
    () => newImages.map((file) => URL.createObjectURL(file)),
    [newImages]
  );

  useEffect(() => {
    return () => {
      for (const url of previewUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [previewUrls]);

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
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  };

  const totalImages = existingImages.length + newImages.length;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 3 - totalImages;
    const toAdd = files.slice(0, remaining);

    for (const file of toAdd) {
      if (file.size > 5 * 1024 * 1024) {
        setError('单张图片不能超过 5MB');
        return;
      }
    }

    setNewImages((prev) => [...prev, ...toAdd]);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeExistingImage = (src: string) => {
    setExistingImages((prev) => prev.filter((item) => item !== src));
  };

  const removeNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!dishId) {
      setError('请选择菜品');
      return;
    }
    if (rating === 0) {
      setError('请选择评分');
      return;
    }

    setError('');
    setLoading(true);
    try {
      if (isEditMode && editingReview) {
        await updateReview(editingReview.id, {
          rating,
          content: content.trim() || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          keepImages: existingImages,
          images: newImages.length > 0 ? newImages : undefined,
        });
      } else {
        await createReview({
          dishId,
          rating,
          content: content.trim() || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          images: newImages.length > 0 ? newImages : undefined,
        });
      }
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : (isEditMode ? '修改失败' : '提交失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="review-form">
      <h3 className="review-form-title">{isEditMode ? '修改评价' : '写评价'}</h3>

      <div className="review-form-field">
        <label htmlFor="review-dish">菜品</label>
        <select
          id="review-dish"
          value={dishId}
          onChange={(e) => setDishId(e.target.value)}
          className="review-form-select"
          disabled={!!preselectedDishId || isEditMode}
        >
          <option value="">选择要评价的菜品</option>
          {dishes.map((dish) => (
            <option key={dish.id} value={dish.id}>
              {dish.emoji} {dish.name} ({dish.canteen})
            </option>
          ))}
        </select>
      </div>

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

      <div className="review-form-field">
        <label htmlFor="review-content">评价内容（选填）</label>
        <textarea
          id="review-content"
          className="review-form-textarea"
          placeholder="分享你的用餐体验..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={500}
          rows={3}
        />
      </div>

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

      <div className="review-form-field">
        <label id="review-images-label">图片（最多 3 张）</label>
        {existingImages.length > 0 && (
          <>
            <div className="review-form-image-badge">已上传图片</div>
            <div className="review-form-existing-images" role="group" aria-labelledby="review-images-label">
              {existingImages.map((src) => (
                <div key={src} className="review-form-image-item">
                  <img src={src} alt="已有评价图片" />
                  <button
                    type="button"
                    className="review-form-image-remove"
                    onClick={() => removeExistingImage(src)}
                    aria-label="删除已有图片"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {previewUrls.length > 0 && (
          <>
            <div className="review-form-image-badge">本次新增图片</div>
            <div className="review-form-new-images" role="group" aria-labelledby="review-images-label">
              {previewUrls.map((src, index) => (
                <div key={src} className="review-form-image-item">
                  <img src={src} alt={`预览${index + 1}`} />
                  <button
                    type="button"
                    className="review-form-image-remove"
                    onClick={() => removeNewImage(index)}
                    aria-label="删除新增图片"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="review-form-images" role="group" aria-labelledby="review-images-label">
          {totalImages < 3 && (
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
          {loading ? (isEditMode ? '修改中…' : '提交中…') : (isEditMode ? '保存修改' : '发表评价')}
        </button>
      </div>
    </div>
  );
};

export default ReviewForm;
