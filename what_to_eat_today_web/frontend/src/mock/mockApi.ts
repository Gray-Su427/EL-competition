import type { Canteen, Dish, TodaySuggestion } from '../types';

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
