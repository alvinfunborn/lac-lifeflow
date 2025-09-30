import React, { useState, useEffect } from 'react';
import { processStoriesWithDistance } from '../../utils/dataParser';
import { StoryWithDistance, Story } from '../../types/story';
import { LifeFlowSettings } from '../../types';
import { LifeFlowRepository } from '../../repositories/LifeFlowRepository';
import StoryList from '../../components/StoryList';
// 样式请统一写入插件根目录的 styles.css


interface IndexProps {
  repository?: LifeFlowRepository | null;
  settings: LifeFlowSettings;
}

export default function Index({ repository, settings }: IndexProps) {
  const [stories, setStories] = useState([] as StoryWithDistance[]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repository]);

  const loadStories = async () => {
    try {
      if (!repository) {
        setStories([]);
        setLoading(false);
        return;
      }
      
      const rawStories = await repository.loadAll();
      const processedStories = processStoriesWithDistance(rawStories);
      setStories(processedStories);
    } catch (error) {
      console.error('Failed to load stories:', error);
      setStories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStoriesChange = async (updatedStories: StoryWithDistance[], options?: { needsResort?: boolean }) => {
    
    setStories(updatedStories);
    
    if (!repository) {
      return;
    }
    
    try {
      // 如果需要重新排序，重新加载数据
      if (options?.needsResort) {
        await loadStories();
      } else {
        // 保存单个修改的故事到文件
        const changedStory = updatedStories.find((story, index) => 
          story !== stories[index]
        );
        
        if (changedStory) {
          console.log('🔍 [handleStoriesChange] Saving story:', {
            id: changedStory.id,
            name: changedStory.name,
            originalId: changedStory.id,
            address: changedStory.address
          });
          
          // 移除 distanceFromPrevious 等额外字段，只保存纯 Story 数据
          const plainStory = {
            id: changedStory.id,
            name: changedStory.name,
            start_time: changedStory.start_time,
            end_time: changedStory.end_time,
            description: changedStory.description,
            address: changedStory.address
          };
          
          console.log('🔍 [handleStoriesChange] Plain story to save:', plainStory);
          await repository.saveStory(plainStory);
        }
      }
    } catch (e) {
      console.error('❌ [handleStoriesChange] 处理失败:', e);
    }
  };

  if (loading) {
    return (
      <div className='index loading'>
        <span>加载中...</span>
      </div>
    );
  }

  return (
    <div className='index'>
      <StoryList 
        stories={stories} 
        onStoriesChange={handleStoriesChange}
        settings={settings}
      />
    </div>
  );
}
