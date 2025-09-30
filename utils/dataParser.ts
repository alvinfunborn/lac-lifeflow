// 使用浏览器可用的 TOML 解析库
import * as TOML from 'toml';
import * as TOMLStringify from 'tomlify-j0.4';
import { Story, StoryWithDistance } from '../types/story';

// 解析TOML数据 - 现在从子文件读取，不再从单个文件解析
export function parseStoriesData(tomlData: string): Story[] {
  // 这个函数现在主要用于兼容性，实际数据从 LifeFlowRepository 加载
  return [];
}

// 计算两个日期之间的间隔天数
function getDaysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, totalDays - 1); // 减1得到间隔天数
}

// 获取事项的日期
function getStoryDate(story: Story): string | null {
  if (story.start_time) {
    // 从 start_time 中提取日期
    const match = story.start_time.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  return null;
}

// 解析时间字符串为分钟（从 00:00 起算）。支持 HH:mm 或 HH:mm:ss
function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(timeStr.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] ? Number(match[3]) : 0;
  if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(seconds)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) return null;
  return hours * 60 + minutes + Math.floor(seconds / 60);
}

// 处理事项数据，添加时间距离信息
export function processStoriesWithDistance(stories: Story[]): StoryWithDistance[] {
  // 1. 为每个 story 添加原始索引、日期、时间信息
  const storiesWithInfo = stories.map((story, index) => {
    const storyDate = getStoryDate(story);
    const timeFromStart = parseTimeToMinutes(story.start_time);
    const timeFromEnd = parseTimeToMinutes(story.end_time);
    const timeMinutes = timeFromStart ?? timeFromEnd ?? null;
    return {
      ...story,
      originalIndex: index as number,
      hasDate: !!storyDate,
      hasTime: timeMinutes !== null,
      timeMinutes,
      date: storyDate
    } as Story & { originalIndex: number; hasDate: boolean; hasTime: boolean; timeMinutes: number | null; date?: string };
  });
  
  // 2. 分离有 date 和无 date 的 story
  const undatedStories = storiesWithInfo.filter(s => !s.hasDate);
  
  // 3. 按日期分组，并在每个“同日”内按规则排序
  const dateToStories = new Map<string, typeof storiesWithInfo>();
  const datedStoriesForGrouping = storiesWithInfo.filter(s => s.hasDate);
  for (const s of datedStoriesForGrouping) {
    const d = s.date!;
    if (!dateToStories.has(d)) dateToStories.set(d, []);
    dateToStories.get(d)!.push(s);
  }

  // 构建“每个日期内”的有序列表
  const perDayOrdered = new Map<string, StoryWithDistance[]>();
  for (const [date, items] of dateToStories.entries()) {
    const timed = items.filter(i => i.hasTime);
    const noTime = items.filter(i => !i.hasTime);

    // 有时间：按时间升序；若时间相同，按文档原序
    timed.sort((a, b) => {
      const ta = a.timeMinutes as number;
      const tb = b.timeMinutes as number;
      if (ta !== tb) return ta - tb;
      return a.originalIndex - b.originalIndex;
    });

    // 初始为所有"有时间"的顺序
    const dayList: (Story & { originalIndex: number; hasDate: boolean; hasTime: boolean; timeMinutes: number | null; date?: string })[] = [...timed];

    // 无时间：保持文档顺序；插入到“文档序在其之后的，当天最早时间”的故事之前；若不存在，则追加到该日末尾
    noTime.sort((a, b) => a.originalIndex - b.originalIndex);
    for (const nt of noTime) {
      // 候选：文档序在其之后的“有时间”项
      const laterTimed = timed.filter(t => t.originalIndex > nt.originalIndex);
      if (laterTimed.length > 0) {
        // 找到时间最早的那个
        let earliest = laterTimed[0];
        for (let i = 1; i < laterTimed.length; i++) {
          const cand = laterTimed[i];
          if ((cand.timeMinutes as number) < (earliest.timeMinutes as number)) {
            earliest = cand;
          }
        }
        // 插入到该候选之前
        const insertAt = dayList.findIndex(x => x === earliest);
        const insertIndex = insertAt >= 0 ? insertAt : dayList.length;
        dayList.splice(insertIndex, 0, nt);
      } else {
        dayList.push(nt);
      }
    }

    // 转换为 StoryWithDistance（先不计算 distance）
    perDayOrdered.set(
      date,
      dayList.map((story) => ({
        name: story.name,
        date: story.date,
        address: story.address,
        start_time: story.start_time,
        end_time: story.end_time,
        description: story.description,
        distanceFromPrevious: 0,
        hasDate: true
      }))
    );
  }

  // 4. 无 date 的 story 按原始顺序排序
  const sortedUndatedStories = undatedStories.sort((a, b) => a.originalIndex - b.originalIndex);
  
  // 6. 构建最终结果 - 简化排序逻辑，直接按原始顺序处理
  const result: StoryWithDistance[] = [];
  
  // 直接按原始顺序处理所有story
  const allStories = [...storiesWithInfo].sort((a, b) => a.originalIndex - b.originalIndex);
  
  for (const story of allStories) {
    result.push({
      name: story.name,
      date: story.date,
      address: story.address,
      start_time: story.start_time,
      end_time: story.end_time,
      description: story.description,
      distanceFromPrevious: 0,
      hasDate: story.hasDate
    });
  }
  
  // 重写排序逻辑：按日期分组 -> 组内排序 -> 按日期顺序输出
  const finalResult: StoryWithDistance[] = [];

  // 1. 按日期分组
  const dateGroups = new Map<string, typeof allStories>();
  
  // 处理有日期的story
  for (const story of allStories) {
    if (story.hasDate && story.date) {
      if (!dateGroups.has(story.date)) {
        dateGroups.set(story.date, []);
      }
      dateGroups.get(story.date)!.push(story);
    }
  }
  
  // 处理无日期的story，找到其所属的日期组
  for (let i = 0; i < allStories.length; i++) {
    const currentStory = allStories[i];
    
    if (!currentStory.hasDate) {
      // 找到其后最近的有日期story
      let nextDatedStory: typeof allStories[0] | null = null;
      for (let j = i + 1; j < allStories.length; j++) {
        if (allStories[j].hasDate) {
          nextDatedStory = allStories[j];
          break;
        }
      }
      
      if (nextDatedStory && nextDatedStory.date) {
        // 将无日期story添加到对应的日期组
        if (!dateGroups.has(nextDatedStory.date)) {
          dateGroups.set(nextDatedStory.date, []);
        }
        dateGroups.get(nextDatedStory.date)!.push(currentStory);
      } else {
        // 如果没有后续有日期的story，创建一个特殊的"无日期"组
        if (!dateGroups.has('')) {
          dateGroups.set('', []);
        }
        dateGroups.get('')!.push(currentStory);
      }
    }
  }

  // 2. 对每个日期组内的story进行排序
  for (const [date, stories] of dateGroups.entries()) {
    if (date === '') {
      // 无日期组保持原始顺序
      continue;
    }
    
    // 按时间排序，无时间的保持原始顺序
    stories.sort((a, b) => {
      const aTime = parseTimeToMinutes(a.start_time) ?? parseTimeToMinutes(a.end_time);
      const bTime = parseTimeToMinutes(b.start_time) ?? parseTimeToMinutes(b.end_time);
      
      if (aTime !== null && bTime !== null) {
        // 都有时间，按时间升序
        return aTime - bTime;
      } else if (aTime !== null && bTime === null) {
        // a有时间，b无时间，a在前
        return -1;
      } else if (aTime === null && bTime !== null) {
        // a无时间，b有时间，b在前
        return 1;
      } else {
        // 都无时间，按原始顺序
        const aIndex = allStories.findIndex(s => s.name === a.name);
        const bIndex = allStories.findIndex(s => s.name === b.name);
        return aIndex - bIndex;
      }
    });
  }

  // 3. 按日期顺序输出所有组
  const sortedDates = Array.from(dateGroups.keys()).filter(date => date !== '').sort();
  
  // 先输出有日期的组
  for (const date of sortedDates) {
    const stories = dateGroups.get(date)!;
    for (const story of stories) {
      finalResult.push({
        id: story.id,
        name: story.name,
        date: story.date,
        address: story.address,
        start_time: story.start_time,
        end_time: story.end_time,
        description: story.description,
        distanceFromPrevious: 0,
        hasDate: story.hasDate
      });
    }
  }
  
  // 最后输出无日期组
  if (dateGroups.has('')) {
    const undatedStories = dateGroups.get('')!;
    for (const story of undatedStories) {
      finalResult.push({
        id: story.id,
        name: story.name,
        date: undefined,
        address: story.address,
        start_time: story.start_time,
        end_time: story.end_time,
        description: story.description,
        distanceFromPrevious: 0,
        hasDate: false
      });
    }
  }
  
  // 7. 计算 distanceFromPrevious（仅按相邻有日期项计算）
  let lastDate: string | null = null;
  for (let i = 0; i < finalResult.length; i++) {
    const currentDate = finalResult[i].date;
    if (currentDate && lastDate) {
      finalResult[i].distanceFromPrevious = getDaysBetween(lastDate, currentDate);
    }
    if (currentDate) {
      lastDate = currentDate;
    }
  }
  
  return finalResult;
}

// 根据时间距离计算视觉间距
export function getVisualSpacing(distance: number): number {
  if (distance === 0) return 8; // 同一天
  if (distance <= 1) return 16; // 隔一天
  if (distance <= 7) return 24; // 隔一周
  if (distance <= 30) return 32; // 隔一月
  if (distance <= 365) return 40; // 隔一年
  return 48; // 超过一年
} 

// 将字符串做 TOML 安全转义（使用双引号字符串）

// 将 Story 列表序列化为 [[detail.stories]] 数组表文本
export function serializeStoriesToTomlTables(stories: Story[]): string {
  const storyTables = stories.map(story => ({
    name: story.name || '',
    start_time: story.start_time || '',
    end_time: story.end_time || '',
    description: story.description || '',
    // 地址信息放在嵌套对象中
    ...(story.address && {
      address: {
        name: story.address.name || '',
        address: story.address.address || '',
        longitude: story.address.longitude,
        latitude: story.address.latitude
      }
    })
  }));
  
  const tomlObj = {
    detail: {
      stories: storyTables
    }
  };
  
  return TOMLStringify.toToml(tomlObj);
}


// 从 StoryWithDistance 去掉附加字段，得到纯 Story 列表
export function toPlainStories(stories: StoryWithDistance[]): Story[] {
  return stories.map(s => ({
    id: s.id, // ID仍需要保留用于文件操作，但不保存到TOML
    name: s.name,
    address: s.address,
    start_time: s.start_time,
    end_time: s.end_time,
    description: s.description
  }));
}

// 用新的 stories 替换原文中的 [[detail.stories]] 段，保留其他内容与顶部注释
export function replaceStoriesTables(rawToml: string, stories: Story[]): string {
  const text = rawToml || '';
  const newTables = serializeStoriesToTomlTables(stories).trimEnd();

  // 解析TOML结构，找到detail段
  let parsed: any;
  try {
    // 将CRLF转换为LF，解决Windows系统换行符问题
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    parsed = TOML.parse(normalizedText);
  } catch (e) {
    // 如果解析失败，使用正则表达式方法
    return replaceStoriesTablesRegex(text, stories);
  }

  // 更新stories
  if (!parsed.detail) {
    parsed.detail = {};
  }
  parsed.detail.stories = stories;

  // 重新序列化整个TOML，保留非detail字段
  const nonDetailFields = Object.keys(parsed).filter(key => key !== 'detail');
  let result = '';

  // 保留非detail字段
  for (const field of nonDetailFields) {
    const value = parsed[field];
    if (typeof value === 'object' && value !== null) {
      result += `[${field}]\n`;
      for (const [key, val] of Object.entries(value)) {
        if (typeof val === 'string') {
          const escaped = val.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          result += `${key} = "${escaped}"\n`;
        } else {
          result += `${key} = ${val}\n`;
        }
      }
      result += '\n';
    } else {
      result += `${field} = ${value}\n\n`;
    }
  }

  // 添加detail段
  if (parsed.detail) {
    result += '[detail]\n';
    if (parsed.detail.stories && parsed.detail.stories.length > 0) {
      result += serializeStoriesToTomlTables(parsed.detail.stories);
    }
  }

  return result.trimEnd() + '\n';
}

// 正则表达式备用方法
function replaceStoriesTablesRegex(text: string, stories: Story[]): string {
  const newTables = serializeStoriesToTomlTables(stories).trimEnd();

  // 找到所有 [[detail.stories]] 段落的位置
  const blockRegex = /(^|\n)\s*\[\[\s*detail\.stories\s*\]\][\s\S]*?(?=(\n\s*\[\[)|$)/g;
  let firstIndex: number | null = null;
  let lastEnd: number | null = null;
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(text)) !== null) {
    if (firstIndex === null) firstIndex = match.index + (match[1] ? match[1].length : 0);
    lastEnd = match.index + match[0].length;
  }

  if (firstIndex !== null && lastEnd !== null) {
    const before = text.slice(0, firstIndex).replace(/\s*$/, '\n');
    const after = text.slice(lastEnd).replace(/^\n+/, '\n');
    const middle = newTables.length > 0 ? `${newTables}\n` : '';
    return `${before}${middle}${after}`;
  }

  // 若原文没有 stories 段，直接在末尾追加（保留原文）
  const sep = text.endsWith('\n') ? '' : '\n';
  const appended = newTables.length > 0 ? `${sep}${newTables}\n` : '';
  return `${text}${appended}`;
}