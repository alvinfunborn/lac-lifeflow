export interface Address {
  name: string;
  address?: string;
  longitude?: number;
  latitude?: number;
  coordinate_system?: string; // WGS84/GPS, GCJ-02, BD-09/BAIDU, MAPBAR/TUBA, etc.
}

export interface Story {
  id?: string; // 唯一标识符，用于文件映射
  name?: string;
  address?: Address;
  start_time?: string;
  end_time?: string;
  description?: string;
}

export interface StoryWithDistance extends Story {
  distanceFromPrevious: number;
  hasDate: boolean;
  date?: string; // 从 start_time 中提取的日期
}


