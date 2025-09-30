// 时间验证工具函数
import { t } from '../i18n';

// 验证时间格式
export function validateTimeFormat(timeStr: string): boolean {
  if (!timeStr || timeStr.trim() === '') return true; // 空值视为有效
  
  // 支持的时间格式：
  // 1. yyyy-MM-dd HH:mm:ss
  // 2. yyyy-MM-dd HH:mm
  // 3. yyyy-MM-dd
  // 4. HH:mm:ss
  // 5. HH:mm
  
  const patterns = [
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, // yyyy-MM-dd HH:mm:ss
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, // yyyy-MM-dd HH:mm
    /^\d{4}-\d{2}-\d{2}$/, // yyyy-MM-dd
    /^\d{2}:\d{2}:\d{2}$/, // HH:mm:ss
    /^\d{2}:\d{2}$/ // HH:mm
  ];
  
  return patterns.some(pattern => pattern.test(timeStr.trim()));
}

// 检查 start_time 和 end_time 的合理性
export function validateTimeRange(startTime: string, endTime: string): { valid: boolean; error?: string } {
  if (!startTime || !endTime) {
    return { valid: true }; // 空值视为有效
  }
  
  // 如果 start_time 没有日期，则视为未计划事项
  const startHasDate = /^\d{4}-\d{2}-\d{2}/.test(startTime);
  const endHasDate = /^\d{4}-\d{2}-\d{2}/.test(endTime);
  
  // 如果 start_time 没有日期，则 end_time 也不应该有日期
  if (!startHasDate && endHasDate) {
    return { valid: false, error: t('timeValidation.startTimeNoDate') };
  }
  
  // 如果 start_time 和 end_time 都有完整的日期时间，需要检查 end_time 是否大于 start_time
  if (startHasDate && endHasDate) {
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(endTime);
    
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return { valid: false, error: t('timeValidation.invalidFormat') };
    }
    
    if (endDateTime <= startDateTime) {
      return { valid: false, error: t('timeValidation.endTimeMustBeAfter') };
    }
  }
  
  return { valid: true };
}

// 从时间字符串中提取日期
export function extractDateFromTime(timeStr: string): string | null {
  if (!timeStr) return null;
  
  const match = timeStr.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

// 从时间字符串中提取时间部分
export function extractTimeFromDateTime(dateTimeStr: string): string | null {
  if (!dateTimeStr) return null;
  
  // 匹配 HH:mm:ss 或 HH:mm 格式
  const match = dateTimeStr.match(/\d{2}:\d{2}(?::\d{2})?$/);
  if (match) {
    const timeStr = match[0];
    // 保持原始格式，不强制转换
    return timeStr;
  }
  return null;
}

// 检查是否为未计划事项（start_time 没有日期）
export function isUnplannedStory(startTime: string): boolean {
  if (!startTime) return true;
  return !/^\d{4}-\d{2}-\d{2}/.test(startTime);
}

// 格式化时间显示
export function formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return '';
  
  // 如果是完整日期时间（带秒数），显示为 "日期 时间"
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(timeStr)) {
    const [date, time] = timeStr.split(' ');
    return `${date} ${time}`;
  }
  
  // 如果是完整日期时间（不带秒数），显示为 "日期 时间"
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(timeStr)) {
    const [date, time] = timeStr.split(' ');
    return `${date} ${time}`;
  }
  
  // 如果只有日期，显示日期
  if (/^\d{4}-\d{2}-\d{2}$/.test(timeStr)) {
    return timeStr;
  }
  
  // 如果只有时间（带秒数），显示时间
  if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
    return timeStr;
  }
  
  // 如果只有时间（不带秒数），显示时间
  if (/^\d{2}:\d{2}$/.test(timeStr)) {
    return timeStr;
  }
  
  return timeStr;
}
