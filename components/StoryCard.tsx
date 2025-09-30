import React, { useState, useRef, useEffect } from 'react';
import type { StoryWithDistance } from '../types/story';
import { getDateColor, getTextColor, getDateRange, getTodayString } from '../utils/colorUtils';
import { t } from '../i18n';
// 样式请统一写入插件根目录的 styles.css

interface StoryCardProps {
  story: StoryWithDistance;
  showDate?: boolean;
  isSameDay?: boolean;
  sameDayPosition?: number;
  onClick?: (story: StoryWithDistance) => void;
  onLongPress?: (story: StoryWithDistance) => void;
  allStories?: StoryWithDistance[]; // 用于计算日期范围
  isReordering?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onEndReorder?: () => void;
}

function getStatus(story: StoryWithDistance): 'past' | 'planned' | 'unplanned' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = story.date;
  if (!dateStr) return 'unplanned';
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  if (date < today) return 'past';
  if (date >= today) return 'planned';
  return 'unplanned';
}

export default function StoryCard({ 
  story, 
  showDate = false, 
  isSameDay = false,
  sameDayPosition = 0,
  onClick,
  onLongPress,
  allStories = [],
  isReordering = false,
  onMoveUp,
  onMoveDown,
  onEndReorder
}: StoryCardProps) {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isUnplanned = !story.date;

  // 长按检测
  const handleMouseDown = (e: React.MouseEvent) => {
    // 只有当不是unplanned或当前卡片正在重排序时才返回
    if (!isUnplanned) return;

    e.preventDefault();
    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true);
      onLongPress?.(story);
    }, 500); // 500ms长按触发
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
  };

  const handleMouseLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
  };

  // 触摸事件
  const handleTouchStart = (e: React.TouchEvent) => {
    // 只有当不是unplanned时才返回
    if (!isUnplanned) return;

    e.preventDefault();
    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true);
      onLongPress?.(story);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const handleClick = () => {
    if (!isLongPressing && !isReordering) {
      onClick?.(story);
    }
  };
  const getStoryDate = () => {
    if (story.date) return story.date;
    return null;
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    
    // 补全分钟显示
    if (time.includes(':')) {
      return time;
    } else {
      return time + ':00';
    }
  };

  const getDateFromTime = (time: string) => {
    if (!time) return '';
    if (time.includes(' ')) {
      return time.split(' ')[0]; // 提取日期部分
    }
    return '';
  };

  const getTimeFromTime = (time: string) => {
    if (!time) return '';
    if (time.includes(' ')) {
      return time.split(' ')[1]; // 提取时间部分
    }
    return time;
  };

  const date = getStoryDate();
  let timeRange = '';
  
  if (story.start_time && story.end_time) {
    const startDate = getDateFromTime(story.start_time);
    const endDate = getDateFromTime(story.end_time);
    
    if (startDate === endDate) {
      // 同一天：显示 "date time ~ time"
      timeRange = `${startDate} ${getTimeFromTime(story.start_time)} ~ ${getTimeFromTime(story.end_time)}`;
    } else {
      // 不同天：显示 "date time ~ date time"
      timeRange = `${formatTime(story.start_time)} ~ ${formatTime(story.end_time)}`;
    }
  } else if (story.start_time) {
    timeRange = formatTime(story.start_time);
  }

  const status = getStatus(story);
  
  // 计算动态颜色
  const dateRange = getDateRange(allStories);
  const todayString = getTodayString();
  const backgroundColor = getDateColor(story.date, dateRange.earliest, dateRange.latest, todayString);
  const textColor = getTextColor(backgroundColor, story.date, todayString);
  
  // 检查是否是今天的故事
  const isToday = story.date === todayString;
  
  // 调试信息已移除
  
  // unplanned被同一天story包围时也使用same-day样式
  const cardClass = `story-card${status === 'past' ? ' past' : status === 'planned' ? ' planned' : ' unplanned'}${isSameDay ? ' same-day' : ''}${isReordering ? ' reordering' : ''}${isToday ? ' today' : ''}`;

  return (
    <div 
      className={cardClass} 
      style={{
        // 无日期卡片不使用动态颜色，保持原有样式
        ...(isUnplanned ? {} : {
          // 使用CSS变量来设置动态颜色
          '--dynamic-bg': backgroundColor,
          '--dynamic-color': textColor,
          '--dynamic-border': backgroundColor,
          backgroundColor: 'var(--dynamic-bg)',
          color: 'var(--dynamic-color)',
          borderColor: 'var(--dynamic-border)',
        }),
        ...(isSameDay ? { 
          marginBottom: '0px',
          // 根据同一天位置设置z-index，位置越靠后z-index越高（覆盖前面的故事）
          zIndex: 10 + sameDayPosition
        } : {})
      } as React.CSSProperties}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 重排序模式下的箭头按钮 */}
      {isReordering && isUnplanned && (
        <div className="reorder-controls">
          <button
            className="reorder-btn reorder-up"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp?.();
            }}
            title={t('storyCard.moveUp')}
          >
            <span className="arrow-up">&gt;</span>
          </button>
          <button
            className="reorder-btn reorder-down"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown?.();
            }}
            title={t('storyCard.moveDown')}
          >
            <span className="arrow-down">&lt;</span>
          </button>
        </div>
      )}

      {showDate && (date || timeRange) && (
        <div className='story-date'>
          <div className='datetime'>
            {timeRange ? (
              <span className='time-text'>{timeRange}</span>
            ) : (
              <span className='date-text'>{date}</span>
            )}
          </div>
          {story.address && (
            <span className='address-text'>📍 {story.address.name}</span>
          )}
        </div>
      )}

      {/* 无日期故事的地址显示 - 只有当有地址时才显示 */}
      {!date && story.address && story.address.name && (
        <div className='story-date'>
          <div className='datetime'>
            <span className='date-text'>~</span>
          </div>
          <span className='address-text'>📍 {story.address.name}</span>
        </div>
      )}
      
      <div className='story-content'>
        <div className='story-header'>
          <span className='story-name'>{story.name}</span>
          {story.description && (
            <span className='description-text'> {story.description}</span>
          )}
        </div>
      </div>
    </div>
  );
} 