import React, { useRef, useState } from 'react';
import type { StoryWithDistance } from '../types/story';
import { getDateColor, getTextColor, getDateRange, getTodayString } from '../utils/colorUtils';
import { t } from '../i18n';
// 样式请统一写入插件根目录的 styles.css

interface MinimapSegment {
  id: string;
  date?: string;
  top: number;
  height: number;
}

interface DateNavigationProps {
  stories: StoryWithDistance[];
  currentDate?: string;
  onDateClick?: (date: string) => void;
  minimapSegments?: MinimapSegment[];
  scrollHeight?: number;
  viewportHeight?: number;
  scrollTop?: number;
  onViewportJump?: (nextScrollTop: number) => void;
}

export default function DateNavigation({
  stories,
  currentDate,
  onDateClick,
  minimapSegments = [],
  scrollHeight = 0,
  viewportHeight = 0,
  scrollTop = 0,
  onViewportJump
}: DateNavigationProps) {
  const minimapRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);

  const safeTotalHeight = Math.max(scrollHeight, viewportHeight || 1);

  const viewportStyle = React.useMemo(() => {
    const topPercent = safeTotalHeight === 0 ? 0 : (scrollTop / safeTotalHeight) * 100;
    const heightPercent = safeTotalHeight === 0 ? 0 : (viewportHeight / safeTotalHeight) * 100;
    return {
      top: `${Math.min(100, Math.max(0, topPercent))}%`,
      height: `${Math.max(2, Math.min(100, heightPercent))}%`
    };
  }, [safeTotalHeight, scrollTop, viewportHeight]);

  // 合并相同日期的segments（但不合并无日期的story）
  const mergedSegments = React.useMemo(() => {
    if (!safeTotalHeight) return [];
    
    const dateGroups = new Map();
    
    // 按日期分组，同一天的story合并，但保持相邻日期的独立性
    minimapSegments.forEach((segment, index) => {
      const date = segment.date || `undated-${index}`; // 每个无日期story使用唯一ID
      
      // 使用日期作为组键，同一天的story会合并
      const groupKey = date;
      if (!dateGroups.has(groupKey)) {
        dateGroups.set(groupKey, {
          segments: [],
          totalHeight: 0,
          minTop: Infinity,
          maxTop: -Infinity,
          date: date
        });
      }
      
      const group = dateGroups.get(groupKey);
      group.segments.push({ ...segment, originalIndex: index });
      group.totalHeight += segment.height;
      group.minTop = Math.min(group.minTop, segment.top);
      group.maxTop = Math.max(group.maxTop, segment.top + segment.height);
    });
    
    // 转换为合并后的segments
    return Array.from(dateGroups.entries()).map(([groupKey, group]) => ({
      id: `merged-${groupKey}`,
      date: group.date && !group.date.startsWith('undated-') ? group.date : undefined,
      top: group.minTop,
      height: group.maxTop - group.minTop,
      originalSegments: group.segments,
      segmentCount: group.segments.length
    }));
  }, [minimapSegments, safeTotalHeight]);

  const normalizedSegments = React.useMemo(() => {
    if (!safeTotalHeight) return [];
    return mergedSegments.map((segment: any) => ({
      ...segment,
      topPercent: (segment.top / safeTotalHeight) * 100,
      heightPercent: Math.max((segment.height / safeTotalHeight) * 100, 0.3)
    }));
  }, [mergedSegments, safeTotalHeight]);

  // 格式化日期显示（去掉年份）
  const formatDateForMinimap = (dateStr: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${month}-${day}`;
    } catch {
      return dateStr;
    }
  };

  // 获取minimap显示文本 - 根据block高度动态调整
  const getMinimapText = (mergedSegment: any, blockHeight: number) => {
    // 首先尝试从segment获取日期
    let dateStr = mergedSegment?.date;

    // 如果segment没有日期，尝试从第一个story获取
    if (!dateStr && mergedSegment?.originalSegments?.[0]) {
      const firstStory = mergedSegment.originalSegments[0];
      const story = stories[firstStory.originalIndex];
      dateStr = story?.date || undefined; // 确保返回 undefined 而不是访问 undefined.date
    }
    
    const formattedDate = formatDateForMinimap(dateStr);
    if (formattedDate) {
      // 有日期的story：显示日期
      if (blockHeight < 1) {
        return ''; // 高度太小，不显示文字
      } else {
        return formattedDate; // 显示日期
      }
    }
    
    // 未定日期的显示第一个story的标题
    const firstStory = mergedSegment.originalSegments?.[0];
    if (firstStory) {
      const story = stories[firstStory.originalIndex];
      const title = (story?.name || story?.description || t('minimap.undated'));

      if (blockHeight < 1) {
        return ''; // 高度太小，不显示文字
      } else if (blockHeight < 5) {
        return title.length > 2 ? title.substring(0, 2) + '...' : title; // 截断显示
      } else {
        return title; // 显示完整标题
      }
    }
    
    return t('minimap.undated');
  };

  // 根据block高度获取字体大小类名
  const getFontSizeClass = (blockHeight: number, segmentCount: number = 1) => {
    // 如果是合并的segment（多个story同一天），使用更大的字体
    const adjustedHeight = segmentCount > 1 ? blockHeight * 1.5 : blockHeight;
    
    if (adjustedHeight < 1) {
      return 'font-hidden'; // 不显示文字
    } else if (adjustedHeight < 3) {
      return 'font-tiny'; // 极小字体
    } else if (adjustedHeight < 5) {
      return 'font-small'; // 缩小字体
    } else if (adjustedHeight < 10) {
      return 'font-normal'; // 正常字体
    } else {
      return 'font-large'; // 大字体（用于合并的block）
    }
  };

  // 获取状态类名
  const getStatusClass = (story: any) => {
    const getStatus = (story: any): 'past' | 'planned' | 'unplanned' => {
      // 如果 story 是 undefined，返回 unplanned
      if (!story) return 'unplanned';

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateStr = story.date;
      if (!dateStr) return 'unplanned';
      const date = new Date(dateStr);
      date.setHours(0, 0, 0, 0);
      if (date < today) return 'past';
      if (date >= today) return 'planned';
      return 'unplanned';
    };

    const status = getStatus(story);
    return `status-${status}`;
  };

  // 获取动态颜色
  const getMinimapColor = (story: any) => {
    // 如果 story 是 undefined，返回默认颜色
    if (!story) return getDateColor(undefined, getDateRange(stories).earliest, getDateRange(stories).latest, getTodayString());

    const dateRange = getDateRange(stories);
    const todayString = getTodayString();
    return getDateColor(story?.date, dateRange.earliest, dateRange.latest, todayString);
  };

  const handlePointer = (clientY: number) => {
    if (!minimapRef.current) return;
    const rect = minimapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const offset = clientY - rect.top;
    const ratio = rect.height === 0 ? 0 : offset / rect.height;
    const target = ratio * safeTotalHeight - viewportHeight / 2;
    const clamped = Math.max(0, Math.min(target, safeTotalHeight - viewportHeight));
    onViewportJump?.(clamped);
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    handlePointer(event.clientY);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    handlePointer(event.touches[0].clientY);
  };

  React.useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current) return;
      event.preventDefault();
      handlePointer(event.clientY);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!isDraggingRef.current) return;
      handlePointer(event.touches[0].clientY);
    };

    const stopDrag = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', stopDrag);
    window.addEventListener('touchcancel', stopDrag);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', stopDrag);
      window.removeEventListener('touchcancel', stopDrag);
    };
  }, [safeTotalHeight, viewportHeight]);

  const handleClick = (segment: MinimapSegment) => {
    if (segment.date && onDateClick) {
      onDateClick(segment.date);
    }
  };

  // 调试信息已移除

  return (
    <div className='date-navigation'>
      <div
        className='minimap-container'
        ref={minimapRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className='minimap-track'>
          {normalizedSegments.length > 0 ? (
            normalizedSegments.map((segment: any) => {
              // 获取第一个story的样式作为代表
              const firstStory = segment.originalSegments?.[0];
              const story = firstStory ? stories[firstStory.originalIndex] : null;
              
              // 计算block高度（像素）
              const blockHeightPx = (segment.heightPercent / 100) * 200; // 假设minimap高度为200px
              const displayText = getMinimapText(segment, blockHeightPx);
              const fontSizeClass = getFontSizeClass(blockHeightPx, segment.segmentCount || 1);
              const statusClass = getStatusClass(story);
              const backgroundColor = getMinimapColor(story);
              const textColor = getTextColor(backgroundColor, story?.date, getTodayString());
              
              return (
                <div
                  key={segment.id}
                  className={`minimap-block ${statusClass} ${fontSizeClass}`}
                  style={{
                    top: `${Math.min(99.7, Math.max(0, segment.topPercent))}%`,
                    height: `${Math.min(100, segment.heightPercent)}%`,
                    // 使用CSS变量来设置动态颜色
                    '--dynamic-bg': backgroundColor,
                    '--dynamic-color': textColor,
                    '--dynamic-border': backgroundColor,
                    backgroundColor: 'var(--dynamic-bg)',
                    color: 'var(--dynamic-color)',
                    borderColor: 'var(--dynamic-border)',
                  } as React.CSSProperties}
                  onClick={(event) => {
                    event.stopPropagation();
                    // 点击时跳转到第一个segment的位置
                    if (firstStory) {
                      handleClick({ 
                        id: firstStory.id, 
                        date: segment.date, 
                        top: firstStory.top, 
                        height: firstStory.height 
                      });
                    }
                  }}
                  title={`${segment.date || t('minimap.undated')} (${segment.segmentCount}${t('minimap.events')})`}
                >
                  {displayText}
                </div>
              );
            })
          ) : (
            // 如果没有segments，显示基于stories的blocks
            stories.map((story, index) => {
              const blockHeightPx = Math.max(2, 200 / stories.length); // 假设minimap高度为200px
              const displayText = getMinimapText({ date: story?.date, originalSegments: [{ originalIndex: index }] }, blockHeightPx);
              const fontSizeClass = getFontSizeClass(blockHeightPx);
              const statusClass = getStatusClass(story);
              const backgroundColor = getMinimapColor(story);
              const textColor = getTextColor(backgroundColor, story?.date, getTodayString());
              
              return (
                <div
                  key={`test-${index}`}
                  className={`minimap-block ${statusClass} ${fontSizeClass}`}
                  style={{
                    top: `${(index / stories.length) * 100}%`,
                    height: `${Math.max(2, 100 / stories.length)}%`,
                    // 使用CSS变量来设置动态颜色
                    '--dynamic-bg': backgroundColor,
                    '--dynamic-color': textColor,
                    '--dynamic-border': backgroundColor,
                    backgroundColor: 'var(--dynamic-bg)',
                    color: 'var(--dynamic-color)',
                    borderColor: 'var(--dynamic-border)',
                  } as React.CSSProperties}
                  title={story?.name || story?.description || story?.date || t('minimap.undated')}
                >
                  {displayText}
                </div>
              );
            })
          )}
          <div className='minimap-viewport' style={viewportStyle} />
        </div>
      </div>
    </div>
  );
}