// 食堂信息
export interface Canteen {
  id: string;
  name: string;
  status: '空闲' | '正常' | '拥挤';
  distance: string;
  openTime: string;
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

// 今日推荐文案
export interface TodaySuggestion {
  text: string;
  highlightDish?: Dish;
}
