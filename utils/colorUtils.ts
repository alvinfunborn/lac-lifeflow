// 颜色工具函数
// 包装工队配色方案
export const PACKERS_COLORS = {
  BLACK: '#000000',       // 黑色 - 最早日期
  DARK_GREEN: '#203731',  // 包装工绿 - 中位数日期
  GOLD: '#FFB612',        // 包装工黄 - 今日色
  WHITE: '#FFFFFF',       // 白色 - 最晚日期
  TEXT_DARK: '#1a1a1a',   // 深色文字
  TEXT_LIGHT: '#666666',  // 浅色文字
  BORDER: '#e0e0e0',      // 边框色
  UNPLANNED: '#00274d'    // 无日期卡片颜色
};

// RGB颜色解析
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// RGB转十六进制
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// 线性插值
function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

// 颜色插值
function interpolateColor(color1: string, color2: string, factor: number): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  const r = Math.round(lerp(rgb1.r, rgb2.r, factor));
  const g = Math.round(lerp(rgb1.g, rgb2.g, factor));
  const b = Math.round(lerp(rgb1.b, rgb2.b, factor));
  
  return rgbToHex(r, g, b);
}

// 计算日期到颜色的映射
export function getDateColor(
  dateStr: string | undefined, 
  earliestDate: string | null, 
  latestDate: string | null,
  todayDate: string
): string {
  // 无日期返回无日期颜色
  if (!dateStr) {
    return PACKERS_COLORS.UNPLANNED;
  }
  
  // 如果没有日期范围，返回默认颜色
  if (!earliestDate || !latestDate) {
    return PACKERS_COLORS.DARK_GREEN;
  }
  
  const date = new Date(dateStr);
  const earliest = new Date(earliestDate);
  const latest = new Date(latestDate);
  const today = new Date(todayDate);
  
  // 今日特殊处理
  if (dateStr === todayDate) {
    return PACKERS_COLORS.GOLD;
  }
  
  // 计算在日期范围内的位置 (0-1)
  const totalDays = (latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24);
  const daysFromEarliest = (date.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24);
  const daysFromToday = (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  
  // 计算中位数日期（最早日期到今天的中点）
  const midDate = new Date((earliest.getTime() + today.getTime()) / 2);
  const daysFromMid = (date.getTime() - midDate.getTime()) / (1000 * 60 * 60 * 24);
  
  // 三段渐变
  if (date < midDate) {
    // 第一段：最早日期到中位数日期 - 从黑色到包装工绿
    const firstSegmentFactor = Math.max(0, Math.min(1, daysFromEarliest / Math.max(1, (midDate.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24))));
    return interpolateColor(PACKERS_COLORS.BLACK, PACKERS_COLORS.DARK_GREEN, firstSegmentFactor);
  } else if (date < today) {
    // 第二段：中位数日期到今日 - 从包装工绿到包装工黄
    const secondSegmentFactor = Math.max(0, Math.min(1, daysFromMid / Math.max(1, (today.getTime() - midDate.getTime()) / (1000 * 60 * 60 * 24))));
    return interpolateColor(PACKERS_COLORS.DARK_GREEN, PACKERS_COLORS.GOLD, secondSegmentFactor);
  } else {
    // 第三段：今日到最晚日期 - 从包装工黄到白色
    const thirdSegmentFactor = Math.max(0, Math.min(1, daysFromToday / Math.max(1, (latest.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))));
    return interpolateColor(PACKERS_COLORS.GOLD, PACKERS_COLORS.WHITE, thirdSegmentFactor);
  }
}

// 计算文字颜色（确保对比度）
export function getTextColor(backgroundColor: string, dateStr?: string, todayDate?: string): string {
  // 如果提供了日期信息，根据日期决定文字颜色
  if (dateStr && todayDate) {
    const date = new Date(dateStr);
    const today = new Date(todayDate);
    if (date >= today) {
      return PACKERS_COLORS.TEXT_DARK; // 今日到最后：黑色文字
    } else {
      return PACKERS_COLORS.WHITE; // 今日之前：白色文字
    }
  }
  
  // 无日期的情况：白色文字
  if (!dateStr) {
    return PACKERS_COLORS.WHITE;
  }
  
  // 兜底：根据背景亮度选择文字颜色
  const rgb = hexToRgb(backgroundColor);
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128 ? PACKERS_COLORS.TEXT_DARK : PACKERS_COLORS.WHITE;
}

// 获取所有stories的日期范围
export function getDateRange(stories: any[]): { earliest: string | null; latest: string | null } {
  const dates = stories
    .map(story => story.date)
    .filter(date => date) // 过滤掉无日期的
    .map(date => new Date(date))
    .sort((a, b) => a.getTime() - b.getTime());
  
  if (dates.length === 0) {
    return { earliest: null, latest: null };
  }
  
  const earliest = dates[0];
  const latest = dates[dates.length - 1];
  
  return {
    earliest: earliest.toISOString().split('T')[0],
    latest: latest.toISOString().split('T')[0]
  };
}

// 获取今日日期字符串
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

