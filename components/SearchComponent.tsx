import React, { useState, useEffect, useRef } from 'react';
import { t } from '../i18n';

interface SearchComponentProps {
  onSearch?: (query: string) => void;
  onClose?: () => void;
  onSearchStateChange?: (isSearching: boolean) => void;
  placeholder?: string;
  isSearching?: boolean; // 添加外部搜索状态控制
}

export default function SearchComponent({ 
  onSearch, 
  onClose,
  onSearchStateChange,
  placeholder = t('search.placeholder'),
  isSearching = false
}: SearchComponentProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchToggle = () => {
    const newState = !isSearchOpen;
    setIsSearchOpen(newState);
    if (isSearchOpen) {
      setSearchQuery('');
      onSearch?.('');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // 通知搜索状态变化
    onSearchStateChange?.(value.trim().length > 0);
    
    // 清除之前的延迟
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // 设置新的延迟搜索
    searchTimeoutRef.current = setTimeout(() => {
      onSearch?.(value);
    }, 300); // 300ms延迟
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      closeSearch();
    }
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
    onSearch?.('');
    onSearchStateChange?.(false);
    onClose?.();
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // 响应外部搜索状态变化
  useEffect(() => {
    if (!isSearching && isSearchOpen) {
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  }, [isSearching]); // 移除isSearchOpen依赖，避免循环

  return (
    <div className='search-component'>
      <button 
        className={`search-toggle ${isSearchOpen ? 'active' : ''}`}
        onClick={handleSearchToggle}
        title={t('search.title')}
      />
      
      {isSearchOpen && (
        <div className='search-form'>
          <input
            type="text"
            className='search-input'
            placeholder={placeholder}
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
