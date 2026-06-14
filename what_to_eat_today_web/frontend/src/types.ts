// 食堂信息
export interface Canteen {
  id: string;
  name: string;
  status: '空闲' | '正常' | '拥挤';
  distance: string;
  openTime: string;
  currentPeople: number | null;
  occupancyPct: string | null;
}

// 菜品信息
export interface Dish {
  id: string;
  name: string;
  price: number;
  canteen: string;
  window: string;
  rating: number;
  reviewCount: number;
  tags: string[];
  heatStatus: '空闲' | '正常' | '拥挤';
  emoji: string;
}

export interface AiSessionInit {
  profileStatus: 'empty' | 'partial' | 'ready';
  profileSummary: string;
  introMessage: string;
  recommendedDishes: Dish[];
}

// 今日推荐文案
export interface TodaySuggestion {
  text: string;
  highlightDish?: Dish;
}

// 菜品评价
export interface Review {
  id: number;
  userId: number;
  dishId: string;
  dishName: string;
  dishEmoji: string;
  nickname: string;
  rating: number;
  content: string | null;
  tags: string[];
  images: string[];
  createdAt: string;
  updatedAt?: string | null;
}
