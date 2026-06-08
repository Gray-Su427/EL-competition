import type { Canteen, Dish, TodaySuggestion } from '../types';

// ========== Mock 数据 ==========

const canteens: Canteen[] = [
  { id: 'c1', name: '一食堂', status: '正常', distance: '200m', openTime: '6:30-20:00' },
  { id: 'c2', name: '二食堂', status: '拥挤', distance: '350m', openTime: '6:30-20:30' },
  { id: 'c3', name: '三食堂', status: '空闲', distance: '500m', openTime: '7:00-21:00' },
];

const dishes: Dish[] = [
  {
    id: 'd1',
    name: '宫保鸡丁',
    price: 12,
    canteen: '一食堂',
    window: '川菜窗口',
    rating: 4.6,
    reviewCount: 238,
    tags: ['微辣', '高人气', '下饭'],
    heatStatus: '正常',
    emoji: '🍗',
  },
  {
    id: 'd2',
    name: '番茄牛腩面',
    price: 15,
    canteen: '二食堂',
    window: '面食窗口',
    rating: 4.8,
    reviewCount: 312,
    tags: ['清淡', '暖胃', '高人气'],
    heatStatus: '拥挤',
    emoji: '🍜',
  },
  {
    id: 'd3',
    name: '麻辣香锅',
    price: 18,
    canteen: '一食堂',
    window: '麻辣烫窗口',
    rating: 4.5,
    reviewCount: 189,
    tags: ['麻辣', '自选', '高人气'],
    heatStatus: '正常',
    emoji: '🌶️',
  },
  {
    id: 'd4',
    name: '鸡蛋炒饭',
    price: 8,
    canteen: '三食堂',
    window: '快餐窗口',
    rating: 4.2,
    reviewCount: 156,
    tags: ['实惠', '快速', '清淡'],
    heatStatus: '空闲',
    emoji: '🍳',
  },
  {
    id: 'd5',
    name: '轻食沙拉',
    price: 22,
    canteen: '三食堂',
    window: '轻食窗口',
    rating: 4.7,
    reviewCount: 98,
    tags: ['健康', '低卡', '清淡'],
    heatStatus: '空闲',
    emoji: '🥗',
  },
  {
    id: 'd6',
    name: '红烧排骨',
    price: 16,
    canteen: '二食堂',
    window: '家常菜窗口',
    rating: 4.4,
    reviewCount: 201,
    tags: ['家常', '高人气', '下饭'],
    heatStatus: '拥挤',
    emoji: '🍖',
  },
  {
    id: 'd7',
    name: '酸辣粉',
    price: 10,
    canteen: '一食堂',
    window: '小吃窗口',
    rating: 4.3,
    reviewCount: 167,
    tags: ['酸辣', '开胃', '实惠'],
    heatStatus: '正常',
    emoji: '🥢',
  },
];

// ========== Mock API 方法 ==========

/**
 * 获取食堂列表
 * 后续替换：GET /api/canteens
 */
export function getCanteens(): Promise<Canteen[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...canteens]), 300);
  });
}

/**
 * 获取推荐菜品列表
 * 后续替换：GET /api/dishes/recommended
 */
export function getRecommendedDishes(): Promise<Dish[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...dishes]), 400);
  });
}

/**
 * 获取今日推荐文案
 * 后续替换：GET /api/suggestion/today
 */
export function getTodaySuggestion(): Promise<TodaySuggestion> {
  return new Promise((resolve) => {
    const suggestions = [
      { text: '今天二食堂比较拥挤，建议去一食堂川菜窗口试试宫保鸡丁。', highlightDish: dishes[0] },
      { text: '天气转凉，推荐来一碗二食堂的番茄牛腩面，暖胃又好吃！', highlightDish: dishes[1] },
      { text: '三食堂今天很空闲，想吃清淡的话可以试试轻食沙拉。', highlightDish: dishes[4] },
      { text: '想吃辣的？一食堂麻辣烫窗口的麻辣香锅值得一试！', highlightDish: dishes[2] },
      { text: '赶时间的话，三食堂快餐窗口的鸡蛋炒饭出餐很快。', highlightDish: dishes[3] },
    ];
    const random = suggestions[Math.floor(Math.random() * suggestions.length)];
    setTimeout(() => resolve(random), 300);
  });
}

/**
 * 根据关键词搜索菜品
 * 后续替换：GET /api/dishes/search?keyword=xxx
 */
export function searchDishes(keyword: string): Promise<Dish[]> {
  return new Promise((resolve) => {
    const filtered = dishes.filter(
      (d) =>
        d.name.includes(keyword) ||
        d.canteen.includes(keyword) ||
        d.window.includes(keyword) ||
        d.tags.some((t) => t.includes(keyword))
    );
    setTimeout(() => resolve(filtered), 200);
  });
}

/**
 * 获取热门搜索关键词
 * 后续替换：GET /api/search/hot-keywords
 */
export function getHotKeywords(): Promise<string[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve([
      '麻辣香锅', '宫保鸡丁', '清淡', '快餐', '沙拉',
      '面食', '下饭', '实惠', '高人气', '暖胃',
    ]), 200);
  });
}

/**
 * 获取搜索建议（输入联想）
 * 后续替换：GET /api/search/suggestions?keyword=xxx
 */
export function getSearchSuggestions(keyword: string): Promise<string[]> {
  return new Promise((resolve) => {
    if (!keyword.trim()) {
      resolve([]);
      return;
    }
    const kw = keyword.trim();
    // 从菜品名、食堂、窗口、标签中提取匹配项
    const suggestions = new Set<string>();
    for (const d of dishes) {
      if (d.name.includes(kw)) suggestions.add(d.name);
      if (d.canteen.includes(kw)) suggestions.add(d.canteen);
      if (d.window.includes(kw)) suggestions.add(d.window);
      for (const tag of d.tags) {
        if (tag.includes(kw)) suggestions.add(tag);
      }
    }
    setTimeout(() => resolve([...suggestions].slice(0, 8)), 150);
  });
}
