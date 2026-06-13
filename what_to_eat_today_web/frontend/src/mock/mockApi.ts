import type { Canteen, Dish, Review, TodaySuggestion } from '../types';
import { authHeaders } from '../services/authService';

// ========== 真实 API 调用 ==========

/**
 * 获取食堂列表
 * GET /api/canteens
 */
export async function getCanteens(): Promise<Canteen[]> {
  const res = await fetch('/api/canteens');
  if (!res.ok) throw new Error(`请求失败: ${res.status}`);
  return res.json();
}

/**
 * 获取推荐菜品列表
 * GET /api/dishes/recommended
 */
export async function getRecommendedDishes(): Promise<Dish[]> {
  const res = await fetch('/api/dishes/recommended');
  if (!res.ok) throw new Error(`请求失败: ${res.status}`);
  return res.json();
}

/**
 * 获取今日推荐文案
 * GET /api/suggestion/today
 */
export async function getTodaySuggestion(): Promise<TodaySuggestion> {
  const res = await fetch('/api/suggestion/today');
  if (!res.ok) throw new Error(`请求失败: ${res.status}`);
  return res.json();
}

/**
 * 根据关键词搜索菜品
 * GET /api/dishes/search?keyword=xxx
 */
export async function searchDishes(keyword: string): Promise<Dish[]> {
  const res = await fetch(`/api/dishes/search?keyword=${encodeURIComponent(keyword)}`);
  if (!res.ok) throw new Error(`请求失败: ${res.status}`);
  return res.json();
}

/**
 * 获取热门搜索关键词
 * GET /api/search/hot-keywords
 */
export async function getHotKeywords(): Promise<string[]> {
  const res = await fetch('/api/search/hot-keywords');
  if (!res.ok) throw new Error(`请求失败: ${res.status}`);
  return res.json();
}

/**
 * 获取搜索建议（输入联想）
 * GET /api/search/suggestions?keyword=xxx
 */
export async function getSearchSuggestions(keyword: string): Promise<string[]> {
  if (!keyword.trim()) return [];
  const res = await fetch(`/api/search/suggestions?keyword=${encodeURIComponent(keyword)}`);
  if (!res.ok) throw new Error(`请求失败: ${res.status}`);
  return res.json();
}

// ========== 评价 API ==========

/**
 * 获取最新评价
 * GET /api/reviews/recent
 */
export async function getRecentReviews(): Promise<Review[]> {
  const res = await fetch('/api/reviews/recent');
  if (!res.ok) throw new Error(`请求失败: ${res.status}`);
  return res.json();
}

/**
 * 获取某菜品的评价
 * GET /api/reviews?dish_id=xxx
 */
export async function getReviews(dishId?: string): Promise<Review[]> {
  const url = dishId ? `/api/reviews?dish_id=${encodeURIComponent(dishId)}` : '/api/reviews';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`请求失败: ${res.status}`);
  return res.json();
}

/**
 * 获取我的评价
 * GET /api/reviews/mine
 */
export async function getMyReviews(): Promise<Review[]> {
  const res = await fetch('/api/reviews/mine', { headers: authHeaders() });
  if (!res.ok) throw new Error(`请求失败: ${res.status}`);
  return res.json();
}

/**
 * 创建评价（带图片上传）
 * POST /api/reviews (multipart/form-data)
 */
export async function createReview(data: {
  dishId: string;
  rating: number;
  content?: string;
  tags?: string[];
  images?: File[];
}): Promise<Review> {
  const formData = new FormData();
  formData.append('dish_id', data.dishId);
  formData.append('rating', String(data.rating));
  if (data.content) formData.append('content', data.content);
  if (data.tags && data.tags.length > 0) {
    formData.append('tags', JSON.stringify(data.tags));
  }
  if (data.images) {
    for (const img of data.images) {
      formData.append('images', img);
    }
  }

  const res = await fetch('/api/reviews', {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '提交失败');
  }
  return res.json();
}

export async function updateReview(
  reviewId: number,
  data: {
    rating: number;
    content?: string;
    tags?: string[];
    keepImages: string[];
    images?: File[];
  }
): Promise<Review> {
  const formData = new FormData();
  formData.append('rating', String(data.rating));
  if (data.content) formData.append('content', data.content);
  if (data.tags && data.tags.length > 0) {
    formData.append('tags', JSON.stringify(data.tags));
  }
  formData.append('keep_images', JSON.stringify(data.keepImages));
  if (data.images) {
    for (const img of data.images) {
      formData.append('images', img);
    }
  }

  const res = await fetch(`/api/reviews/${reviewId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '修改失败');
  }
  return res.json();
}
