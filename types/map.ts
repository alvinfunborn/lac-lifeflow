// 地图相关类型定义
export interface MapLocation {
  longitude?: number;
  latitude?: number;
  name?: string;
  address?: string;
  coordinate_system?: string; // WGS84/GPS, GCJ-02, BD-09/BAIDU, MAPBAR/TUBA, etc.
}

export interface MapSearchResult {
  name: string;
  address: string;
  location: MapLocation;
  distance?: number;
}

export interface MapSelectorProps {
  visible: boolean;
  initialLocation?: MapLocation;
  onCancel: () => void;
  onConfirm: (location: MapLocation) => void;
  title?: string;
  placeholder?: string;
  settings: any; // LifeFlowSettings - 使用any避免循环导入
}

export interface MapConfig {
  key: string;
  secret?: string;
  center?: [number, number];
  zoom?: number;
  mapStyle?: string;
}

// 高德地图API相关类型
export interface AMapLocation {
  lng: number;
  lat: number;
}

export interface AMapSearchResult {
  name: string;
  address: string;
  location: AMapLocation;
  distance?: number;
}
