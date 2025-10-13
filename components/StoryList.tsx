import React, { useState, useRef, useEffect } from 'react';
import type { StoryWithDistance } from '../types/story';
import type { LifeFlowSettings } from '../types';
import { t } from '../i18n';
import StoryCard from './StoryCard';
import DateNavigation from './DateNavigation';
import DayDotSeparator from './DayDotSeparator';
import StoryEditModal from './StoryEditModal';
import ConfirmModal from './modals/ConfirmModal';
import SearchComponent from './SearchComponent';
import { getTodayString } from '../utils/colorUtils';
import { processStoriesWithDistance } from '../utils/dataParser';
// 样式请统一写入插件根目录的 styles.css

interface StoryListProps {
  stories: StoryWithDistance[];
  onStoriesChange?: (stories: StoryWithDistance[], options?: { needsResort?: boolean }) => void;
  settings: LifeFlowSettings;
  updateSettings?: (newSettings: Partial<LifeFlowSettings>) => Promise<void>;
}

export default function StoryList({ stories, onStoriesChange, settings, updateSettings }: StoryListProps) {
  const [currentDate, setCurrentDate] = useState('');
  const [editingStory, setEditingStory] = useState(null as StoryWithDistance | null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  // 创建"下一事项"的临时草稿状态（仅在保存时插入）
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [draftInsertIndex, setDraftInsertIndex] = useState(null as number | null);
  
  // 重排序状态（仅用于unplanned卡片）
  const [isReordering, setIsReordering] = useState(false);
  const [reorderIndex, setReorderIndex] = useState(null as number | null);

  const [minimapSegments, setMinimapSegments] = useState<any[]>([]);
  const [scrollHeight, setScrollHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  
  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStories, setFilteredStories] = useState(stories);
  const [isSearching, setIsSearching] = useState(false);
  
  // 初始滚动状态
  const [hasInitialScrolled, setHasInitialScrolled] = useState(false);
  const [lastScrollStoriesCount, setLastScrollStoriesCount] = useState(0);
  
  // 保存删除前的滚动位置
  const [savedScrollPosition, setSavedScrollPosition] = useState(null as number | null);
  const [shouldRestoreScroll, setShouldRestoreScroll] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollViewRef = useRef<HTMLDivElement>(null);
  const dateOffsetRef = useRef(new Map());


  // 使用useLayoutEffect在DOM更新后计算minimap segments
  React.useLayoutEffect(() => {
    if (!scrollViewRef.current) return;

    // 延迟计算，确保所有DOM元素都已渲染
    const calculateSegments = () => {
      const segments: any[] = [];
      const dateOffsets = new Map();
      const scrollEl = scrollViewRef.current;

      // 简化：只计算有效的cardRefs，跳过null的
      const validCardCount = cardRefs.current.filter(ref => ref !== null).length;
      
      // 如果有效card数量太少，延迟重试
      if (validCardCount < stories.length * 0.8) { // 至少80%的cards要准备好
        setTimeout(calculateSegments, 50);
        return;
      }

      stories.forEach((story, index) => {
        const cardEl = cardRefs.current[index];
        if (!cardEl) return;
        const rect = cardEl.getBoundingClientRect();
        const parentRect = scrollEl?.getBoundingClientRect();
        if (!parentRect) return;
        const top = rect.top - parentRect.top + (scrollEl?.scrollTop || 0);
        const height = rect.height;


        segments.push({
          id: `segment-${index}`,
          date: story.date,
          top,
          height: Math.max(8, height) // 只设置最小高度，不限制最大高度
        });

        if (story.date && !dateOffsets.has(story.date)) {
          dateOffsets.set(story.date, top);
        }
      });

      // 自动滚动到今天的事件

      setMinimapSegments(segments);
      dateOffsetRef.current = dateOffsets;
      setScrollHeight(scrollEl?.scrollHeight || 0);
      setViewportHeight(scrollEl?.clientHeight || 0);
    };

    calculateSegments();
  }, [stories]); // 移除 cardRefs.current.length 依赖，避免无限循环

  // 不进行循环复制，直接使用原始 stories

  const handleDateClick = (date: string) => {
    setCurrentDate(date);
  };

  const handleStoryClick = (story: StoryWithDistance) => {
    // 如果正在搜索，点击时定位到原始位置而不是打开编辑框
    if (isSearching) {
      // 使用更精确的匹配方式，包括所有字段
      const originalIndex = stories.findIndex(s => 
        s.name === story.name && 
        s.date === story.date && 
        s.description === story.description &&
        s.start_time === story.start_time &&
        s.end_time === story.end_time &&
        s.address?.name === story.address?.name
      );
      
      if (originalIndex !== -1) {
        // 先清空搜索，恢复完整列表
        setSearchQuery('');
        setFilteredStories(stories);
        setIsSearching(false);
        
        // 使用更可靠的滚动逻辑
        const scrollToPosition = () => {
          if (!scrollViewRef.current) return;
          
          // 等待DOM更新完成
          requestAnimationFrame(() => {
            // 重新计算cardRefs
            const allCards = scrollViewRef.current?.querySelectorAll('.story-wrapper');
            if (!allCards || allCards.length === 0) {
              // 如果还没准备好，再等一会儿
              setTimeout(scrollToPosition, 100);
              return;
            }
            
            let totalHeight = 0;
            for (let i = 0; i < originalIndex && i < allCards.length; i++) {
              const cardEl = allCards[i] as HTMLElement;
              if (cardEl) {
                totalHeight += cardEl.offsetHeight;
              }
            }
            
            // 滚动到目标位置，留一些边距
            const targetScrollTop = Math.max(0, totalHeight - 150);
            if (scrollViewRef.current) {
              scrollViewRef.current.scrollTo({
                top: targetScrollTop,
                behavior: 'smooth'
              });
            }
          });
        };
        
        // 延迟执行，确保DOM更新完成
        setTimeout(scrollToPosition, 200);
      } else {
        // 如果找不到原始位置，也要清空搜索
        setSearchQuery('');
        setFilteredStories(stories);
        setIsSearching(false);
      }
      return;
    }
    
    // 正常情况下的编辑逻辑
    console.log('🔍 [handleStoryClick] Original story:', {
      id: story.id,
      name: story.name,
      hasId: !!story.id
    });
    setEditingStory(story);
    setIsModalVisible(true);
  };

  const handleSearchClose = () => {
    setSearchQuery('');
    setFilteredStories(stories);
    setIsSearching(false);
  };

  const handleSearchStateChange = (searching: boolean) => {
    setIsSearching(searching);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setEditingStory(null);
    setIsCreatingDraft(false);
    setDraftInsertIndex(null);
  };

  const handleModalSave = (updatedStory: StoryWithDistance) => {
    if (isCreatingDraft) {
      // 如果是草稿，直接插入到指定位置
      const newStories = [...stories];
      const insertAt = draftInsertIndex ?? newStories.length;
      
      newStories.splice(insertAt, 0, updatedStory);
      
      
      // 如果新故事有时间，需要重新排序
      if (updatedStory.start_time || updatedStory.end_time) {
        onStoriesChange?.(newStories, { needsResort: true });
      } else {
        onStoriesChange?.(newStories);
      }
      
      setIsCreatingDraft(false);
      setDraftInsertIndex(null);
    } else {
      // 更新现有故事
      const updatedStories = stories.map(story =>
        story === editingStory ? updatedStory : story
      );
      
      
      // 检查时间是否发生变化，如果变化则需要重新排序
      const timeChanged = editingStory?.start_time !== updatedStory.start_time || 
                         editingStory?.end_time !== updatedStory.end_time;
      if (timeChanged) {
        // 时间变化时，需要重新排序整个列表
        onStoriesChange?.(updatedStories, { needsResort: true });
      } else {
        onStoriesChange?.(updatedStories);
      }
    }
    setIsModalVisible(false);
    setEditingStory(null);
  };

  const handleModalNext = (updatedStory: StoryWithDistance) => {
    // 1) 先保存当前编辑项
    const currentIndex = stories.findIndex(story => story === editingStory);
    const savedStories = stories.map(story => (story === editingStory ? updatedStory : story));
    onStoriesChange?.(savedStories);

    // 2) 创建新草稿
    const draftStory: StoryWithDistance = {
      name: '',
      address: { name: '' },
      start_time: '',
      end_time: '',
      description: '',
      distanceFromPrevious: 0,
      hasDate: false
    };

    // 3) 找到当前故事后面的第一个已有故事，将新故事插入到其上方
    let insertIndex = savedStories.length; // 默认插入到最后
    for (let i = currentIndex + 1; i < savedStories.length; i++) {
      // 找到第一个已有故事（不是草稿）
      if (savedStories[i]?.name && savedStories[i]?.name?.trim() !== '') {
        insertIndex = i;
        break;
      }
    }

    setEditingStory(draftStory);
    setIsCreatingDraft(true);
    setDraftInsertIndex(insertIndex);
    setIsModalVisible(true);
  };

  // 在编辑弹窗内点击删除
  const handleModalDelete = async (targetStory: StoryWithDistance) => {
    const name = targetStory?.name || t('confirm.deleteItem');
    // 如果是在创建草稿，删除视作放弃创建
    if (isCreatingDraft) {
      const okCreate = await new ConfirmModal(t('confirm.abandonCreate'), t('confirm.abandon'), t('common.cancel'), true).open();
      if (!okCreate) return;
      setIsCreatingDraft(false);
      setDraftInsertIndex(null);
      setIsModalVisible(false);
      setEditingStory(null);
      return;
    }
    const ok = await new ConfirmModal(t('confirm.deleteStory', { name }), t('common.delete'), t('common.cancel'), true).open();
    if (!ok) return;

    // 保存当前滚动位置
    if (scrollViewRef.current) {
      const currentScrollTop = scrollViewRef.current.scrollTop;
      setSavedScrollPosition(currentScrollTop);
      setShouldRestoreScroll(true);
    }

    const index = stories.findIndex(s => s === editingStory);
    if (index < 0) return;

    const newStories = [...stories];
    newStories.splice(index, 1);
    onStoriesChange?.(newStories);
    setIsModalVisible(false);
    setEditingStory(null);
  };


  // 开始重排序（仅用于unplanned卡片）
  const handleStartReorder = (index: number) => {
    setIsReordering(true);
    setReorderIndex(index);
  };

  // 结束重排序
  const handleEndReorder = () => {
    setIsReordering(false);
    setReorderIndex(null);
  };

  // 处理键盘事件
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isReordering) {
        handleEndReorder();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isReordering]);

  // 上移unplanned卡片
  const handleMoveUp = () => {
    if (reorderIndex === null || reorderIndex <= 0) return;

    // 移动事件向上

    const newStories = [...stories];
    const currentStory = newStories[reorderIndex];

    // 移除当前卡片
    newStories.splice(reorderIndex, 1);
    // 插入到前一个位置
    newStories.splice(reorderIndex - 1, 0, currentStory);

    // 更新事件顺序

    // 更新索引
    setReorderIndex(reorderIndex - 1);
    onStoriesChange?.(newStories);
  };

  // 下移unplanned卡片
  const handleMoveDown = () => {
    if (reorderIndex === null || reorderIndex >= stories.length - 1) return;

    // 移动事件向下

    const newStories = [...stories];
    const currentStory = newStories[reorderIndex];

    // 移除当前卡片
    newStories.splice(reorderIndex, 1);
    // 插入到下一个位置
    newStories.splice(reorderIndex + 1, 0, currentStory);

    // 更新事件顺序

    // 更新索引
    setReorderIndex(reorderIndex + 1);
    onStoriesChange?.(newStories);
  };

  // 重新排序所有故事
  const handleResort = () => {
    const rawStories = stories.map(story => ({
      name: story.name,
      address: story.address,
      start_time: story.start_time,
      end_time: story.end_time,
      description: story.description
    }));
    
    // 重新排序
    const reorderedStories = processStoriesWithDistance(rawStories);
    
    onStoriesChange?.(reorderedStories, { needsResort: true });
  };

  // 处理点击"+"按钮新增story
  const handleAddNewStory = () => {
    // 创建空白草稿
    const draftStory: StoryWithDistance = {
      name: '',
      address: { name: '' },
      start_time: '',
      end_time: '',
      description: '',
      distanceFromPrevious: 0,
      hasDate: false
    };

    setEditingStory(draftStory);
    setIsCreatingDraft(true);
    setDraftInsertIndex(stories.length); // 插入到列表末尾
    setIsModalVisible(true);
  };

  const handleScroll = React.useCallback(() => {
    if (!scrollViewRef.current) return;
    const scrollEl = scrollViewRef.current;
    // 使用 requestAnimationFrame 避免频繁状态更新
    requestAnimationFrame(() => {
      setScrollTop(scrollEl.scrollTop);
    });
  }, []);

  // 搜索处理函数
  const handleSearch = React.useCallback((query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setFilteredStories(stories);
      return;
    }

    const filtered = stories.filter(story => {
      const searchText = query.toLowerCase();
      return (
        story.name?.toLowerCase().includes(searchText) ||
        story.description?.toLowerCase().includes(searchText) ||
        story.address?.name?.toLowerCase().includes(searchText) ||
        story.date?.includes(searchText)
      );
    });

    setFilteredStories(filtered);

    // 如果有搜索结果，跳转到第一个结果在原始stories中的位置
    if (filtered.length > 0) {
      setTimeout(() => {
        const firstFilteredStory = filtered[0];
        const originalIndex = stories.findIndex(story =>
          story.name === firstFilteredStory.name &&
          story.start_time === firstFilteredStory.start_time &&
          story.end_time === firstFilteredStory.end_time &&
          story.description === firstFilteredStory.description
        );

        if (originalIndex !== -1 && scrollViewRef.current) {
          // 计算原始位置
          let totalHeight = 0;
          for (let i = 0; i < originalIndex; i++) {
            const cardEl = cardRefs.current[i];
            if (cardEl) {
              totalHeight += cardEl.offsetHeight;
            }
          }

          scrollViewRef.current.scrollTo({
            top: totalHeight - 20,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [stories]); // 移除 cardRefs.current.length 依赖，避免无限循环

  // 同步stories变化到filteredStories
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStories(stories);
    }
  }, [stories, searchQuery]);

  // 使用实际DOM高度的滚动到今天逻辑
  React.useLayoutEffect(() => {

    if (!hasInitialScrolled && filteredStories.length > 0 && scrollViewRef.current) {
      let retryCount = 0;
      const maxRetries = 50; // 增加最大重试次数，给DOM更多时间准备
      
      const scrollToToday = () => {
        const todayString = getTodayString();
        const todayIndex = filteredStories.findIndex(story => story.date === todayString);


        if (todayIndex !== -1) {
          // 使用实际DOM高度计算滚动位置
          let totalHeight = 0;
          let allCardsReady = true;

          for (let i = 0; i < todayIndex; i++) {
            const cardEl = cardRefs.current[i];
            if (cardEl && cardEl.offsetHeight > 0) {
              totalHeight += cardEl.offsetHeight;
            } else {
              allCardsReady = false;
              break;
            }
          }


          if (allCardsReady && scrollViewRef.current) {
            const targetScrollTop = Math.max(0, totalHeight - 100);
            
            scrollViewRef.current.scrollTo({
              top: targetScrollTop,
              behavior: 'smooth'
            });

            setHasInitialScrolled(true);
            setLastScrollStoriesCount(stories.length);
          } else {
            // 如果DOM还没准备好，延迟重试
            retryCount++;
            if (retryCount < maxRetries) {
              setTimeout(scrollToToday, 100);
            } else {
              setHasInitialScrolled(true);
              setLastScrollStoriesCount(stories.length);
            }
          }
        } else {
          // 没有今天的事件，滚动到最近的未来事件
          
          const today = new Date(todayString);
          let closestFutureIndex = -1;
          let closestFutureDistance = Infinity;
          let closestPastIndex = -1;
          let closestPastDistance = Infinity;

          filteredStories.forEach((story, index) => {
            if (story.date) {
              const storyDate = new Date(story.date);
              const distance = Math.abs(storyDate.getTime() - today.getTime());
              
              if (storyDate >= today) {
                // 未来的事件
                if (distance < closestFutureDistance) {
                  closestFutureDistance = distance;
                  closestFutureIndex = index;
                }
              } else {
                // 过去的事件
                if (distance < closestPastDistance) {
                  closestPastDistance = distance;
                  closestPastIndex = index;
                }
              }
            }
          });

          // 优先选择未来的事件，如果没有未来事件才选择最近过去的事件
          const closestIndex = closestFutureIndex !== -1 ? closestFutureIndex : closestPastIndex;
          const isFutureEvent = closestFutureIndex !== -1;
          const closestDistance = isFutureEvent ? closestFutureDistance : closestPastDistance;


          if (closestIndex !== -1) {
            // 使用实际DOM高度计算滚动位置
            let totalHeight = 0;
            let allCardsReady = true;

          for (let i = 0; i < closestIndex; i++) {
            const cardEl = cardRefs.current[i];
            if (cardEl && cardEl.offsetHeight > 0) {
              totalHeight += cardEl.offsetHeight;
            } else {
              allCardsReady = false;
              break;
            }
          }

            if (allCardsReady && scrollViewRef.current) {
              const targetScrollTop = Math.max(0, totalHeight - 100);
              
              scrollViewRef.current.scrollTo({
                top: targetScrollTop,
                behavior: 'smooth'
              });

              setHasInitialScrolled(true);
              setLastScrollStoriesCount(stories.length);
            } else {
              // 如果DOM还没准备好，延迟重试
              retryCount++;
              if (retryCount < maxRetries) {
                setTimeout(scrollToToday, 100);
              } else {
                setHasInitialScrolled(true);
                setLastScrollStoriesCount(stories.length);
              }
            }
          } else {
            // 没有找到任何事件，设置状态避免重复尝试
            setHasInitialScrolled(true);
            setLastScrollStoriesCount(stories.length);
          }
        }
      };

           // 使用更长的延迟确保DOM完全准备就绪
           const timeoutId = setTimeout(() => {
             scrollToToday();
           }, 100); // 500ms延迟确保所有DOM元素都被正确渲染
           return () => clearTimeout(timeoutId);
    }
  }, [filteredStories.length, hasInitialScrolled]);

  // 恢复删除后的滚动位置
  React.useLayoutEffect(() => {
    if (shouldRestoreScroll && savedScrollPosition !== null && scrollViewRef.current && hasInitialScrolled) {
      // 延迟恢复滚动位置，确保DOM更新完成
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTop = savedScrollPosition;
          setShouldRestoreScroll(false);
          setSavedScrollPosition(null);
        }
      }, 100);
    }
  }, [stories, shouldRestoreScroll, savedScrollPosition, hasInitialScrolled]);

  // 计算所有故事的同一天状态和位置
  const calculateSameDayStates = (stories: StoryWithDistance[]) => {
    const sameDayStates = new Array(stories.length).fill(false);
    const sameDayPositions = new Array(stories.length).fill(0);
    
    // 按日期分组，模拟排序逻辑
    const dateGroups = new Map<string, { stories: typeof stories, indices: number[] }>();
    
    // 先处理有日期的故事
    for (let i = 0; i < stories.length; i++) {
      const story = stories[i];
      if (story.date) {
        if (!dateGroups.has(story.date)) {
          dateGroups.set(story.date, { stories: [], indices: [] });
        }
        dateGroups.get(story.date)!.stories.push(story);
        dateGroups.get(story.date)!.indices.push(i);
      }
    }
    
    // 无日期的故事不归入任何日期组，保持独立
    
    // 对于每个日期组，如果有多于一个故事（包括无日期的），标记同一天并设置位置
    for (const [date, group] of dateGroups.entries()) {
      if (group.stories.length >= 2) { // 改为检查总故事数，包括无日期的
        // 找到第一个和最后一个故事的索引
        const firstIndex = Math.min(...group.indices);
        const lastIndex = Math.max(...group.indices);
        
        // 计算每个故事在同一天组中的位置
        let position = 0;
        for (let i = firstIndex; i <= lastIndex; i++) {
          if (i > firstIndex) {
            sameDayStates[i] = true;
          }
          sameDayPositions[i] = position;
          position++;
        }
      }
    }
    
    return { sameDayStates, sameDayPositions };
  };

  const renderStories = () => {
    const elements: JSX.Element[] = [];
    // 当stories数据更新时，重置cardRefs数组长度，但保留现有的ref
    if (cardRefs.current.length !== stories.length) {
      const newCardRefs = new Array(stories.length).fill(null);
      // 保留现有的有效ref
      for (let i = 0; i < Math.min(cardRefs.current.length, stories.length); i++) {
        if (cardRefs.current[i]) {
          newCardRefs[i] = cardRefs.current[i];
        }
      }
      cardRefs.current = newCardRefs;
    }
    
    // 计算所有故事的同一天状态和位置
    const { sameDayStates, sameDayPositions } = calculateSameDayStates(stories);
    
    filteredStories.forEach((story: StoryWithDistance, filteredIndex: number) => {
      // 找到当前story在原始stories中的索引
      const originalIndex = stories.findIndex(s => 
        s.name === story.name && 
        s.date === story.date && 
        s.description === story.description &&
        s.start_time === story.start_time &&
        s.end_time === story.end_time &&
        s.address?.name === story.address?.name
      );
      
      // 如果找不到原始索引，跳过（理论上不应该发生）
      if (originalIndex === -1) return;
      
      const storyIndex = originalIndex; // 使用原始索引
      // 使用预计算的同一天状态和位置
      const isSameDay = sameDayStates[originalIndex];
      const sameDayPosition = sameDayPositions[originalIndex];
      
      // 插入横向点分隔
      const hasSeparator = filteredIndex > 0 && story.distanceFromPrevious > 0;
      if (hasSeparator) {
        elements.push(
          <DayDotSeparator key={`dot-separator-${filteredIndex}`} count={story.distanceFromPrevious} />
        );
      }
      
      const isDayStartWithoutSeparator = !isSameDay && filteredIndex > 0 && !hasSeparator;
      const isUnplanned = !story.date;
      const shouldUseDayStart = isDayStartWithoutSeparator || (isUnplanned && !isSameDay);
      // unplanned卡片被同一天story包围时也使用same-day效果
      const shouldUseSameDay = isSameDay;


      elements.push(
        <div 
          key={`story-${filteredIndex}`}
          ref={(el) => {
            cardRefs.current[filteredIndex] = el;
          }}
          className={`story-wrapper ${shouldUseSameDay ? 'same-day' : ''}${shouldUseDayStart ? ' day-start' : ''}${isReordering && reorderIndex === storyIndex ? ' reordering' : ''}`}
        >
          <StoryCard
            story={story}
            showDate={true}
            isSameDay={isSameDay}
            sameDayPosition={sameDayPosition}
            allStories={stories}
            onClick={handleStoryClick}
            onLongPress={isUnplanned ? () => handleStartReorder(storyIndex) : undefined}
            isReordering={isReordering && reorderIndex === storyIndex}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onEndReorder={handleEndReorder}
          />
        </div>
      );
    });
    
    return elements;
  };

  return (
    <div className='story-list-container' ref={containerRef}>
      {/* 重排序蒙版 */}
      {isReordering && reorderIndex !== null && (
        <>
          {/* 蒙版背景 - 处理点击退出，但允许重排序按钮区域通过 */}
          <div
            className="reorder-mask-background"
            onClick={handleEndReorder}
          />
          {/* 重排序按钮区域 - 阻止蒙版点击事件 */}
          <div className="reorder-button-area" />
        </>
      )}
      
      <div
        className='story-list'
        onScroll={handleScroll}
        ref={scrollViewRef}
      >
        {renderStories()}
        <div className="add-story-button-wrapper">
          <button className="add-story-button" onClick={handleAddNewStory} title={t('common.add') || '新增Story'}>
            <span className="add-story-icon">+</span>
          </button>
        </div>
      </div>
      
      <DateNavigation 
        stories={stories}
        currentDate={currentDate}
        onDateClick={handleDateClick}
        minimapSegments={minimapSegments}
        scrollHeight={scrollHeight}
        viewportHeight={viewportHeight}
        scrollTop={scrollTop}
        onViewportJump={(nextScrollTop) => {
          if (!scrollViewRef.current) return;
          // 直接滚动到目标位置，使用平滑滚动
          scrollViewRef.current.scrollTo({
            top: nextScrollTop,
            behavior: 'smooth'
          });
          // 更新状态
          setScrollTop(nextScrollTop);
        }}
      />

      <SearchComponent
        onSearch={handleSearch}
        onClose={handleSearchClose}
        onSearchStateChange={handleSearchStateChange}
        isSearching={isSearching}
      />

      <StoryEditModal
        story={editingStory}
        visible={isModalVisible}
        onCancel={handleModalCancel}
        onSave={handleModalSave}
        onNext={handleModalNext}
        onDelete={handleModalDelete}
        settings={settings}
        updateSettings={updateSettings}
      />
    </div>
  );
} 