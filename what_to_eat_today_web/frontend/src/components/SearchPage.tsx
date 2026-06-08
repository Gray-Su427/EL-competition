import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Dish } from '../types';
import { searchDishes, getHotKeywords, getSearchSuggestions } from '../mock/mockApi';

/** 搜索结果类型：引导态 / 建议态 / 结果态 */
type SearchMode = 'guide' | 'suggest' | 'result';

const HISTORY_KEY = 'search_history';
const MAX_HISTORY = 10;

/** 从 localStorage 读取搜索历史 */
function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** 保存搜索历史到 localStorage */
function saveHistory(list: string[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [mode, setMode] = useState<SearchMode>('guide');
  const [hotKeywords, setHotKeywords] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<Dish[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 页面加载时自动聚焦 + 加载数据
  useEffect(() => {
    setKeyword('');
    setMode('guide');
    setResults([]);
    setSuggestions([]);
    setHistory(loadHistory());
    getHotKeywords().then(setHotKeywords);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // 输入变化 → 切换到建议态 + 防抖获取建议
  const handleInputChange = useCallback((value: string) => {
    setKeyword(value);
    if (!value.trim()) {
      setMode('guide');
      setSuggestions([]);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }
    setMode('suggest');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      getSearchSuggestions(value.trim()).then(setSuggestions);
    }, 300);
  }, []);

  // 执行搜索
  const doSearch = useCallback(async (kw: string) => {
    const trimmed = kw.trim();
    if (!trimmed) return;
    setMode('result');
    setSearching(true);
    setKeyword(trimmed);

    // 保存搜索历史
    const newHistory = [trimmed, ...history.filter((h) => h !== trimmed)].slice(0, MAX_HISTORY);
    setHistory(newHistory);
    saveHistory(newHistory);

    try {
      const data = await searchDishes(trimmed);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [history]);

  // 按回车搜索
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      doSearch(keyword);
    }
  };

  // 点击标签（热门 / 历史）
  const handleTagClick = (tag: string) => {
    setKeyword(tag);
    doSearch(tag);
  };

  // 清空搜索历史
  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  // 返回引导态
  const handleBackToGuide = () => {
    setKeyword('');
    setMode('guide');
    setResults([]);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  // 热度颜色
  const heatColor: Record<string, string> = {
    '空闲': '#8BC34A',
    '正常': '#FF9800',
    '拥挤': '#F44336',
  };

  return (
    <div className="search-page">
      {/* 搜索栏 */}
      <div className="search-page-header">
        <div className="search-page-bar">
          <span className="search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="search-page-input"
            placeholder="搜索菜品 / 食堂 / 窗口"
            value={keyword}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {keyword && (
            <button className="search-clear-btn" onClick={handleBackToGuide}>
              ✕
            </button>
          )}
        </div>
        <button className="search-cancel-btn" onClick={() => navigate('/')}>
          取消
        </button>
      </div>

      <div className="search-page-body">
        {/* 引导态：热门搜索 + 搜索历史 */}
        {mode === 'guide' && (
          <>
            {/* 热门搜索 */}
            {hotKeywords.length > 0 && (
              <div className="search-section">
                <h4 className="search-section-title">🔥 热门搜索</h4>
                <div className="search-tags">
                  {hotKeywords.map((kw) => (
                    <button
                      key={kw}
                      className="search-tag"
                      onClick={() => handleTagClick(kw)}
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 搜索历史 */}
            {history.length > 0 && (
              <div className="search-section">
                <div className="search-section-header">
                  <h4 className="search-section-title">🕐 搜索历史</h4>
                  <button className="search-clear-history" onClick={clearHistory}>
                    清空
                  </button>
                </div>
                <div className="search-tags">
                  {history.map((h) => (
                    <button
                      key={h}
                      className="search-tag history-tag"
                      onClick={() => handleTagClick(h)}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 引导提示 */}
            {hotKeywords.length === 0 && history.length === 0 && (
              <div className="search-empty-guide">
                <span className="search-empty-icon">🍽️</span>
                <p>输入你想吃的菜品、食堂或口味</p>
              </div>
            )}
          </>
        )}

        {/* 建议态：输入联想 */}
        {mode === 'suggest' && (
          <div className="search-suggestions">
            {suggestions.length > 0 ? (
              suggestions.map((s) => (
                <button
                  key={s}
                  className="suggestion-item"
                  onClick={() => handleTagClick(s)}
                >
                  <span className="suggestion-icon">🔍</span>
                  <span className="suggestion-text">{s}</span>
                </button>
              ))
            ) : (
              <div className="search-no-suggestion">
                <p>输入关键词后按回车搜索</p>
              </div>
            )}
          </div>
        )}

        {/* 结果态：搜索结果 */}
        {mode === 'result' && (
          <div className="search-results">
            {searching ? (
              <div className="search-loading">
                <span className="loading-emoji">🔍</span>
                <p>正在搜索...</p>
              </div>
            ) : results.length > 0 ? (
              <>
                <div className="search-result-count">
                  找到 <strong>{results.length}</strong> 个结果
                </div>
                {results.map((dish) => (
                  <div key={dish.id} className="dish-card">
                    <div className="dish-card-left">
                      <span className="dish-emoji">{dish.emoji}</span>
                    </div>
                    <div className="dish-card-center">
                      <div className="dish-name-row">
                        <span className="dish-name">{dish.name}</span>
                        <span className="dish-price">¥{dish.price}</span>
                      </div>
                      <div className="dish-location">
                        {dish.canteen} · {dish.window}
                      </div>
                      <div className="dish-meta">
                        <span className="dish-rating">⭐ {dish.rating}</span>
                        <span className="dish-reviews">{dish.reviewCount}条评价</span>
                        <span
                          className="dish-heat"
                          style={{
                            backgroundColor: heatColor[dish.heatStatus] + '22',
                            color: heatColor[dish.heatStatus],
                          }}
                        >
                          {dish.heatStatus}
                        </span>
                      </div>
                      <div className="dish-tags">
                        {dish.tags.map((tag) => (
                          <span key={tag} className="dish-tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="search-no-results">
                <span className="search-empty-icon">😅</span>
                <p>没有找到「{keyword}」相关菜品</p>
                <span className="search-no-results-hint">换个关键词试试吧</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
