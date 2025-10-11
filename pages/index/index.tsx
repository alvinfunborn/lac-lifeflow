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
  updateSettings?: (newSettings: Partial<LifeFlowSettings>) => Promise<void>;
}

export default function Index({ repository, settings, updateSettings }: IndexProps) {
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
        // 检查是否有新增或修改的故事
        const changedStories: StoryWithDistance[] = [];
        
        // 检查长度变化（新增或删除）
        if (updatedStories.length !== stories.length) {
          console.log('🔍 [handleStoriesChange] Length changed:', stories.length, '->', updatedStories.length);
          // 找出所有新增的故事
          updatedStories.forEach((story, index) => {
            if (!stories[index] || story !== stories[index]) {
              changedStories.push(story);
            }
          });
        } else {
          // 长度相同，找出修改的故事
          updatedStories.forEach((story, index) => {
            if (story !== stories[index]) {
              changedStories.push(story);
            }
          });
        }
        
        console.log('🔍 [handleStoriesChange] Changed stories count:', changedStories.length);
        
        // 保存所有变化的故事，并收集保存后的 ID
        const savedStoryIds = new Map<StoryWithDistance, string>();
        
        for (const changedStory of changedStories) {
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
          
          // 保存后，plainStory.id 会被更新为实际的文件名
          console.log('🔍 [handleStoriesChange] Story saved with ID:', plainStory.id);
          savedStoryIds.set(changedStory, plainStory.id!);
        }
        
        // 更新根文件，确保引用顺序与故事列表一致
        // 使用保存后的 ID
        const plainStories = updatedStories.map(story => {
          const savedId = savedStoryIds.get(story);
          return {
            id: savedId || story.id,
            name: story.name,
            start_time: story.start_time,
            end_time: story.end_time,
            description: story.description,
            address: story.address
          };
        });
        await repository.updateRootFile(plainStories);
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
        updateSettings={updateSettings}
      />
    </div>
  );
}
